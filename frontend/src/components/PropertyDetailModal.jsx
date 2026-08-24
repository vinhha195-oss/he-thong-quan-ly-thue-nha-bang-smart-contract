import { eth, short, dateTime } from "../utils/format.js";
import { Avatar } from "./Avatar.jsx";
import { Modal } from "./Modal.jsx";
import { PropertyActions } from "./PropertyActions.jsx";
import { PropertyGallery } from "./PropertyGallery.jsx";
import { StatusBadge } from "./StatusBadge.jsx";

export function PropertyDetailModal({ property: p, history, onClose, onSelectTx }) {
  if (!p) return null;
  const ownHistory = (history || []).filter((h) => h.id === p.id);

  return (
    <Modal open={!!p} onClose={onClose} wide>
      <PropertyGallery property={p} />

      <div className="detail-title">
        <h2>{p.title || `Phòng #${p.id}`}</h2>
        <span className="id-pill">#{p.id}</span>
        <StatusBadge status={p.status} />
      </div>
      <p className="loc">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
        </svg>
        {p.location || "—"}
      </p>

      {p.note && (
        <div className="detail-note">
          <strong>Ghi chú từ chủ nhà</strong>
          {p.note}
        </div>
      )}

      <div className="detail-facts">
        <div><span>Tiền thuê/kỳ</span><b>{eth(p.monthlyRent)}</b></div>
        <div><span>Tiền cọc</span><b>{eth(p.deposit)}</b></div>
        <div><span>Chủ nhà</span><div className="addr-row"><Avatar address={p.landlord} size={18} /><b className="mono">{short(p.landlord)}</b></div></div>
        <div><span>Người thuê</span><div className="addr-row"><Avatar address={p.tenant} size={18} /><b className="mono">{short(p.tenant)}</b></div></div>
        <div><span>Số kỳ đã trả</span><b>{p.rentPaidCount}</b></div>
        <div><span>Cọc đang giữ</span><b>{eth(p.depositHeld)}</b></div>
        {p.status === 1 && <div><span>Hạn trả tiếp theo</span><b>{dateTime(p.nextDueDate)}</b></div>}
      </div>

      <PropertyActions property={p} />

      {ownHistory.length > 0 && (
        <div className="detail-history">
          <h3>Lịch sử phòng này</h3>
          {ownHistory.map((h, i) => (
            <div key={i} className="detail-history-row" onClick={() => onSelectTx(h)}>
              <span className="tag">{h.type}</span>
              <span style={{ flex: 1, color: "var(--ink-soft)" }}>{dateTime(h.timestamp)}</span>
              {h.amount != null && <b className="mono">{eth(h.amount)}</b>}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}
