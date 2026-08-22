import { eth, short, dateTime } from "../utils/format.js";
import { Avatar } from "./Avatar.jsx";
import { Modal } from "./Modal.jsx";

const ARROW = (
  <svg className="arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
);

function Party({ address }) {
  if (!address) return <span className="mono">—</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <Avatar address={address} size={18} />
      {short(address)}
    </span>
  );
}

export function TransactionDetailModal({ event, onClose }) {
  if (!event) return null;
  const e = event;

  return (
    <Modal open={!!event} onClose={onClose}>
      <span className="tag">{e.type}</span>
      <div className="detail-title" style={{ marginTop: 12 }}>
        <h2>Chi tiết giao dịch</h2>
        <span className="id-pill">Phòng #{e.id}</span>
      </div>

      {e.amount != null && <div className="tx-amount">{eth(e.amount)}</div>}

      <div className="tx-row" style={{ margin: "16px 0" }}>
        <div className="tx-parties">
          <Party address={e.from} />
          {ARROW}
          <Party address={e.to} />
        </div>
      </div>

      <div className="tx-meta">
        <div className="tx-meta-row"><span>Thời gian</span><b>{dateTime(e.timestamp)}</b></div>
        <div className="tx-meta-row"><span>Block</span><b className="mono">#{e.block}</b></div>
        <div className="tx-meta-row"><span>Mã giao dịch (tx hash)</span><b className="mono" style={{ fontSize: 12 }}>{e.txHash ? short(e.txHash) : "—"}</b></div>
        {e.extra?.monthlyRent != null && <div className="tx-meta-row"><span>Tiền thuê/kỳ</span><b>{eth(e.extra.monthlyRent)}</b></div>}
        {e.extra?.deposit != null && <div className="tx-meta-row"><span>Tiền cọc</span><b>{eth(e.extra.deposit)}</b></div>}
        {e.extra?.refundToTenant != null && <div className="tx-meta-row"><span>Hoàn cho người thuê</span><b>{eth(e.extra.refundToTenant)}</b></div>}
        {e.extra?.deductToLandlord != null && <div className="tx-meta-row"><span>Khấu trừ cho chủ nhà</span><b>{eth(e.extra.deductToLandlord)}</b></div>}
      </div>
    </Modal>
  );
}
