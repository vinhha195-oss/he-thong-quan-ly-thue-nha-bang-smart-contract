import { short } from "../utils/format.js";

export function TopBar({ account, onConnect }) {
  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">◈</div>
        <div>
          <h1>Sổ thuê nhà</h1>
          <p>Đặt cọc &amp; thanh toán trên blockchain</p>
        </div>
      </div>
      {account ? (
        <div className="wallet connected"><span className="dot" />{short(account)}</div>
      ) : (
        <button className="wallet" onClick={onConnect}>Kết nối ví</button>
      )}
    </header>
  );
}
