import { useState } from "react";
import { RentalProvider } from "./context/RentalContext.jsx";
import { useRental } from "./hooks/useRental.js";
import { TopBar } from "./components/TopBar.jsx";
import { ModeBanner } from "./components/ModeBanner.jsx";
import { Tabs } from "./components/Tabs.jsx";
import { PropertyForm } from "./components/PropertyForm.jsx";
import { PropertyList } from "./components/PropertyList.jsx";
import { HistoryTable } from "./components/HistoryTable.jsx";
import { Toast } from "./components/Toast.jsx";

function AppShell() {
  const {
    isMock, isConfigured, mockAccounts, switchMockAccount,
    account, properties, history, busy, toast,
    connect, listProperty, rentProperty, payRent, confirmHandover, endLease,
  } = useRental();
  const [tab, setTab] = useState("browse");

  return (
    <div className="app">
      <TopBar account={account} onConnect={connect} />

      <ModeBanner
        isMock={isMock}
        isConfigured={isConfigured}
        mockAccounts={mockAccounts}
        account={account}
        onSwitchMockAccount={switchMockAccount}
      />

      <Tabs tab={tab} onChange={setTab} />

      <main>
        {tab === "list" && (
          <PropertyForm busy={busy} canSubmit={!!account} onSubmit={listProperty} />
        )}

        {tab === "browse" && (
          <PropertyList
            properties={properties}
            account={account}
            busy={busy}
            onRent={rentProperty}
            onPay={payRent}
            onHandover={confirmHandover}
            onEnd={endLease}
          />
        )}

        {tab === "history" && <HistoryTable history={history} />}
      </main>

      <Toast toast={toast} />
    </div>
  );
}

export default function App() {
  return (
    <RentalProvider>
      <AppShell />
    </RentalProvider>
  );
}
