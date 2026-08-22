import { eth, short } from "../utils/format.js";
import { resolveIpfsUrl } from "../utils/ipfs.js";
import { StatusBadge } from "./StatusBadge.jsx";

function sameAddr(a, b) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

export function PropertyCard({ property: p, account, busy, onRent, onPay, onHandover, onEnd }) {
  const isLandlord = sameAddr(account, p.landlord);
  const isTenant = sameAddr(account, p.tenant);

  const handleEnd = () => {
    const input = window.prompt("Số tiền khấu trừ khỏi cọc (ETH), nhập 0 nếu hoàn đủ:", "0");
    if (input === null) return;
    onEnd(p, input);
  };

  const imageUrl = resolveIpfsUrl(p.imageCID);

  return (
    <div className="card property">
      {imageUrl && (
        <img
          className="property-image"
          src={imageUrl}
          alt={p.title || `Phòng #${p.id}`}
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      )}
      <div className="property-head">
        <div>
          <h3>{p.title || `Phòng #${p.id}`}</h3>
          <p className="loc">{p.location || "—"}</p>
        </div>
        <StatusBadge status={p.status} />
      </div>
      <div className="facts">
        <div><span>Tiền thuê/kỳ</span><b>{eth(p.monthlyRent)}</b></div>
        <div><span>Tiền cọc</span><b>{eth(p.deposit)}</b></div>
        <div><span>Chủ nhà</span><b className="mono">{short(p.landlord)}</b></div>
        <div><span>Người thuê</span><b className="mono">{short(p.tenant)}</b></div>
        {p.status >= 1 && <div><span>Số kỳ đã trả</span><b>{p.rentPaidCount}</b></div>}
        {p.depositHeld > 0n && <div><span>Cọc đang giữ</span><b>{eth(p.depositHeld)}</b></div>}
      </div>
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
        {p.status === 3 && <span className="note done">Hợp đồng đã hoàn tất</span>}
      </div>
    </div>
  );
}
