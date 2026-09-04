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
const REFRESH_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 4v6h-6" /><path d="M1 20v-6h6" />
    <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
  </svg>
);

export function TopBar({ account, onConnect, onDisconnect, onSwitchWallet, canSwitchWallet, onRefresh }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [spinning, setSpinning] = useState(false);

  const handleRefresh = () => {
    if (spinning || !onRefresh) return;
    setSpinning(true);
    Promise.resolve(onRefresh()).finally(() => setTimeout(() => setSpinning(false), 500));
  };

  return (
    <header className="topbar">
      <div className="brand">
        <div className="logo">◈</div>
        <div>
          <h1>Hệ thống quản lý thuê nhà bằng smart contract</h1>
          <p>Đặt cọc &amp; thanh toán trên blockchain</p>
        </div>
      </div>
      {account ? (
        <>
          <div className="wallet connected">
            <button
              className={"wallet-chip-switch" + (spinning ? " spinning" : "")}
              onClick={handleRefresh}
              title="Làm mới dữ liệu"
              aria-label="Làm mới dữ liệu"
            >
              {REFRESH_ICON}
            </button>
            <button className="wallet-chip-main" onClick={() => setMenuOpen(true)}>
              <Avatar address={account} size={22} />{short(account)}
            </button>
            {canSwitchWallet && (
              <button
                className="wallet-chip-switch"
                onClick={onSwitchWallet}
                title="Đổi ví khác"
                aria-label="Đổi ví khác"
              >
                {SWITCH_ICON}
              </button>
            )}
          </div>
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
