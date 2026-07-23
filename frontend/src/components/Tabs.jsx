const TAB_ITEMS = [
  { id: "browse", label: "Danh sách phòng" },
  { id: "list", label: "Đăng cho thuê" },
  { id: "history", label: "Lịch sử" },
];

export function Tabs({ tab, onChange }) {
  return (
    <nav className="tabs">
      {TAB_ITEMS.map((t) => (
        <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => onChange(t.id)}>
          {t.label}
        </button>
      ))}
    </nav>
  );
}
