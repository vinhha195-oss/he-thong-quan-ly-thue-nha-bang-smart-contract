import { eth } from "../utils/format.js";
import { sameAddr } from "../utils/address.js";

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/** Nut hanh dong theo trang thai + vai tro, dung chung cho PropertyCard va PropertyDetailModal. */
export function PropertyActions({ property: p, account, busy, onRent, onPay, onHandover, onEnd }) {
  const isLandlord = sameAddr(account, p.landlord);
  const isTenant = sameAddr(account, p.tenant);

  const handleEnd = () => {
    const input = window.prompt("Số tiền khấu trừ khỏi cọc (ETH), nhập 0 nếu hoàn đủ:", "0");
    if (input === null) return;
    onEnd(p, input);
  };

  return (
    <div className="actions">
      {p.status === 0 && !isLandlord && (
        <button className="primary" disabled={busy || !account} onClick={() => onRent(p)}>
          Đặt cọc &amp; thuê ({eth(p.deposit)})
        </button>
      )}
      {p.status === 0 && isLandlord && <span className="note">Đang chờ người thuê đặt cọc</span>}
      {p.status === 1 && isTenant && (
        <>
          <button className="primary" disabled={busy} onClick={() => onPay(p)}>Trả tiền thuê ({eth(p.monthlyRent)})</button>
          <button className="ghost" disabled={busy} onClick={() => onHandover(p)}>Xác nhận bàn giao</button>
        </>
      )}
      {p.status === 1 && isLandlord && <span className="note">Đang cho thuê · chờ người thuê trả phòng</span>}
      {p.status === 2 && isLandlord && (
        <button className="primary" disabled={busy} onClick={handleEnd}>Tất toán cọc &amp; kết thúc</button>
      )}
      {p.status === 2 && !isLandlord && <span className="note">Đã bàn giao · chờ chủ nhà tất toán</span>}
      {p.status === 3 && (
        <span className="note done">
          {CHECK_ICON}
          Hợp đồng đã hoàn tất
        </span>
      )}
    </div>
  );
}
