import "./App.css";
import ConnectWalletButton from "./components/ConnectWalletButton";
import ContractInfo from "./components/ContractInfo";
import ContractActions from "./components/ContractActions";
import { requestAccount, ensureCorrectNetwork } from "./utils/contractServices";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import React, { useState, useEffect } from "react";

function App() {

  const [account, setAccount] = useState(null);

  useEffect(() => {
    const init = async () => {
      try {
        // Attempt to connect and ensure chain
        const acct = await requestAccount();
        setAccount(acct);
      } catch (_) {
        // user may reject; ignore
      }
    };
    init();
  }, []);

  useEffect(() => {
    const handleAccountChanged = (newAccounts) => {
      setAccount(newAccounts.length > 0 ? newAccounts[0] : null);
    };
    const handleChainChanged = async () => {
      try {
        await ensureCorrectNetwork();
      } catch (_) {}
    };
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", handleAccountChanged);
      window.ethereum.on("chainChanged", handleChainChanged);
    }
    return () => {
      window.ethereum?.removeListener("accountsChanged", handleAccountChanged);
      window.ethereum?.removeListener("chainChanged", handleChainChanged);
    };
  }, []);
  return (
    <div className="App">
      <div className="app-container">
        <h1 className="app-title">Token Sale DApp</h1>
        <div className="grid two">
          <div className="card section">
            <div className="row" style={{ justifyContent: "space-between" }}>
              <strong>Wallet</strong>
              <ConnectWalletButton setAccount={setAccount} />
            </div>
            <ContractInfo account={account} />
          </div>
          <div className="card section">
            <ContractActions />
          </div>
        </div>
        <ToastContainer position="bottom-right" />
      </div>
    </div>
  );
}

export default App;
