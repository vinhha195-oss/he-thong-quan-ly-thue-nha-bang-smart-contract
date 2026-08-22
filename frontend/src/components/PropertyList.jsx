import { PropertyCard } from "./PropertyCard.jsx";

export function PropertyList({ properties, account, busy, onRent, onPay, onHandover, onEnd }) {
  return (
    <section className="grid">
      {properties.length === 0 && (
        <div className="empty">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 11l9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
          </svg>
          <strong>Chưa có tài sản nào</strong>
          Sang tab "Đăng cho thuê" để tạo phòng đầu tiên.
        </div>
      )}
      {properties.map((p) => (
        <PropertyCard
          key={p.id}
          property={p}
          account={account}
          busy={busy}
          onRent={onRent}
          onPay={onPay}
          onHandover={onHandover}
          onEnd={onEnd}
        />
      ))}
    </section>
  );
}
