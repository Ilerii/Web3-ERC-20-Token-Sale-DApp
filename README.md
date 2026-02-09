# Sepolia Fixed-Price ERC‑20 Token Sale DApp

Decentralized application that lets users buy and sell a capped ERC‑20 token for ETH on Sepolia at fixed prices. The sale contract uses token reserves first and mints on demand (via a MINTER_ROLE) to fulfill purchases. A React client (ethers v6) provides wallet connection, network auto-switch, live pricing, quotes, and buy/sell actions.

## Overview

- Contracts (Hardhat 3 + viem + OpenZeppelin):
  - `Token.sol`: ERC‑20 with 18 decimals, `MAX_SUPPLY` cap, and `MINTER_ROLE` via `AccessControlDefaultAdminRules`.
  - `TokenSale.sol`: Fixed `buyPrice`/`sellPrice` (wei per base unit), uses reserves or mints remainder, supports direct ETH purchases through `receive()`, and owner‑only price updates and withdrawals.
- Client (React + ethers v6):
  - Connects a Web3 wallet, ensures Sepolia network, shows balances/prices, previews quotes, buys via ETH or exact token amount, and sells tokens back for ETH.

## Architecture

- Contracts
  - `contract/contracts/Token.sol` — Capped ERC‑20 with role‑gated minting.
  - `contract/contracts/TokenSale.sol` — Ownable2Step + ReentrancyGuard sale with fixed pricing and buyback.
  - `contract/scripts/deploy.ts` — Deploys Token and TokenSale, grants `MINTER_ROLE` to TokenSale.
  - `contract/hardhat.config.ts` — Hardhat 3 Beta config with Sepolia network (dotenv).
- Client
  - `client/src/App.jsx` — Main layout; hooks wallet events and renders sections.
  - `client/src/components/` — Connect, info, and actions components.
  - `client/src/utils/contractServices.js` — Ethers v6 provider/signer and contract helpers.
  - `client/src/utils/constants.js` — Contract addresses and Sepolia chain params.


## Prerequisites

- Node.js 18+ and npm
- A wallet (e.g., MetaMask) with some Sepolia ETH for gas
- Sepolia RPC endpoint (e.g., Infura/Alchemy) and a funded deployer private key

## Setup & Deployment

1) Contracts — install, configure, deploy

```
cd contract
npm install

# Create .env with your credentials
cat > .env <<'EOF'
SEPOLIA_URL="https://sepolia.infura.io/v3/<YOUR_KEY>"
SECRET_KEY="0x<YOUR_PRIVATE_KEY>"   # deployer private key
EOF

# Compile and deploy
npx hardhat compile
npx hardhat run scripts/deploy.ts --network sepolia
```

The deploy script prints the addresses, e.g.:

```
Token deployed at: 0x...TOKEN
TokenSale deployed at: 0x...SALE
Granted MINTER_ROLE to TokenSale
```

2) Client — configure addresses, install, run

Edit `client/src/utils/constants.js` and set:

```
export const TOKEN_CONTRACT_ADDRESS = "0x...TOKEN";
export const TOKENSALE_CONTRACT_ADDRESS = "0x...SALE";
```

Then start the app:

```
cd ../client
npm install
npm start
```

Open http://localhost:3000 and connect your wallet when prompted. The app will request to switch/add Sepolia if needed.



