import React, { useEffect, useState } from "react";
import {
  getContractBalanceInETH,
  getUserNativeBalance,
  getTokenBalanceOf,
  getPrices,
} from "../utils/contractServices";

function ContractInfo({ account }) {
  const [saleEthBalance, setSaleEthBalance] = useState(null);
  const [userEthBalance, setUserEthBalance] = useState(null);
  const [userTokenBalance, setUserTokenBalance] = useState(null);
  const [prices, setPrices] = useState({ buyPrice: null, sellPrice: null });

  useEffect(() => {
    const fetchBalance = async () => {
      const balanceInETH = await getContractBalanceInETH();
      setSaleEthBalance(balanceInETH);
    };
    fetchBalance();
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      if (!account) return;
      const [eth, token] = await Promise.all([
        getUserNativeBalance(account),
        getTokenBalanceOf(account),
      ]);
      setUserEthBalance(eth);
      setUserTokenBalance(token);
    };
    fetchUser();
  }, [account]);

  useEffect(() => {
    const loadPrices = async () => {
      const p = await getPrices();
      setPrices(p);
    };
    loadPrices();
  }, []);

  return (
    <div className="stack">
      <h3 className="section-title">Account</h3>
      <dl className="kpi">
        <dt>Address</dt>
        <dd className="muted" style={{ overflowWrap: "anywhere" }}>{account ?? "Not connected"}</dd>
        <dt>Your ETH</dt>
        <dd>{userEthBalance ?? "-"}</dd>
        <dt>Your Token</dt>
        <dd>{userTokenBalance ?? "-"}</dd>
        <dt>Sale ETH</dt>
        <dd>{saleEthBalance ?? "-"}</dd>
        <dt>Buy Price (wei/token)</dt>
        <dd>{prices.buyPrice?.toString?.() ?? "-"}</dd>
        <dt>Sell Price (wei/token)</dt>
        <dd>{prices.sellPrice?.toString?.() ?? "-"}</dd>
      </dl>
    </div>
  );
}

export default ContractInfo;
