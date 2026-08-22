import { Avatar } from "./Avatar.jsx";

export function ModeBanner({ isMock, isConfigured, mockAccounts, account, onSwitchMockAccount }) {
  if (isMock) {
    return (
      <div className="mode-banner mock">
        <span className="mode-tag"><span className="dot" />Chế độ: Dữ liệu mẫu (mock)</span>
        <div className="role-switch">
          {mockAccounts.map((a) => (
            <button
              key={a.address}
              className={account?.toLowerCase() === a.address.toLowerCase() ? "on" : ""}
              onClick={() => onSwitchMockAccount(a.address)}
            >
              <Avatar address={a.address} size={16} />
              {a.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className="banner">
        Chưa nạp cấu hình hợp đồng. Hãy chạy <code>npm run deploy</code> để tạo file config.js.
      </div>
    );
  }

  return (
    <div className="mode-banner chain">
      <span className="mode-tag chain"><span className="dot" />Chế độ: Blockchain</span>
    </div>
  );
}
