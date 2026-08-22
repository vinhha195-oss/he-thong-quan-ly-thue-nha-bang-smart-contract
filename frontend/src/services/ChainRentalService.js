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
      note: p.note,
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

    // Xay map id -> landlord/tenant tu chinh cac event da co, khong can goi lai
    // getProperty() (landlord/tenant khong doi sau khi gan, kha nang tin cay du dung).
    const landlordById = new Map();
    listed.forEach((e) => landlordById.set(Number(e.args[0]), e.args[1]));
    const tenantById = new Map();
    rented.forEach((e) => tenantById.set(Number(e.args[0]), e.args[1]));

    // PropertyListed khong mang timestamp trong event args -> lay tu block.
    const listedBlocks = await Promise.all(listed.map((e) => e.getBlock()));

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
      events.push({
        block: e.blockNumber, txHash: e.transactionHash, timestamp: Number(e.args[3]),
        type: "Trả tiền thuê", id, from: e.args[1], to: landlordById.get(id) ?? null, amount: e.args[2],
        detail: `${short(e.args[1])} trả ${eth(e.args[2])}`, extra: {},
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
    const t = await c.listProperty(title, location, ethers.parseEther(rent), ethers.parseEther(deposit || "0"), imageCID || "", note || "");
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
