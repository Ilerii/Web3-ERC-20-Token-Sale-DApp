import React, { useEffect, useState } from "react";
import { parseUnits } from "ethers";
import {
  buyWithETH,
  buyExactTokens,
  sellTokens,
  getPrices,
  calculateBuyCost,
  calculateSellRefund,
  getAvailableToBuy,
  getSaleEthBalance,
} from "../utils/contractServices";
import { toast } from "react-toastify";

function ContractActions() {
  const [ethToSpend, setEthToSpend] = useState("");
  const [tokensToBuy, setTokensToBuy] = useState("");
  const [tokensToSell, setTokensToSell] = useState("");
  const [quotes, setQuotes] = useState({ buyEthCost: "-", sellEthRefund: "-" });
  const [prices, setPrices] = useState({ buyPrice: null, sellPrice: null });
  const [availableToBuy, setAvailableToBuy] = useState(null);
  const [saleEth, setSaleEth] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [p, avail, sale] = await Promise.all([
          getPrices(),
          getAvailableToBuy(),
          getSaleEthBalance(),
        ]);
        setPrices(p);
        setAvailableToBuy(avail);
        setSaleEth(sale.eth);
      } catch (e) {
        // ignore until wallet connected/network set
      }
    };
    load();
  }, []);

  useEffect(() => {
    const updateBuyQuote = async () => {
      if (!tokensToBuy) return setQuotes((q) => ({ ...q, buyEthCost: "-" }));
      try {
        const { eth } = await calculateBuyCost(tokensToBuy);
        setQuotes((q) => ({ ...q, buyEthCost: eth }));
      } catch (_) {
        setQuotes((q) => ({ ...q, buyEthCost: "-" }));
      }
    };
    updateBuyQuote();
  }, [tokensToBuy]);

  useEffect(() => {
    const updateSellQuote = async () => {
      if (!tokensToSell) return setQuotes((q) => ({ ...q, sellEthRefund: "-" }));
      try {
        const { eth } = await calculateSellRefund(tokensToSell);
        setQuotes((q) => ({ ...q, sellEthRefund: eth }));
      } catch (_) {
        setQuotes((q) => ({ ...q, sellEthRefund: "-" }));
      }
    };
    updateSellQuote();
  }, [tokensToSell]);

  const handleBuyWithETH = async () => {
    try {
      await buyWithETH(ethToSpend);
      toast.success("Purchase successful");
      setEthToSpend("");
    } catch (error) {
      toast.error(error?.shortMessage || error?.message || "Failed to buy");
    }
  };

  const handleBuyExact = async () => {
    try {
      await buyExactTokens(tokensToBuy);
      toast.success("Purchase successful");
      setTokensToBuy("");
    } catch (error) {
      toast.error(error?.shortMessage || error?.message || "Failed to buy");
    }
  };

  const handleSell = async () => {
    try {
      await sellTokens(tokensToSell);
      toast.success("Sale successful");
      setTokensToSell("");
    } catch (error) {
      toast.error(error?.shortMessage || error?.message || "Failed to sell");
    }
  };

  const disableExactBuy = (() => {
    if (!availableToBuy || !tokensToBuy) return false;
    try {
      // Compare in base units using 18 decimals
      const requested = parseUnits(tokensToBuy, 18);
      return requested > availableToBuy;
    } catch {
      return false;
    }
  })();

  return (
    <div className="stack">
      <h2 className="section-title">Buy Tokens</h2>
      <div className="actions-row">
        <input
          className="input"
          type="text"
          value={ethToSpend}
          onChange={(e) => setEthToSpend(e.target.value)}
          placeholder="ETH to spend"
        />
        <button className="btn" onClick={handleBuyWithETH}>Buy via ETH</button>
      </div>
      <div className="actions-row">
        <input
          className="input"
          type="text"
          value={tokensToBuy}
          onChange={(e) => setTokensToBuy(e.target.value)}
          placeholder="Tokens to buy"
        />
        <button className="btn" onClick={handleBuyExact} disabled={disableExactBuy}>
          Buy Exact Tokens
        </button>
      </div>
      <dl className="kpi">
        <dt>Estimated Cost</dt>
        <dd>{quotes.buyEthCost} ETH</dd>
        <dt>Available To Buy (base)</dt>
        <dd>{availableToBuy?.toString?.() ?? "-"}</dd>
      </dl>

      <h2 className="section-title">Sell Tokens</h2>
      <div className="actions-row">
        <input
          className="input"
          type="text"
          value={tokensToSell}
          onChange={(e) => setTokensToSell(e.target.value)}
          placeholder="Tokens to sell"
        />
        <button className="btn" onClick={handleSell}>Sell Tokens</button>
      </div>
      <dl className="kpi">
        <dt>Estimated Refund</dt>
        <dd>{quotes.sellEthRefund} ETH</dd>
        <dt>Sale Contract ETH</dt>
        <dd>{saleEth ?? "-"}</dd>
      </dl>
      <div className="muted" style={{ fontSize: 12 }}>
        <div>Buy Price (wei/token): {prices.buyPrice?.toString?.() ?? "-"}</div>
        <div>Sell Price (wei/token): {prices.sellPrice?.toString?.() ?? "-"}</div>
      </div>
    </div>
  );
}

export default ContractActions;
