import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI, DEPLOYMENT_BLOCK } from "../config.js";
import { short, eth, parseEth } from "../utils/format.js";

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
    // fromBlock = block deploy contract, khong quet tu block 0 - nhieu RPC cong
    // khai (kem ca RPC mac dinh cua MetaMask) gioi han so block moi lan eth_getLogs
    // (vd toi da 50000 block), quet tu genesis se bao loi "exceed maximum block range".
    const listed = await c.queryFilter(c.filters.PropertyListed(), DEPLOYMENT_BLOCK);
    const rented = await c.queryFilter(c.filters.Rented(), DEPLOYMENT_BLOCK);
    const paid = await c.queryFilter(c.filters.RentPaid(), DEPLOYMENT_BLOCK);
    const handed = await c.queryFilter(c.filters.HandoverConfirmed(), DEPLOYMENT_BLOCK);
    const proposed = await c.queryFilter(c.filters.SettlementProposed(), DEPLOYMENT_BLOCK);
    const disputed = await c.queryFilter(c.filters.DisputeRaised(), DEPLOYMENT_BLOCK);
    const votes = await c.queryFilter(c.filters.DisputeVoteCast(), DEPLOYMENT_BLOCK);
    const ended = await c.queryFilter(c.filters.LeaseEnded(), DEPLOYMENT_BLOCK);

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
