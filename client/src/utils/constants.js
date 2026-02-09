export const TOKEN_CONTRACT_ADDRESS = "0x829b714f4492c668023f04fffe24cc491a4d7d57";
export const TOKENSALE_CONTRACT_ADDRESS = "0x4dfe6171d0edca008eb1e79476b5ebebc1bb8c32";

// Target chain configuration (example: Sepolia)
export const TARGET_CHAIN_ID_DEC = 11155111;
export const TARGET_CHAIN_ID_HEX = "0xaa36a7"; // 11155111 in hex
export const CHAIN_PARAMS = {
  chainId: TARGET_CHAIN_ID_HEX,
  chainName: "Sepolia Test Network",
  nativeCurrency: { name: "Sepolia ETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};
