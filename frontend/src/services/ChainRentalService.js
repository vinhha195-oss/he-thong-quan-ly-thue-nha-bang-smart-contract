import { ethers } from "ethers";
import { CONTRACT_ADDRESS, CONTRACT_ABI } from "../config.js";
import { short, eth } from "../utils/format.js";

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
    }));
  }

  async loadHistory() {
    if (!CONTRACT_ABI.length) return [];
    const c = await this.#getContract(false);
    const events = [];
    const listed = await c.queryFilter(c.filters.PropertyListed());
    const rented = await c.queryFilter(c.filters.Rented());
    const paid = await c.queryFilter(c.filters.RentPaid());
    const handed = await c.queryFilter(c.filters.HandoverConfirmed());
    const ended = await c.queryFilter(c.filters.LeaseEnded());
    listed.forEach((e) => events.push({ block: e.blockNumber, type: "Đăng tài sản", id: Number(e.args[0]), detail: `${e.args[2]} · ${eth(e.args[3])}/kỳ · cọc ${eth(e.args[4])}` }));
    rented.forEach((e) => events.push({ block: e.blockNumber, type: "Đặt cọc", id: Number(e.args[0]), detail: `${short(e.args[1])} cọc ${eth(e.args[2])}` }));
    paid.forEach((e) => events.push({ block: e.blockNumber, type: "Trả tiền thuê", id: Number(e.args[0]), detail: `${short(e.args[1])} trả ${eth(e.args[2])}` }));
    handed.forEach((e) => events.push({ block: e.blockNumber, type: "Xác nhận bàn giao", id: Number(e.args[0]), detail: `${short(e.args[1])}` }));
    ended.forEach((e) => events.push({ block: e.blockNumber, type: "Kết thúc", id: Number(e.args[0]), detail: `hoàn ${eth(e.args[1])} · khấu trừ ${eth(e.args[2])}` }));
    events.sort((a, b) => b.block - a.block);
    return events;
  }

  async listProperty({ title, location, rent, deposit, imageCID }, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.listProperty(title, location, ethers.parseEther(rent), ethers.parseEther(deposit || "0"), imageCID || "");
    onPending?.();
    await t.wait();
  }

  async rentProperty(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.rentProperty(property.id, { value: property.deposit });
    onPending?.();
    await t.wait();
  }

  async payRent(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.payRent(property.id, { value: property.monthlyRent });
    onPending?.();
    await t.wait();
  }

  async confirmHandover(property, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.confirmHandover(property.id);
    onPending?.();
    await t.wait();
  }

  async endLease(property, deductEth, { onPending } = {}) {
    const c = await this.#getContract(true);
    const t = await c.endLease(property.id, ethers.parseEther(deductEth || "0"));
    onPending?.();
    await t.wait();
  }
}
