import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, DEPLOYMENT_BLOCK } from "../config.js";
import { short, eth, parseEth } from "../utils/format.js";

// Nhieu RPC (ke ca RPC mac dinh cua MetaMask cho Sepolia) gioi han so block toi da
// moi lan eth_getLogs (da gap ca 50000 lan 10000 tuy node) - va khoang cach tu luc
// deploy den "latest" chi tang dan theo thoi gian, som muon cung vuot gioi han du
// da tru DEPLOYMENT_BLOCK. Vi vay phai quet theo tung doan nho, khong quet 1 lan.
const LOG_CHUNK_SIZE = 9000;

async function queryFilterChunked(contract, filter, fromBlock) {
  const latest = await contract.runner.provider.getBlockNumber();
  if (fromBlock > latest) return [];
  const results = [];
  for (let start = fromBlock; start <= latest; start += LOG_CHUNK_SIZE) {
    const end = Math.min(start + LOG_CHUNK_SIZE - 1, latest);
    const chunk = await contract.queryFilter(filter, start, end);
    results.push(...chunk);
  }
  return results;
}

/**
 * Cai dat RentalService that: goi ethers.js + MetaMask + smart contract da deploy.
 * Day la lop "BE" khi da co contract that; xem RentalService.js de biet interface chung.
 */
export class ChainRentalService {
  isMock = false;
  #account = null;

  async #getContract(needSigner = false) {
    if (!window.ethereum) throw new Error("Chưa cài MetaMask");
    const provider = new ethers.BrowserProvider(window.ethereum);
    if (needSigner) {
      const signer = await provider.getSigner();
      return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
    }
    return new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);
  }

  async connect() {
    if (!window.ethereum) throw new Error("Vui lòng cài đặt MetaMask");
    const accts = await window.ethereum.request({ method: "eth_requestAccounts" });
    this.#account = accts[0] || null;
    return this.#account;
  }

  /**
   * Khoi phuc session khi tai lai trang (F5) MA KHONG hien popup MetaMask - chi hoi
   * "cac tai khoan da duoc cap quyen truoc do" (eth_accounts), khac voi connect() dung
   * eth_requestAccounts se luon hien popup xin quyen.
   */
  async tryReconnect() {
    if (!window.ethereum) return null;
    const accts = await window.ethereum.request({ method: "eth_accounts" });
    this.#account = accts[0] || null;
    return this.#account;
  }

  /** Mo lai popup chon tai khoan cua MetaMask de doi ví, ke ca khi da ket noi roi. */
  async requestAccountSwitch() {
    if (!window.ethereum) throw new Error("Chưa cài MetaMask");
    await window.ethereum.request({
      method: "wallet_requestPermissions",
      params: [{ eth_accounts: {} }],
    });
    const accts = await window.ethereum.request({ method: "eth_accounts" });
    this.#account = accts[0] || null;
    return this.#account;
  }

  /**
   * Ngat ket noi O MUC UNG DUNG - MetaMask khong cho website tu thu hoi quyen truy
   * cap that su, day chi la "dang xuat khoi session" cua trang, nguoi dung van co the
   * ket noi lai ngay ma khong can vao lai cai dat MetaMask.
   */
  disconnect() {
    this.#account = null;
  }

  getAccount() {
    return this.#account;
  }

  onAccountsChanged(cb) {
    if (!window.ethereum?.on) return () => {};
    const handler = (accts) => {
      this.#account = accts[0] || null;
      cb(this.#account);
    };
    window.ethereum.on("accountsChanged", handler);
    return () => window.ethereum.removeListener?.("accountsChanged", handler);
  }

  async isArbiter(address) {
    if (!address || !CONTRACT_ABI.length) return false;
    const c = await this.#getContract(false);
    const role = await c.ARBITER_ROLE();
    return c.hasRole(role, address);
  }

  async loadProperties() {
    if (!CONTRACT_ABI.length) return [];
    const c = await this.#getContract(false);
    const all = await c.getAllProperties();
    return all.map((p, i) => ({
      id: i + 1,
      landlord: p.landlord,
      title: p.title,
      location: p.location,
      monthlyRent: p.monthlyRent,
      deposit: p.deposit,
      status: Number(p.status),
      tenant: p.tenant,
      depositHeld: p.depositHeld,
      rentPaidCount: Number(p.rentPaidCount),
      imageCID: p.imageCID,
      note: p.note,
      nextDueDate: p.nextDueDate,
      proposedDeduction: p.proposedDeduction,
      settlementProposed: p.settlementProposed,
    }));
  }

  async loadHistory() {
    if (!CONTRACT_ABI.length) return [];
    const c = await this.#getContract(false);
    const events = [];
    // fromBlock = block deploy contract (khong quet tu block 0), va quet theo tung
    // doan LOG_CHUNK_SIZE block - xem ly do o dinh nghia queryFilterChunked.
    const [listed, rented, paid, handed, proposed, disputed, votes, ended] = await Promise.all([
      queryFilterChunked(c, c.filters.PropertyListed(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.Rented(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.RentPaid(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.HandoverConfirmed(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.SettlementProposed(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.DisputeRaised(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.DisputeVoteCast(), DEPLOYMENT_BLOCK),
      queryFilterChunked(c, c.filters.LeaseEnded(), DEPLOYMENT_BLOCK),
    ]);

    // Xay map id -> landlord/tenant tu chinh cac event da co, khong can goi lai
    // getProperty() (landlord/tenant khong doi sau khi gan, kha nang tin cay du dung).
    const landlordById = new Map();
    listed.forEach((e) => landlordById.set(Number(e.args[0]), e.args[1]));
    const tenantById = new Map();
    rented.forEach((e) => tenantById.set(Number(e.args[0]), e.args[1]));

    // PropertyListed/SettlementProposed/DisputeVoteCast khong mang timestamp trong
    // event args -> lay tu block.
    const listedBlocks = await Promise.all(listed.map((e) => e.getBlock()));
    const proposedBlocks = await Promise.all(proposed.map((e) => e.getBlock()));
    const voteBlocks = await Promise.all(votes.map((e) => e.getBlock()));

    listed.forEach((e, i) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: listedBlocks[i].timestamp,
        type: "Đăng tài sản", id, from: e.args[1], to: null, amount: null,
        detail: `${e.args[2]} · ${eth(e.args[3])}/kỳ · cọc ${eth(e.args[4])}`,
        extra: { title: e.args[2], monthlyRent: e.args[3], deposit: e.args[4] },
      });
    });
    rented.forEach((e) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: Number(e.args[3]),
        type: "Đặt cọc", id, from: e.args[1], to: landlordById.get(id) ?? null, amount: e.args[2],
        detail: `${short(e.args[1])} cọc ${eth(e.args[2])}`, extra: {},
      });
    });
    paid.forEach((e) => {
      const id = Number(e.args[0]);
      const [, tenantAddr, amount, latePenalty, paidAt] = e.args;
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: Number(paidAt),
        type: "Trả tiền thuê", id, from: tenantAddr, to: landlordById.get(id) ?? null, amount,
        detail: `${short(tenantAddr)} trả ${eth(amount)}${latePenalty > 0n ? ` (kèm phạt trễ ${eth(latePenalty)})` : ""}`,
        extra: { latePenalty },
      });
    });
    handed.forEach((e) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: Number(e.args[2]),
        type: "Xác nhận bàn giao", id, from: e.args[1], to: landlordById.get(id) ?? null, amount: null,
        detail: `${short(e.args[1])}`, extra: {},
      });
    });
    proposed.forEach((e, i) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: proposedBlocks[i].timestamp,
        type: "Đề xuất tất toán", id, from: landlordById.get(id) ?? null, to: null, amount: e.args[1],
        detail: `Đề xuất khấu trừ ${eth(e.args[1])}`, extra: { proposedDeduction: e.args[1] },
      });
    });
    disputed.forEach((e) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: null,
        type: "Khiếu nại", id, from: e.args[1], to: null, amount: null,
        detail: `${short(e.args[1])} không đồng ý mức đề xuất`, extra: {},
      });
    });
    votes.forEach((e, i) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: voteBlocks[i].timestamp,
        type: "Trọng tài bỏ phiếu", id, from: e.args[1], to: null, amount: e.args[2],
        detail: `${short(e.args[1])} đề xuất khấu trừ ${eth(e.args[2])} (phiếu ${e.args[3]})`,
        extra: { voteCount: e.args[3] },
      });
    });
    ended.forEach((e) => {
      const id = Number(e.args[0]);
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: Number(e.args[3]),
        type: "Kết thúc", id, from: landlordById.get(id) ?? null, to: tenantById.get(id) ?? null, amount: e.args[1],
        detail: `hoàn ${eth(e.args[1])} · khấu trừ ${eth(e.args[2])}`,
        extra: { refundToTenant: e.args[1], deductToLandlord: e.args[2] },
      });
    });

    events.sort((a, b) => b.block - a.block);
    return events;
  }

  async listProperty({ title, location, rent, deposit, imageCID, note }, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.listProperty(title, location, parseEth(rent), parseEth(deposit), imageCID || "", note || "");
    onPending?.();
    await t.wait();
  }

  async rentProperty(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.rentProperty(property.id, { value: property.deposit });
    onPending?.();
    await t.wait();
  }

  /** Tinh tong tien phai tra cho ky nay (kem phat tre neu qua han) - dung de hien thi + gui giao dich. */
  async quotePayRent(property) {
    const c = await this.#getContract(false);
    const lateFeeBps = await c.lateFeeBps();
    const isLate = Math.floor(Date.now() / 1000) > Number(property.nextDueDate);
    const penalty = isLate ? (property.monthlyRent * lateFeeBps) / 10000n : 0n;
    return { total: property.monthlyRent + penalty, penalty, isLate };
  }

  async payRent(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const { total } = await this.quotePayRent(property);
    const t = await c.payRent(property.id, { value: total });
    onPending?.();
    await t.wait();
  }

  async confirmHandover(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.confirmHandover(property.id);
    onPending?.();
    await t.wait();
  }

  async proposeSettlement(property, deductEth, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.proposeSettlement(property.id, parseEth(deductEth));
    onPending?.();
    await t.wait();
  }

  async acceptSettlement(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.acceptSettlement(property.id);
    onPending?.();
    await t.wait();
  }

  async disputeSettlement(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.disputeSettlement(property.id);
    onPending?.();
    await t.wait();
  }

  async voteOnDispute(property, deductEth, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.voteOnDispute(property.id, parseEth(deductEth));
    onPending?.();
    await t.wait();
  }
}
