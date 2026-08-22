import { ethers } from "ethers";
import { MOCK_ACCOUNTS, createInitialProperties, createInitialHistory } from "../mock/fixtures.js";
import { eth as fmtEth } from "../utils/format.js";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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

  async connect() {
    await delay(200);
    this.#account = MOCK_ACCOUNTS.landlord.address;
    return this.#account;
  }

  getAccount() {
    return this.#account;
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
    this.#history.push({ block: this.#nextBlock(), ...entry });
  }

  #requireAccount() {
    if (!this.#account) throw new Error("Vui lòng kết nối ví (mẫu) trước");
    return this.#account;
  }

  async listProperty({ title, location, rent, deposit, imageCID }, { onPending } = {}) {
    const sender = this.#requireAccount();
    const monthlyRent = ethers.parseEther(rent || "0");
    const depositWei = ethers.parseEther(deposit || "0");
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
    });
    this.#pushHistory({ type: "Đăng tài sản", id, detail: `${title} · ${fmtEth(monthlyRent)}/kỳ · cọc ${fmtEth(depositWei)}` });
  }

  #find(property) {
    const p = this.#properties.find((x) => x.id === property.id);
    if (!p) throw new Error("Tài sản không tồn tại");
    return p;
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
    this.#pushHistory({ type: "Đặt cọc", id: p.id, detail: `${sender.slice(0, 6)}…${sender.slice(-4)} cọc ${fmtEth(p.deposit)}` });
  }

  async payRent(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 1) throw new Error("Hợp đồng không hoạt động");
    if (sender.toLowerCase() !== p.tenant.toLowerCase()) throw new Error("Chỉ người thuê mới trả tiền");
    onPending?.();
    await delay(500);

    p.rentPaidCount += 1;
    this.#pushHistory({ type: "Trả tiền thuê", id: p.id, detail: `${sender.slice(0, 6)}…${sender.slice(-4)} trả ${fmtEth(p.monthlyRent)}` });
  }

  async confirmHandover(property, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    if (p.status !== 1) throw new Error("Hợp đồng không hoạt động");
    if (sender.toLowerCase() !== p.tenant.toLowerCase()) throw new Error("Chỉ người thuê mới xác nhận");
    onPending?.();
    await delay(500);

    p.status = 2;
    this.#pushHistory({ type: "Xác nhận bàn giao", id: p.id, detail: `${sender.slice(0, 6)}…${sender.slice(-4)}` });
  }

  async endLease(property, deductEth, { onPending } = {}) {
    const sender = this.#requireAccount();
    const p = this.#find(property);
    const deductAmount = ethers.parseEther(deductEth || "0");
    if (p.status !== 2) throw new Error("Chưa bàn giao phòng");
    if (sender.toLowerCase() !== p.landlord.toLowerCase()) throw new Error("Chỉ chủ nhà mới kết thúc");
    if (deductAmount > p.depositHeld) throw new Error("Khấu trừ vượt quá tiền cọc");
    onPending?.();
    await delay(500);

    const refund = p.depositHeld - deductAmount;
    p.depositHeld = 0n;
    p.status = 3;
    this.#pushHistory({ type: "Kết thúc", id: p.id, detail: `hoàn ${fmtEth(refund)} · khấu trừ ${fmtEth(deductAmount)}` });
  }
}
