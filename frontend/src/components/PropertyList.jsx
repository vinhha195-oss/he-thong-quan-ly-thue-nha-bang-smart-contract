import { useMemo, useState } from "react";
import { PropertyCard } from "./PropertyCard.jsx";
import { PropertyDetailModal } from "./PropertyDetailModal.jsx";

const PAGE_SIZE = 4;

const SEARCH_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="7" /><path d="M21 21l-4.3-4.3" />
  </svg>
);

function pageNumbers(current, total) {
  const pages = [];
  const add = (n) => pages.push(n);
  const window = 1;
  for (let i = 1; i <= total; i++) {
    if (i === 1 || i === total || Math.abs(i - current) <= window) add(i);
    else if (pages[pages.length - 1] !== "…") add("…");
  }
  return pages;
}

export function PropertyList({ properties, history, onSelectTx }) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState(null);
  // Lay lai property theo id tu mang properties (moi nhat) thay vi giu snapshot cu,
  // de modal tu cap nhat sau khi giao dich thanh cong (vd dat coc/tra tien) ma khong
  // bi hien du lieu cu.
  const selected = selectedId != null ? properties.find((p) => p.id === selectedId) ?? null : null;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matched = q
      ? properties.filter(
          (p) => p.title?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q),
        )
      : properties;
    // Tin moi dang (id lon hon) hien len truoc, khong bat nguoi dung phai luot qua
    // het cac trang cu moi thay tin vua dang.
    return [...matched].sort((a, b) => b.id - a.id);
  }, [properties, query]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageItems = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  const changeQuery = (v) => { setQuery(v); setPage(1); };

  return (
    <section>
      <div className="search-row">
        <div className="search-box">
          {SEARCH_ICON}
          <input
            value={query}
            onChange={(e) => changeQuery(e.target.value)}
            placeholder="Tìm theo tên phòng hoặc khu vực…"
          />
        </div>
        <span className="result-count">{filtered.length} phòng</span>
      </div>

      <div className="grid">
        {filtered.length === 0 && (
          <div className="empty">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 11l9-7 9 7" /><path d="M5 10v10a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V10" />
            </svg>
            <strong>{properties.length === 0 ? "Chưa có tài sản nào" : "Không tìm thấy phòng phù hợp"}</strong>
            {properties.length === 0
              ? 'Sang tab "Đăng cho thuê" để tạo phòng đầu tiên.'
              : "Thử từ khoá khác hoặc xoá bộ lọc tìm kiếm."}
          </div>
        )}
        {pageItems.map((p) => (
          <PropertyCard
            key={p.id}
            property={p}
            onOpen={(prop) => setSelectedId(prop.id)}
          />
        ))}

        {totalPages > 1 && (
          <div className="pagination">
            <button disabled={safePage === 1} onClick={() => setPage(safePage - 1)}>‹</button>
            {pageNumbers(safePage, totalPages).map((n, i) =>
              n === "…" ? (
                <span key={`dots-${i}`} className="dots">…</span>
              ) : (
                <button key={n} className={n === safePage ? "on" : ""} onClick={() => setPage(n)}>{n}</button>
              ),
            )}
            <button disabled={safePage === totalPages} onClick={() => setPage(safePage + 1)}>›</button>
          </div>
        )}
      </div>

      <PropertyDetailModal
        property={selected}
        history={history}
        onClose={() => setSelectedId(null)}
        onSelectTx={onSelectTx}
      />
    </section>
  );
}
