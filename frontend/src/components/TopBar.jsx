import { short } from "../utils/format.js";
import { Avatar } from "./Avatar.jsx";

const WALLET_ICON = (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7a2 2 0 0 1 2-2h13a1 1 0 0 1 1 1v3" /><path d="M3 7v10a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-7a1 1 0 0 0-1-1H5a2 2 0 0 1-2-2Z" />
    <path d="M17 14h.01" />
  </svg>
);

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
        <button className="wallet" onClick={onConnect}>{WALLET_ICON} Kết nối ví</button>
      )}
    </header>
  );
}
