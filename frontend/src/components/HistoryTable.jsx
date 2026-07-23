export function HistoryTable({ history }) {
  return (
    <section className="card">
      <h2>Lịch sử giao dịch</h2>
      <p className="hint">Đọc trực tiếp từ blockchain — không thể chỉnh sửa.</p>
      <table className="history">
        <thead>
          <tr><th>Block</th><th>Hành động</th><th>Phòng</th><th>Chi tiết</th></tr>
        </thead>
        <tbody>
          {history.length === 0 && (
            <tr><td colSpan="4" className="empty-row">Chưa có giao dịch nào</td></tr>
          )}
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
    </section>
  );
}
