import { createContext, useCallback, useEffect, useState } from "react";
import { getRentalService } from "../services/RentalService.js";
import { CONTRACT_ABI } from "../config.js";

export const RentalContext = createContext(null);

// Danh dau nguoi dung CHU DONG ngat ket noi - de F5 lai khong tu dong noi lai session
// (dung nguoc voi hanh vi mac dinh la tu khoi phuc ket noi khi con quyen).
const DISCONNECT_KEY = "rental_wallet_disconnected";

/**
 * Provider duy nhat noi UI (components/*) lay du lieu + goi hanh dong.
 * Khong biet gi ve ethers/mock ben trong — chi goi qua "service"
 * (ChainRentalService hoac MockRentalService, cung interface, xem services/RentalService.js).
 */
export function RentalProvider({ children }) {
  const [service] = useState(() => getRentalService());
  const [account, setAccount] = useState(service.getAccount());
  const [properties, setProperties] = useState([]);
  const [history, setHistory] = useState([]);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState(null);
  const [isArbiter, setIsArbiter] = useState(false);

  const notify = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    // Tach rieng 2 loi goi - loadHistory() (vd eth_getLogs) that bai khong duoc
    // lam mat luon danh sach phong da tai thanh cong tu loadProperties().
    try {
      setProperties(await service.loadProperties());
    } catch (e) {
      console.error(e);
      notify(e.reason || e.shortMessage || e.message, "error");
    }
    try {
      setHistory(await service.loadHistory());
    } catch (e) {
      console.error(e);
      notify(e.reason || e.shortMessage || e.message, "error");
    }
  }, [service, notify]);

  useEffect(() => {
    if (account) loadData();
  }, [account, loadData]);

  useEffect(() => {
    if (service.isMock) {
      // Che do mau: tu ket noi ngay de xem duoc UI day du ma khong can bam gi.
      service.connect().then(setAccount);
      return;
    }
    // Che do chain: tu khoi phuc session khi tai lai trang (F5) neu MetaMask van con
    // cap quyen VA nguoi dung khong chu dong bam "Ngat ket noi" lan truoc - khong hien
    // popup xin quyen, chi hoi lai cac tai khoan da duoc cho phep san.
    if (localStorage.getItem(DISCONNECT_KEY) === "1") return;
    service.tryReconnect?.().then((addr) => { if (addr) setAccount(addr); });
  }, [service]);

  useEffect(() => {
    return service.onAccountsChanged((addr) => setAccount(addr));
  }, [service]);

  useEffect(() => {
    let cancelled = false;
    service.isArbiter(account).then((v) => { if (!cancelled) setIsArbiter(v); });
    return () => { cancelled = true; };
  }, [service, account]);

  const connect = async () => {
    try {
      const addr = await service.connect();
      setAccount(addr);
      localStorage.removeItem(DISCONNECT_KEY);
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const disconnect = () => {
    service.disconnect?.();
    setAccount(null);
    localStorage.setItem(DISCONNECT_KEY, "1");
    notify("Đã ngắt kết nối ví", "info");
  };

  const switchWallet = async () => {
    try {
      const addr = await service.requestAccountSwitch?.();
      if (addr) {
        setAccount(addr);
        localStorage.removeItem(DISCONNECT_KEY);
      }
    } catch (e) {
      notify(e.message, "error");
    }
  };

  // Tra ve true/false bao hieu giao dich co thanh cong khong - de UI (vd PropertyForm)
  // biet co nen reset form hay giu nguyen noi dung da nhap khi that bai.
  const runTx = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn({ onPending: () => notify("Đang xử lý giao dịch…", "info") });
      notify(okMsg, "success");
      await loadData();
      return true;
    } catch (e) {
      notify(e.reason || e.shortMessage || e.message, "error");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const listProperty = (values) => runTx((opts) => service.listProperty(values, opts), "Đã đăng tài sản");
  const rentProperty = (property) => runTx((opts) => service.rentProperty(property, opts), "Đặt cọc thành công");
  const payRent = (property) => runTx((opts) => service.payRent(property, opts), "Đã trả tiền thuê");
  const confirmHandover = (property) => runTx((opts) => service.confirmHandover(property, opts), "Đã xác nhận bàn giao");
  const proposeSettlement = (property, deductEth) =>
    runTx((opts) => service.proposeSettlement(property, deductEth, opts), "Đã đề xuất mức tất toán");
  const acceptSettlement = (property) =>
    runTx((opts) => service.acceptSettlement(property, opts), "Đã đồng ý tất toán");
  const disputeSettlement = (property) =>
    runTx((opts) => service.disputeSettlement(property, opts), "Đã gửi khiếu nại, chờ trọng tài xử lý");
  const voteOnDispute = (property, deductEth) =>
    runTx((opts) => service.voteOnDispute(property, deductEth, opts), "Đã ghi nhận phiếu bầu của trọng tài");
  const quotePayRent = (property) => service.quotePayRent(property);

  const value = {
    isMock: service.isMock,
    isConfigured: service.isMock || CONTRACT_ABI.length > 0,
    mockAccounts: service.isMock ? service.listMockAccounts() : [],
    switchMockAccount: service.isMock ? (addr) => service.switchAccount(addr) : undefined,
    account,
    properties,
    history,
    busy,
    toast,
    isArbiter,
    connect,
    disconnect,
    canSwitchWallet: !service.isMock,
    switchWallet,
    listProperty,
    rentProperty,
    payRent,
    quotePayRent,
    confirmHandover,
    proposeSettlement,
    acceptSettlement,
    disputeSettlement,
    voteOnDispute,
  };

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>;
}
