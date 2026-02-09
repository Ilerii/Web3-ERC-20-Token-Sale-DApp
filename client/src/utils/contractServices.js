import Token_ABI from "./Token_ABI.json";
import TokenSale_ABI from "./TokenSale_ABI.json";
import {
  BrowserProvider,
  Contract,
  parseEther,
  parseUnits,
  formatEther,
  formatUnits,
} from "ethers";
import {
  TOKENSALE_CONTRACT_ADDRESS,
  TOKEN_CONTRACT_ADDRESS,
  TARGET_CHAIN_ID_HEX,
  CHAIN_PARAMS,
} from "./constants";

// Module-level variables to store provider, signer, and contract
let provider;
let signer;
let tokenSaleContract;
let tokenContract;

// Function to initialize the provider, signer, and contract instances
const initialize = async () => {
  if (provider && signer && tokenSaleContract && tokenContract) return;
  if (typeof window !== "undefined" && typeof window.ethereum !== "undefined") {
    provider = new BrowserProvider(window.ethereum);
    signer = await provider.getSigner();
    tokenSaleContract = new Contract(
      TOKENSALE_CONTRACT_ADDRESS,
      TokenSale_ABI.abi ?? TokenSale_ABI,
      signer
    );
    tokenContract = new Contract(
      TOKEN_CONTRACT_ADDRESS,
      Token_ABI.abi ?? Token_ABI,
      signer
    );
  } else {
    throw new Error("Web3 provider not found. Please install MetaMask.");
  }
};

// Initialize once when the module is loaded
void initialize();

// Function to request single account
export const requestAccount = async () => {
  try {
    await initialize();
    await ensureCorrectNetwork();
    const accounts = await provider.send("eth_requestAccounts", []);
    return accounts[0]; // Return the first account
  } catch (error) {
    console.error("Error requesting account:", error.message);
    return null;
  }
};

// Ensure wallet is on the correct network
export const ensureCorrectNetwork = async () => {
  await initialize();
  try {
    const chainId = await provider.send("eth_chainId", []);
    if (chainId?.toLowerCase() !== TARGET_CHAIN_ID_HEX.toLowerCase()) {
      try {
        await provider.send("wallet_switchEthereumChain", [
          { chainId: TARGET_CHAIN_ID_HEX },
        ]);
      } catch (switchError) {
        // 4902: Unrecognized chain
        if (switchError?.code === 4902) {
          await provider.send("wallet_addEthereumChain", [CHAIN_PARAMS]);
          await provider.send("wallet_switchEthereumChain", [
            { chainId: TARGET_CHAIN_ID_HEX },
          ]);
        } else {
          throw switchError;
        }
      }
    }
  } catch (e) {
    console.error("Network switch failed:", e);
    throw e;
  }
};
// Function to get contract balance in ETH
export const getContractBalanceInETH = async () => {
  await initialize();
  await ensureCorrectNetwork();
  const balanceWei = await provider.getBalance(TOKENSALE_CONTRACT_ADDRESS);
  const balanceEth = formatEther(balanceWei); // Convert Wei to ETH string
  return balanceEth;
};

// Get user's native balance in ETH
export const getUserNativeBalance = async (address) => {
  await initialize();
  await ensureCorrectNetwork();
  const bal = await provider.getBalance(address);
  return formatEther(bal);
};

// Get user's token balance (formatted string)
export const getTokenBalanceOf = async (address) => {
  await initialize();
  await ensureCorrectNetwork();
  const [bal, decimals] = await Promise.all([
    tokenContract.balanceOf(address),
    tokenContract.decimals(),
  ]);
  return formatUnits(bal, decimals);
};

// Get sale contract ETH balance (BigInt and formatted)
export const getSaleEthBalance = async () => {
  await initialize();
  await ensureCorrectNetwork();
  const wei = await provider.getBalance(TOKENSALE_CONTRACT_ADDRESS);
  return { wei, eth: formatEther(wei) };
};

// Prices
export const getPrices = async () => {
  await initialize();
  await ensureCorrectNetwork();
  const [buyPrice, sellPrice] = await Promise.all([
    tokenSaleContract.buyPrice(),
    tokenSaleContract.sellPrice(),
  ]);
  return { buyPrice, sellPrice };
};

// Supply info and availability
export const getTokenSupplyInfo = async () => {
  await initialize();
  await ensureCorrectNetwork();
  const [max, total, reserve] = await Promise.all([
    tokenContract.MAX_SUPPLY(),
    tokenContract.totalSupply(),
    tokenContract.balanceOf(TOKENSALE_CONTRACT_ADDRESS),
  ]);
  return { maxSupply: max, totalSupply: total, saleReserve: reserve };
};

export const getAvailableToBuy = async () => {
  await ensureCorrectNetwork();
  const { maxSupply, totalSupply, saleReserve } = await getTokenSupplyInfo();
  const remainingToMint = maxSupply - totalSupply;
  return saleReserve + remainingToMint;
};

// Function to deposit funds to the contract
export const depositFund = async (depositValue) => {
  await initialize();
  await ensureCorrectNetwork();
  if (!depositValue || Number(depositValue) <= 0) {
    throw new Error("Invalid amount");
  }
  const ethValue = parseEther(depositValue);
  // Send ETH directly to the TokenSale contract to trigger receive() purchase
  const tx = await signer.sendTransaction({
    to: TOKENSALE_CONTRACT_ADDRESS,
    value: ethValue,
  });
  await tx.wait();
};

// Alias for clarity
export const buyWithETH = depositFund;

// Buy exact token amount (decimal string) using buyPrice
export const buyExactTokens = async (tokenAmountDecimal) => {
  await initialize();
  await ensureCorrectNetwork();
  if (!tokenAmountDecimal || Number(tokenAmountDecimal) <= 0) {
    throw new Error("Invalid token amount");
  }
  const decimals = await tokenContract.decimals();
  const amount = parseUnits(tokenAmountDecimal, decimals);
  const { buyPrice } = await getPrices();
  // cost = amount * price / 1e18
  const cost = (amount * buyPrice) / 10n ** 18n;
  const tx = await tokenSaleContract.buyTokens(amount, { value: cost });
  await tx.wait();
};

// Function to withdraw funds from the contract
export const withdrawFund = async () => {
  await initialize();
  await ensureCorrectNetwork();
  // Withdraw full ETH balance (owner only)
  const balanceWei = await provider.getBalance(TOKENSALE_CONTRACT_ADDRESS);
  if (balanceWei === 0n) {
    throw new Error("No ETH balance to withdraw");
  }
  const tx = await tokenSaleContract.withdrawETH(balanceWei);
  await tx.wait();
};

// Sell tokens for ETH (decimal string amount)
export const sellTokens = async (tokenAmountDecimal) => {
  await initialize();
  await ensureCorrectNetwork();
  if (!tokenAmountDecimal || Number(tokenAmountDecimal) <= 0) {
    throw new Error("Invalid token amount");
  }
  const [decimals, { sellPrice }] = await Promise.all([
    tokenContract.decimals(),
    getPrices(),
  ]);
  const amount = parseUnits(tokenAmountDecimal, decimals);
  const refund = (amount * sellPrice) / 10n ** 18n;
  const saleEth = await provider.getBalance(TOKENSALE_CONTRACT_ADDRESS);
  if (saleEth < refund) {
    throw new Error("Sale contract lacks sufficient ETH for refund");
  }
  const user = await signer.getAddress();
  const allowance = await tokenContract.allowance(user, TOKENSALE_CONTRACT_ADDRESS);
  if (allowance < amount) {
    const approveTx = await tokenContract.approve(TOKENSALE_CONTRACT_ADDRESS, amount);
    await approveTx.wait();
  }
  const tx = await tokenSaleContract.sellTokens(amount);
  await tx.wait();
};

// Calculators for UI previews
export const calculateBuyCost = async (tokenAmountDecimal) => {
  await initialize();
  await ensureCorrectNetwork();
  const decimals = await tokenContract.decimals();
  const amount = parseUnits(tokenAmountDecimal || "0", decimals);
  const { buyPrice } = await getPrices();
  const wei = (amount * buyPrice) / 10n ** 18n;
  return { wei, eth: formatEther(wei) };
};

export const calculateSellRefund = async (tokenAmountDecimal) => {
  await initialize();
  await ensureCorrectNetwork();
  const decimals = await tokenContract.decimals();
  const amount = parseUnits(tokenAmountDecimal || "0", decimals);
  const { sellPrice } = await getPrices();
  const wei = (amount * sellPrice) / 10n ** 18n;
  return { wei, eth: formatEther(wei) };
};
