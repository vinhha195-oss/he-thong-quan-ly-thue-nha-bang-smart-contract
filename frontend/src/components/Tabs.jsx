const TAB_ITEMS = [
  {
    id: "browse",
    label: "Danh sách phòng",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
        <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
      </svg>
    ),
  },
  {
    id: "list",
    label: "Đăng cho thuê",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 5v14M5 12h14" />
      </svg>
    ),
  },
  {
    id: "history",
    label: "Lịch sử",
    icon: (
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
      </svg>
    ),
  },
];

export function Tabs({ tab, onChange }) {
  return (
    <nav className="tabs">
      {TAB_ITEMS.map((t) => (
        <button key={t.id} className={tab === t.id ? "on" : ""} onClick={() => onChange(t.id)}>
          {t.icon}
          {t.label}
        </button>
      ))}
    </nav>
  );
}
