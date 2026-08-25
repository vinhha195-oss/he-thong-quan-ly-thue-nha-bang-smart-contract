import { short } from "../utils/format.js";
import { Avatar } from "./Avatar.jsx";

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
        <div className="wallet connected"><Avatar address={account} size={26} />{short(account)}</div>
      ) : (
        <button className="wallet metamask" onClick={onConnect}>
          <span className="fox" aria-hidden="true">🦊</span> Kết nối ví MetaMask
        </button>
      )}
    </header>
  );
}
