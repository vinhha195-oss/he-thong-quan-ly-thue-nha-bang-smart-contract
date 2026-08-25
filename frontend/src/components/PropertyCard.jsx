import { eth, short } from "../utils/format.js";
import { Avatar } from "./Avatar.jsx";
import { PropertyActions } from "./PropertyActions.jsx";
import { PropertyImage } from "./PropertyImage.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

export function PropertyCard({ property: p, onOpen }) {
  return (
    <div className="card property">
      <button className="property-image-btn" onClick={() => onOpen(p)} aria-label="Xem chi tiết phòng">
        <PropertyImage property={p} imgClass="property-image" placeholderClass="property-image-placeholder" badge />
      </button>
      <div className="property-head">
        <div>
          <div className="detail-title" style={{ marginBottom: 0 }}>
            <h3 className="clickable" onClick={() => onOpen(p)}>{p.title || `Phòng #${p.id}`}</h3>
            <span className="id-pill">#{p.id}</span>
          </div>
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
        <div><span>Chủ nhà</span><div className="addr-row"><Avatar address={p.landlord} size={18} /><b className="mono">{short(p.landlord)}</b></div></div>
        <div><span>Người thuê</span><div className="addr-row"><Avatar address={p.tenant} size={18} /><b className="mono">{short(p.tenant)}</b></div></div>
        {p.status >= 1 && p.status !== 5 && <div><span>Số kỳ đã trả</span><b>{p.rentPaidCount}</b></div>}
        {p.depositHeld > 0n && <div><span>Cọc đang giữ</span><b>{eth(p.depositHeld)}</b></div>}
      </div>
      <PropertyActions property={p} />
    </div>
  );
}
