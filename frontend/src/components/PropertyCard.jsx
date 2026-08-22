import { useState } from "react";
import { eth, short } from "../utils/format.js";
import { resolveIpfsUrl } from "../utils/ipfs.js";
import { StatusBadge } from "./StatusBadge.jsx";

function sameAddr(a, b) {
  return !!a && !!b && a.toLowerCase() === b.toLowerCase();
}

const HOUSE_ICON = (
  <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 11l9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
  </svg>
);

export function PropertyCard({ property: p, account, busy, onRent, onPay, onHandover, onEnd }) {
  const isLandlord = sameAddr(account, p.landlord);
  const isTenant = sameAddr(account, p.tenant);
  const [imageFailed, setImageFailed] = useState(false);

  const handleEnd = () => {
    const input = window.prompt("Số tiền khấu trừ khỏi cọc (ETH), nhập 0 nếu hoàn đủ:", "0");
    if (input === null) return;
    onEnd(p, input);
  };

  const imageUrl = resolveIpfsUrl(p.imageCID);

  return (
    <div className="card property">
      {imageUrl && !imageFailed ? (
        <img
          className="property-image"
          src={imageUrl}
          alt={p.title || `Phòng #${p.id}`}
          loading="lazy"
          onError={() => setImageFailed(true)}
        />
      ) : (
        <div className="property-image-placeholder">{HOUSE_ICON}</div>
      )}
      <div className="property-head">
        <div>
          <h3>{p.title || `Phòng #${p.id}`}</h3>
          <p className="loc">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {p.location || "—"}
          </p>
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
        {p.status === 3 && (
          <span className="note done">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 13l4 4L19 7" />
            </svg>
            Hợp đồng đã hoàn tất
          </span>
        )}
      </div>
    </div>
  );
}
