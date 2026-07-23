import { PropertyCard } from "./PropertyCard.jsx";

export function PropertyList({ properties, account, busy, onRent, onPay, onHandover, onEnd }) {
  return (
    <section className="grid">
      {properties.length === 0 && (
        <div className="empty">Chưa có tài sản nào. Sang tab "Đăng cho thuê" để tạo phòng đầu tiên.</div>
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
