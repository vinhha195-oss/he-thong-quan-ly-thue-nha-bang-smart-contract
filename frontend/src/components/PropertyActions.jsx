import { useEffect, useState } from "react";
import { eth } from "../utils/format.js";
import { sameAddr } from "../utils/address.js";
import { useRental } from "../hooks/useRental.js";

const CHECK_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 13l4 4L19 7" />
  </svg>
);

/** Nut hanh dong theo trang thai + vai tro, dung chung cho PropertyCard va PropertyDetailModal. */
export function PropertyActions({ property: p }) {
  const {
    account, busy, isArbiter, quotePayRent,
    cancelListing, rentProperty, payRent, confirmHandover,
    proposeSettlement, acceptSettlement, disputeSettlement, voteOnDispute,
  } = useRental();
  const isLandlord = sameAddr(account, p.landlord);
  const isTenant = sameAddr(account, p.tenant);
  const [rentQuote, setRentQuote] = useState(null);

  useEffect(() => {
    if (p.status !== 1) return;
    let cancelled = false;
    quotePayRent(p).then((q) => { if (!cancelled) setRentQuote(q); });
    return () => { cancelled = true; };
  }, [p.status, p.nextDueDate, p.id, quotePayRent]);

  const handlePropose = () => {
    const input = window.prompt("Đề xuất mức khấu trừ khỏi cọc (ETH), nhập 0 nếu hoàn đủ:", "0");
    if (input === null) return;
    proposeSettlement(p, input);
  };

  const handleVote = () => {
    const input = window.prompt("Trọng tài đề xuất mức khấu trừ (ETH):", eth(p.proposedDeduction).replace(" ETH", ""));
    if (input === null) return;
    voteOnDispute(p, input);
  };

  const handleCancel = () => {
    if (!window.confirm("Hủy tin đăng này? Không thể hoàn tác - nếu đăng nhầm giá, hãy hủy rồi đăng lại tin mới.")) return;
    cancelListing(p);
  };

  if (p.status === 0) {
    return (
      <div className="actions">
        {!isLandlord && (
          <button className="primary" disabled={busy || !account} onClick={() => rentProperty(p)}>
            Đặt cọc &amp; thuê ({eth(p.deposit)})
          </button>
        )}
        {isLandlord && (
          <>
            <span className="note">Đang chờ người thuê đặt cọc</span>
            <button className="ghost danger" disabled={busy} onClick={handleCancel}>Hủy tin</button>
          </>
        )}
      </div>
    );
  }

  if (p.status === 5) {
    return (
      <div className="actions">
        <span className="note">Tin đăng đã bị hủy bởi chủ nhà</span>
      </div>
    );
  }

  if (p.status === 1) {
    const payLabel = rentQuote
      ? `Trả tiền thuê (${eth(rentQuote.total)}${rentQuote.isLate ? ", gồm phạt trễ" : ""})`
      : `Trả tiền thuê (${eth(p.monthlyRent)})`;
    return (
      <div className="actions">
        {isTenant && (
          <>
            <button className="primary" disabled={busy} onClick={() => payRent(p)}>{payLabel}</button>
            <button className="ghost" disabled={busy} onClick={() => confirmHandover(p)}>Xác nhận bàn giao</button>
          </>
        )}
        {isLandlord && (
          <span className="note">
            Đang cho thuê · chờ người thuê trả phòng
            {rentQuote?.isLate && <span className="late-tag"> · người thuê đang trễ hạn</span>}
          </span>
        )}
      </div>
    );
  }

  if (p.status === 2) {
    if (!p.settlementProposed) {
      return (
        <div className="actions">
          {isLandlord && (
            <button className="primary" disabled={busy} onClick={handlePropose}>Đề xuất tất toán</button>
          )}
          {!isLandlord && <span className="note">Đang chờ chủ nhà đề xuất tất toán</span>}
        </div>
      );
    }
    return (
      <div className="actions">
        {isTenant && (
          <>
            <button className="primary" disabled={busy} onClick={() => acceptSettlement(p)}>
              Đồng ý khấu trừ {eth(p.proposedDeduction)}
            </button>
            <button className="ghost" disabled={busy} onClick={() => disputeSettlement(p)}>Khiếu nại</button>
          </>
        )}
        {isLandlord && (
          <span className="note">Đã đề xuất khấu trừ {eth(p.proposedDeduction)} · chờ người thuê phản hồi</span>
        )}
      </div>
    );
  }

  if (p.status === 4) {
    return (
      <div className="actions">
        {isArbiter ? (
          <button className="primary" disabled={busy} onClick={handleVote}>Bỏ phiếu trọng tài</button>
        ) : (
          <span className="note">Đang tranh chấp · chờ trọng tài xử lý (cần nhiều trọng tài đồng thuận)</span>
        )}
      </div>
    );
  }

  return (
    <div className="actions">
      <span className="note done">
        {CHECK_ICON}
        Hợp đồng đã hoàn tất
      </span>
    </div>
  );
}
