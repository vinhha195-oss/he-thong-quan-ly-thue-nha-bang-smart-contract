import { useState } from "react";
import { short } from "../utils/format.js";
import { Avatar } from "./Avatar.jsx";
import { Modal } from "./Modal.jsx";

const SWITCH_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 3l4 4-4 4" /><path d="M3 11V9a4 4 0 0 1 4-4h14" /><path d="M7 21l-4-4 4-4" /><path d="M21 13v2a4 4 0 0 1-4 4H3" />
  </svg>
);
const DISCONNECT_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18.36 6.64a9 9 0 1 1-12.73 0" /><line x1="12" y1="2" x2="12" y2="12" />
  </svg>
);

export function TopBar({ account, onConnect, onDisconnect, onSwitchWallet, canSwitchWallet }) {
  const [menuOpen, setMenuOpen] = useState(false);

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
        <>
          <button className="wallet connected" onClick={() => setMenuOpen(true)}>
            <Avatar address={account} size={26} />{short(account)}
          </button>
          <Modal open={menuOpen} onClose={() => setMenuOpen(false)}>
            <h2>Ví đang kết nối</h2>
            <div className="wallet-menu-account">
              <Avatar address={account} size={34} />
              <span className="mono">{account}</span>
            </div>
            <div className="wallet-menu-actions">
              {canSwitchWallet && (
                <button
                  className="ghost"
                  onClick={() => { setMenuOpen(false); onSwitchWallet(); }}
                >
                  {SWITCH_ICON} Đổi ví khác
                </button>
              )}
              <button
                className="ghost danger"
                onClick={() => { setMenuOpen(false); onDisconnect(); }}
              >
                {DISCONNECT_ICON} Ngắt kết nối
              </button>
            </div>
          </Modal>
        </>
      ) : (
        <button className="wallet metamask" onClick={onConnect}>
          <span className="fox" aria-hidden="true">🦊</span> Kết nối ví MetaMask
        </button>
      )}
    </header>
  );
}
