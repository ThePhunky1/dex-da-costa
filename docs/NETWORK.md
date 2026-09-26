# Elysium testnet verification

Checked directly against Kinetiq's official site and live JSON-RPC on **2026-09-25**. This is Kinetiq's HyperEVM-settled chain, not the unrelated Polkadot Elysium or Elys Network. The date/block-specific machine-readable evidence is in [network-verification.json](network-verification.json). Rerun `npm run verify:network` before deployment; it only performs reads.

## Official network configuration

| Item | Verified value |
| --- | --- |
| Chain | Elysium Testnet |
| Chain ID | `99801` (`0x185d9`) |
| RPC | `https://testnet-rpc.elysium.kinetiq.xyz` |
| Explorer | `https://elysium.kinetiq.xyz/testnet-explorer` |
| Native gas | HYPE, 18 decimals; no ERC-20 address |
| Settlement testnet | HyperEVM, chain `998` |
| Parent RPC | `https://rpc.hyperliquid-testnet.xyz/evm` |
| HYPE faucet | `https://elysium.kinetiq.xyz/testnet-faucet` |
| Bridge | `https://elysium.kinetiq.xyz/testnet-bridge` |

[Official building guide](https://elysium.kinetiq.xyz/docs/building-on-elysium) says ordinary Solidity, Foundry, viem and JSON-RPC work without chain-specific deployment interfaces. Gas is HYPE. No deployment allowlist or registration requirement is described. The optional HyperCore interfaces are not needed by this project. Legacy Istanbul bytecode is used for the V2 contracts, and Paris for the deployment/test harness, avoiding reliance on new opcodes. Actual public deployment/gas estimation has not been performed.

## Assets and provenance

| Asset | Address | Meaning |
| --- | --- | --- |
| Native HYPE | None | Native balance; native 1:1 bridge path |
| USDC on Elysium | `0x7D29d8047B905000459c0E80c34a26CeedcB47b2` | Bridge-listed testnet representation, 6 decimals |
| Original USDC on HyperEVM testnet | `0x2B3370eE501B4a559b57D449569354196457D8Ab` | Parent token returned by Elysium USDC's `l1Address()` |
| Bridge-listed WHYPE on Elysium | `0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234` | Bridged HyperEVM WHYPE, **not the native wrapper for this DEX** |
| Original WHYPE on HyperEVM testnet | `0x5555555555555555555555555555555555555555` | Parent returned by the bridge-listed WHYPE contract |
| Elysium gateway router | `0x89659883a9d980925733B0A698F117AAb65ac718` | Maps both original addresses to the representations above |
| HyperEVM gateway router | `0x1aAE2caD8B0249905492087EF230FcCEa3707C45` | Entry point for ERC-20 deposits |

The USDC/WHYPE addresses were found in the JavaScript token registry actually served by the [official bridge](https://elysium.kinetiq.xyz/testnet-bridge), asset `/_next/static/immutable/chunks/288iqdqlf4ii9.js` at verification time. This is supporting first-party application evidence, not a permanent documented API. We independently checked runtime code, `symbol()`, `decimals()`, `l1Address()`, `l2Gateway()`, and the router's `calculateL2TokenAddress(original)` on-chain. USDC's gateway was `0x30545d8b24185DdFe83E75aB6939f867b664e2E1`; WHYPE's was `0x1F8be963E0cf8315Fc703cF415bA642DfcAEeDEf`. Do not assume every token uses the standard gateway.

This verifies bridge representation provenance, **not Circle issuance, redeemability or monetary value**. Mainnet USDC addresses must not be substituted. HyperCore's mock USDC faucet is not proof of a freely transferable balance at this exact HyperEVM ERC-20 address.

## Native HYPE wrapping

[Official bridging documentation](https://elysium.kinetiq.xyz/docs/token-bridging-on-elysium) describes native HYPE moving as native value, with no wrapper. The separate WHYPE entry above represents an ERC-20 bridged from HyperEVM. A bridge representation must not be assumed to implement local native `deposit()` / `withdraw()` behavior.

We therefore deploy a separate, unmodified upstream **WETH9** contract for wrapping this chain's native HYPE. Its legacy on-chain name/symbol remain `Wrapped Ether` / `WETH` to avoid altering the upstream source; the UI labels the native asset HYPE and hides the wrapping step. It is a project wrapper, not a claim to be Elysium's canonical WHYPE. The router's `WETH()` must equal the newly deployed wrapper. Its `ETH`-named methods handle native HYPE on this chain.

## Getting test assets

1. Use the official Elysium faucet for native test HYPE. Availability/rate limits are controlled by the faucet.
2. Obtain the exact HyperEVM testnet USDC above from an existing holder or Kinetiq's testnet support. We did not verify a public faucet that dispenses this specific ERC-20.
3. If bridging it, follow the [official ERC-20 bridge guide](https://elysium.kinetiq.xyz/docs/bridging-hyperevm-tokens-to-elysium): resolve `getGateway(parentToken)`, approve that gateway, then call the parent router with native HYPE delivery fees. Do not approve the router in place of the gateway. The representation preserves parent decimals. Withdrawals use the original parent address and have a challenge/claim process.
4. Verify the received Elysium token address before seeding liquidity. The UI does not bridge or mint tokens for you.

No testnet tokens were acquired, no faucet was claimed, and no public transaction was sent during development. The local demonstration uses an explicitly named **MockUSDC** on Anvil only.
