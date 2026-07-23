import { createContext, useCallback, useEffect, useState } from "react";
import { getRentalService } from "../services/RentalService.js";
import { CONTRACT_ABI } from "../config.js";

export const RentalContext = createContext(null);

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

  const notify = useCallback((msg, type = "info") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const loadData = useCallback(async () => {
    try {
      const [props, hist] = await Promise.all([service.loadProperties(), service.loadHistory()]);
      setProperties(props);
      setHistory(hist);
    } catch (e) {
      console.error(e);
    }
  }, [service]);

  useEffect(() => {
    if (account) loadData();
  }, [account, loadData]);

  useEffect(() => {
    // Che do mau: tu ket noi ngay de xem duoc UI day du ma khong can bam gi.
    if (service.isMock) service.connect().then(setAccount);
  }, [service]);

  useEffect(() => {
    return service.onAccountsChanged((addr) => setAccount(addr));
  }, [service]);

  const connect = async () => {
    try {
      const addr = await service.connect();
      setAccount(addr);
    } catch (e) {
      notify(e.message, "error");
    }
  };

  const runTx = async (fn, okMsg) => {
    setBusy(true);
    try {
      await fn({ onPending: () => notify("Đang xử lý giao dịch…", "info") });
      notify(okMsg, "success");
      await loadData();
    } catch (e) {
      notify(e.reason || e.shortMessage || e.message, "error");
    } finally {
      setBusy(false);
    }
  };

  const listProperty = async (values) => {
    if (!values.title || !values.rent) {
      notify("Nhập tối thiểu mô tả và tiền thuê", "error");
      return;
    }
    await runTx((opts) => service.listProperty(values, opts), "Đã đăng tài sản");
  };
  const rentProperty = (property) => runTx((opts) => service.rentProperty(property, opts), "Đặt cọc thành công");
  const payRent = (property) => runTx((opts) => service.payRent(property, opts), "Đã trả tiền thuê");
  const confirmHandover = (property) => runTx((opts) => service.confirmHandover(property, opts), "Đã xác nhận bàn giao");
  const endLease = (property, deductEth) => runTx((opts) => service.endLease(property, deductEth, opts), "Đã kết thúc hợp đồng và tất toán cọc");

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
    connect,
    listProperty,
    rentProperty,
    payRent,
    confirmHandover,
    endLease,
  };

  return <RentalContext.Provider value={value}>{children}</RentalContext.Provider>;
}
