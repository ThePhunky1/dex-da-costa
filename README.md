# Dex Da Costa

A minimal HYPE ↔ USDC exchange for **Kinetiq's Elysium testnet**. Personal project; no GlobalStake affiliation or branding. Named Dex Da Costa, inspired by Max Da Costa from Elysium.

Built with upstream Uniswap V2 factory/pair/router and WETH9, Foundry tests/deployment, and Next.js + TypeScript + wagmi/viem. Includes swaps, liquidity deposits/withdrawals, transferable LP tokens, native HYPE wrapping, explicit approvals, balances, price impact, minimum outputs, deadlines, and an initial-liquidity acknowledgement. Contract deployment and website hosting are pending. Source repository: https://github.com/ThePhunky1/dex-da-costa.

## Start locally

Prerequisites: Node.js 22 LTS recommended (minimum 20.9), npm, and [Foundry](https://getfoundry.sh/) v1.8.3. No wallet/private key is needed to build or run tests.

```sh
npm ci
npm run contracts:build
npm run contracts:test
npm test
npm run typecheck
npm run build
cp web/.env.example web/.env.local
npm run dev
```

Open `http://127.0.0.1:3000`. With no router configured the app shows a deployment-pending state and disables transactions. Use an injected wallet such as MetaMask or Rabby for real wallet connection. Network settings are built in. QR WalletConnect is not included.

The original V2 compilers are pinned npm dependencies; Foundry automatically fetches solc 0.8.30 for the harness. `npm run contracts:build` generates bytecode/ABIs in `contracts/artifacts/`; do this before any Foundry command that deploys V2 artifacts. The pair init-code hash is generated and passed into the router library automatically. Do not mix artifacts from different builds.

## Local end-to-end demo (no public-chain transactions)

In a separate terminal:

```sh
anvil --host 127.0.0.1 --port 8545 --block-time 1 --silent
```

Then, from the project root:

```sh
npm run contracts:build
(cd contracts && forge build)
npm run demo:seed
npm run dev
```

The seed script requires chain ID 31337 on loopback. It creates a wrapper, factory, router, mock USDC and a 100 HYPE / 2,000 mock USDC pool on **your local Anvil only**, using its unlocked test account. It writes public local addresses to ignored `web/.env.local` and refuses to overwrite non-local settings. Do not import real keys into Anvil. Restart the frontend after changing environment settings.

Automated browser checks inject a local-only test wallet:

```sh
npx playwright install chromium
npm run test:e2e
```

The test runner builds and starts a production frontend on port 3100. Keep Anvil running and seed it first. Local test assets are distinct from the verified Elysium USDC. When done, stop Anvil and restore testnet frontend settings with `cp web/.env.example web/.env.local`.

## Network and assets

Read [the verification report](docs/NETWORK.md) and [the security/design notes](docs/SECURITY.md) before configuring a deployment.

- Chain ID **99801**, native gas **HYPE**, RPC `https://testnet-rpc.elysium.kinetiq.xyz`.
- Bridged test USDC **`0x7D29d8047B905000459c0E80c34a26CeedcB47b2`**, **6 decimals**, verified against the official bridge's registry and live mapping to its HyperEVM testnet original.
- Official bridge-listed WHYPE is a **bridged token**. This project deploys its own unmodified WETH9 as the native-HYPE wrapper; the router handles wrapping automatically. The legacy wrapper's on-chain symbol remains WETH.
- A public faucet for this exact USDC ERC-20 was not verified. Obtain it from a holder/Kinetiq, or bridge the exact parent token after verifying the route. Do not use mainnet USDC or assume HyperCore faucet USDC is the same ERC-20.

```sh
npm run verify:network
# Optional: refresh the checked-in, public read-only evidence snapshot.
npm run verify:network -- --save
```

## Deployment preparation and approval boundary

**No broadcast, repository creation or push should occur without the user's explicit approval.** These commands document the operator workflow; they were not broadcast during development. Do not put a private key in `.env` or pass one on a command line. Choose a funded testnet account in an encrypted Foundry keystore or use hardware-wallet options.

1. Review network verification, compiler output and tests. Obtain test HYPE for deployment and test USDC for later pool funding. Read `.env.example`, copy it to `.env`, set `DEPLOYER` to the public address, and set `CONFIRM_TESTNET_ASSETS=true` only after verification. Load those non-secret variables into your shell.
2. Dry-run with your existing keystore account (no `--broadcast`):

```sh
npm run contracts:build
cd contracts
forge script script/Deploy.s.sol:Deploy \
  --rpc-url "$ELYSIUM_RPC_URL" --chain-id 99801 \
  --account elysium-testnet --sender "$DEPLOYER" -vvvv
```

3. Review the four creations (WETH9 wrapper, V2 factory, Router02, HYPE-wrapper/USDC pair), estimated gas, USDC provenance, and deployment event. Initial liquidity is **not** supplied by the script. Obtain explicit approval for this concrete deployment and its cost.
4. **After approval only**, repeat the exact reviewed command with `--broadcast`. Do not reuse an unrelated saved broadcast file. Record wrapper/factory/router/pair addresses and receipts. The factory is created with a zero fee setter, permanently disabling protocol fees.
5. Perform post-deployment checks using `ROUTER_ADDRESS=... npm run verify:deployment` from the root. This verifies runtime bytecode, constructor wiring, factory lookup, wrapper and token pair identities, chain ID, and fee configuration. Explorer verification can use generated standard-json inputs from `contracts/artifacts/`; the explorer's current submission/API support must be checked at deployment time.
6. Set only `NEXT_PUBLIC_ROUTER_ADDRESS` in `web/.env.local`, keep local-demo mode false, then rebuild/restart. All other testnet token/network identifiers are already fixed. Add an intentionally chosen initial HYPE/USDC ratio through the UI after approving USDC. Start with small test amounts, then exercise swap and full withdrawal.

The testnet script refuses other chain IDs and checks USDC bytecode, decimals and parent identity. Onchain liquidity/swaps remain disabled until these addresses are configured. Public deployment, public wallet testing, funding and explorer source verification remain pending.

## Project map

- `contracts/src/Interfaces.sol`: shared Solidity interfaces.
- `contracts/test/Dex.t.sol`: actual V2 artifact integration, fuzz and invariant tests; local mock token.
- `contracts/script/Deploy.s.sol`: Elysium-only deployment with native wrapper.
- `scripts/compile-contracts.mjs`: reproducible upstream compilation and init-code hash reconciliation.
- `web/`: Next.js app, integer quote math, provider/network configuration, approval and transaction flows.
- `scripts/verify-network.mjs`: read-only asset provenance checks.
- `scripts/verify-deployment.mjs`: read-only deployment integrity checks.
- `e2e/`: local browser wallet flows and mobile layout check.
- `.github/workflows/checks.yml`: contracts, math, types, production build and production dependency audit.

## GitHub preparation

The lockfile, GPL license, dependency notices, CI, example environments and ignore rules are included. Generated builds, caches, broadcast records, local addresses, logs and environment files are ignored. The owner approved publication to the public personal repository `ThePhunky1/dex-da-costa`. Review staged changes before subsequent pushes. Never add private keys, seed phrases or real `.env` files.

This integration is testnet-only and has not had an independent security audit. See [validation results](docs/VALIDATION.md) for exactly what was exercised and what remains external.

## Market reference and publishing

The market card uses Hyperliquid’s public mainnet HYPE/USDC spot API. It is an informational midpoint, not an execution oracle. Swap output is calculated from this testnet pool’s reserves and 0.30% fee; the first liquidity deposit establishes its starting price. The API is cached briefly and unavailable/stale data is hidden. Testnet assets do not inherit mainnet value.

See [hosting instructions](docs/HOSTING.md) for GitHub and Vercel publication, and [artwork provenance](docs/ARTWORK.md).
