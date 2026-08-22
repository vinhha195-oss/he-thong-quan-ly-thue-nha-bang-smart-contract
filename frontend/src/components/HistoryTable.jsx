export function HistoryTable({ history }) {
  return (
    <section className="card">
      <h2>Lịch sử giao dịch</h2>
      <p className="hint">Đọc trực tiếp từ blockchain — không thể chỉnh sửa.</p>
      {history.length === 0 ? (
        <div className="empty-row">
          <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" />
          </svg>
          <strong>Chưa có giao dịch nào</strong>
          Lịch sử sẽ xuất hiện ngay khi có hoạt động trên hợp đồng.
        </div>
      ) : (
        <div className="history-wrap">
          <table className="history">
            <thead>
              <tr><th>Block</th><th>Hành động</th><th>Phòng</th><th>Chi tiết</th></tr>
            </thead>
            <tbody>
              {history.map((h, i) => (
                <tr key={i}>
                  <td className="mono">#{h.block}</td>
                  <td><span className="tag">{h.type}</span></td>
                  <td>#{h.id}</td>
                  <td className="mono small">{h.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
