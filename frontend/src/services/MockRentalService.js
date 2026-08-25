import { ethers } from "ethers";
import { MOCK_ACCOUNTS, createInitialProperties, createInitialHistory } from "../mock/fixtures.js";
import { eth as fmtEth, parseEth } from "../utils/format.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Cau hinh mo phong RentalManager (khop mac dinh se dung khi deploy that):
const RENT_PERIOD_SECONDS = 120; // ngan hon nhieu so voi that (30 ngay) de demo phat tre nhanh
const LATE_FEE_BPS = 500n; // 5%
const ARBITER_APPROVALS_REQUIRED = 2;

function fakeTxHash() {
  const bytes = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256));
  return "0x" + bytes.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Cai dat RentalService bang du lieu mau, in-memory, khong can vi/chain.
 * Moi phuong thuc mo phong LAI DUNG cac require() cua RentalManager.sol
 * (cung thong bao loi) de UI test duoc toast thanh cong/loi giong het chain that.
 * Dung khi chua deploy contract, de thiet ke/kiem tra UI doc lap.
 */
export class MockRentalService {
  isMock = true;
  #account = null;
  #properties = createInitialProperties();
  #history = createInitialHistory();
  #listeners = new Set();
  // dia chi chu nha (landlord mau) la trong tai #1 mac dinh, giong constructor that;
  // "other" duoc cap them lam trong tai #2 de test co che multisig ngay trong mock.
  #arbiters = new Set([
    MOCK_ACCOUNTS.landlord.address.toLowerCase(),
    MOCK_ACCOUNTS.other.address.toLowerCase(),
  ]);
  // propertyId => { [deductAmountString]: Set<arbiterAddress> }
  #disputeVotes = new Map();

  async connect() {
    await delay(200);
    this.#account = MOCK_ACCOUNTS.landlord.address;
    return this.#account;
  }

  getAccount() {
    return this.#account;
  }

  /** Chi de dong bo interface voi ChainRentalService - o mock mode nut "Ket noi lai" se tu connect() lai ngay. */
  disconnect() {
    this.#account = null;
  }

  onAccountsChanged(cb) {
    this.#listeners.add(cb);
    return () => this.#listeners.delete(cb);
  }

  /** Chi co o mock mode — cho phep doi vai khong can MetaMask. */
  listMockAccounts() {
    return Object.values(MOCK_ACCOUNTS);
  }

  /** Chi co o mock mode. */
  switchAccount(address) {
    this.#account = address;
    this.#listeners.forEach((cb) => cb(address));
  }

  async isArbiter(address) {
    return !!address && this.#arbiters.has(address.toLowerCase());
  }

  async loadProperties() {
    await delay(150);
    return this.#properties.map((p) => ({ ...p }));
  }

  async loadHistory() {
    await delay(150);
    return [...this.#history].sort((a, b) => b.block - a.block);
  }

  #nextBlock() {
    return this.#history.length + 1;
  }

  #pushHistory(entry) {
    this.#history.push({
      block: this.#nextBlock(),
      txHash: fakeTxHash(),
      timestamp: Math.floor(Date.now() / 1000),
      to: null,
      amount: null,
      extra: {},
      ...entry,
    });
  }

  #requireAccount() {
    if (!this.#account) throw new Error("Vui lòng kết nối ví (mẫu) trước");
    return this.#account;
  }

  async listProperty({ title, location, rent, deposit, imageCID, note }, { onPending } = {}) {
    const sender = this.#requireAccount();
    const monthlyRent = parseEth(rent);
    const depositWei = parseEth(deposit);
    if (monthlyRent <= 0n) throw new Error("Tiền thuê phải > 0");
    onPending?.();
    await delay(500);

    const id = this.#properties.length ? Math.max(...this.#properties.map((p) => p.id)) + 1 : 1;
    this.#properties.push({
      id,
      landlord: sender,
      title,
      location,
      monthlyRent,
      deposit: depositWei,
      status: 0,
      tenant: ethers.ZeroAddress,
      depositHeld: 0n,
      rentPaidCount: 0,
      imageCID: imageCID || "",
      note: note || "",
      nextDueDate: 0n,
      proposedDeduction: 0n,
      settlementProposed: false,
    });
    this.#pushHistory({
      type: "Đăng tài sản", id, from: sender,
      detail: `${title} · ${fmtEth(monthlyRent)}/kỳ · cọc ${fmtEth(depositWei)}`,
      extra: { title, monthlyRent, deposit: depositWei },
    });
  }

  #find(property) {
    const p = this.#properties.find((x) => x.id === property.id);
    if (!p) throw new Error("Tài sản không tồn tại");
    return p;
  }

  async cancelListing(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (sender.toLowerCase() !== p.landlord.toLowerCase()) throw new Error("Chỉ chủ nhà mới hủy được");
    if (p.status !== 0) throw new Error("Tài sản không còn trống");
    onPending?.();
    await delay(500);

    p.status = 5;
    this.#pushHistory({
      type: "Hủy tin đăng", id: p.id, from: sender,
      detail: `${sender.slice(0, 6)}…${sender.slice(-4)} đã hủy tin đăng`,
    });
  }

  async rentProperty(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 0) throw new Error("Tài sản không còn trống");
    if (sender.toLowerCase() === p.landlord.toLowerCase()) throw new Error("Chủ nhà không thể tự thuê");
    if (p.deposit !== property.deposit) throw new Error("Phải đặt cọc đúng số tiền");
    onPending?.();
    await delay(500);

    p.tenant = sender;
    p.depositHeld = p.deposit;
    p.status = 1;
    p.nextDueDate = BigInt(Math.floor(Date.now() / 1000) + RENT_PERIOD_SECONDS);
    this.#pushHistory({
      type: "Đặt cọc", id: p.id, from: sender, to: p.landlord, amount: p.deposit,
      detail: `${sender.slice(0, 6)}…${sender.slice(-4)} cọc ${fmtEth(p.deposit)}`,
    });
  }

  /** Tinh tong tien phai tra cho ky nay (kem phat tre neu qua han). */
  async quotePayRent(property) {
    const isLate = Math.floor(Date.now() / 1000) > Number(property.nextDueDate);
    const penalty = isLate ? (property.monthlyRent * LATE_FEE_BPS) / 10000n : 0n;
    return { total: property.monthlyRent + penalty, penalty, isLate };
  }

  async payRent(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 1) throw new Error("Hợp đồng không hoạt động");
    if (sender.toLowerCase() !== p.tenant.toLowerCase()) throw new Error("Chỉ người thuê mới trả tiền");
    onPending?.();
    await delay(500);

    const { penalty } = await this.quotePayRent(p);
    p.rentPaidCount += 1;
    p.nextDueDate += BigInt(RENT_PERIOD_SECONDS);
    this.#pushHistory({
      type: "Trả tiền thuê", id: p.id, from: sender, to: p.landlord, amount: p.monthlyRent + penalty,
      detail: `${sender.slice(0, 6)}…${sender.slice(-4)} trả ${fmtEth(p.monthlyRent + penalty)}${penalty > 0n ? ` (kèm phạt trễ ${fmtEth(penalty)})` : ""}`,
      extra: { latePenalty: penalty },
    });
  }

  async confirmHandover(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 1) throw new Error("Hợp đồng không hoạt động");
    if (sender.toLowerCase() !== p.tenant.toLowerCase()) throw new Error("Chỉ người thuê mới xác nhận");
    onPending?.();
    await delay(500);

    p.status = 2;
    this.#pushHistory({
      type: "Xác nhận bàn giao", id: p.id, from: sender, to: p.landlord,
      detail: `${sender.slice(0, 6)}…${sender.slice(-4)}`,
    });
  }

  async proposeSettlement(property, deductEth, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    const deductAmount = parseEth(deductEth);
    if (p.status !== 2) throw new Error("Chưa bàn giao phòng");
    if (sender.toLowerCase() !== p.landlord.toLowerCase()) throw new Error("Chỉ chủ nhà mới đề xuất");
    if (deductAmount > p.depositHeld) throw new Error("Khấu trừ vượt quá tiền cọc");
    onPending?.();
    await delay(500);

    p.proposedDeduction = deductAmount;
    p.settlementProposed = true;
    this.#pushHistory({
      type: "Đề xuất tất toán", id: p.id, from: sender, amount: deductAmount,
      detail: `Đề xuất khấu trừ ${fmtEth(deductAmount)}`,
      extra: { proposedDeduction: deductAmount },
    });
  }

  #settle(p, deductAmount) {
    const refund = p.depositHeld - deductAmount;
    p.depositHeld = 0n;
    p.status = 3;
    p.settlementProposed = false;
    this.#pushHistory({
      type: "Kết thúc", id: p.id, from: p.landlord, to: p.tenant, amount: refund,
      detail: `hoàn ${fmtEth(refund)} · khấu trừ ${fmtEth(deductAmount)}`,
      extra: { refundToTenant: refund, deductToLandlord: deductAmount },
    });
  }

  async acceptSettlement(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 2) throw new Error("Chưa bàn giao phòng");
    if (!p.settlementProposed) throw new Error("Chưa có đề xuất tất toán");
    if (sender.toLowerCase() !== p.tenant.toLowerCase()) throw new Error("Chỉ người thuê mới đồng ý");
    onPending?.();
    await delay(500);

    this.#settle(p, p.proposedDeduction);
  }

  async disputeSettlement(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 2) throw new Error("Chưa bàn giao phòng");
    if (!p.settlementProposed) throw new Error("Chưa có đề xuất tất toán");
    if (sender.toLowerCase() !== p.tenant.toLowerCase()) throw new Error("Chỉ người thuê mới khiếu nại");
    onPending?.();
    await delay(500);

    p.status = 4;
    this.#pushHistory({
      type: "Khiếu nại", id: p.id, from: sender,
      detail: `${sender.slice(0, 6)}…${sender.slice(-4)} không đồng ý mức đề xuất`,
    });
  }

  async voteOnDispute(property, deductEth, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    const deductAmount = parseEth(deductEth);
    if (p.status !== 4) throw new Error("Tài sản không trong trạng thái tranh chấp");
    if (!(await this.isArbiter(sender))) throw new Error("Chỉ trọng tài mới bỏ phiếu được");
    if (deductAmount > p.depositHeld) throw new Error("Khấu trừ vượt quá tiền cọc");

    if (!this.#disputeVotes.has(p.id)) this.#disputeVotes.set(p.id, new Map());
    const votesForProperty = this.#disputeVotes.get(p.id);
    for (const voters of votesForProperty.values()) {
      if (voters.has(sender.toLowerCase())) throw new Error("Trọng tài này đã bỏ phiếu rồi");
    }

    onPending?.();
    await delay(500);

    const key = deductAmount.toString();
    if (!votesForProperty.has(key)) votesForProperty.set(key, new Set());
    votesForProperty.get(key).add(sender.toLowerCase());
    const voteCount = votesForProperty.get(key).size;

    this.#pushHistory({
      type: "Trọng tài bỏ phiếu", id: p.id, from: sender, amount: deductAmount,
      detail: `${sender.slice(0, 6)}…${sender.slice(-4)} đề xuất khấu trừ ${fmtEth(deductAmount)} (phiếu ${voteCount})`,
      extra: { voteCount },
    });

    if (voteCount >= ARBITER_APPROVALS_REQUIRED) {
      this.#settle(p, deductAmount);
    }
  }
}
