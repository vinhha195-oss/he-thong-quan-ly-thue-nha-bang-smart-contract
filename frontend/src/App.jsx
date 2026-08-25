import { useState } from "react";
import { RentalProvider } from "./context/RentalContext.jsx";
import { useRental } from "./hooks/useRental.js";
import { TopBar } from "./components/TopBar.jsx";
import { ModeBanner } from "./components/ModeBanner.jsx";
import { Tabs } from "./components/Tabs.jsx";
import { PropertyForm } from "./components/PropertyForm.jsx";
import { PropertyList } from "./components/PropertyList.jsx";
import { HistoryTable } from "./components/HistoryTable.jsx";
import { TransactionDetailModal } from "./components/TransactionDetailModal.jsx";
import { Toast } from "./components/Toast.jsx";

function AppShell() {
  const {
    isMock, isConfigured, mockAccounts, switchMockAccount,
    account, properties, history, busy, toast,
    connect, disconnect, canSwitchWallet, switchWallet, listProperty,
  } = useRental();
  const [tab, setTab] = useState("browse");
  const [selectedTx, setSelectedTx] = useState(null);

  return (
    <div className="app">
      <TopBar
        account={account}
        onConnect={connect}
        onDisconnect={disconnect}
        onSwitchWallet={switchWallet}
        canSwitchWallet={canSwitchWallet}
      />

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
          <PropertyForm busy={busy} canSubmit={!!account} isMock={isMock} onSubmit={listProperty} />
        )}

        {tab === "browse" && (
          <PropertyList
            properties={properties}
            history={history}
            onSelectTx={setSelectedTx}
          />
        )}

        {tab === "history" && <HistoryTable history={history} onSelectTx={setSelectedTx} />}
      </main>

      <TransactionDetailModal event={selectedTx} onClose={() => setSelectedTx(null)} />
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
