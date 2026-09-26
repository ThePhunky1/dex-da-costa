# Contract design and limits

This is an experimental personal testnet project. Reusing established components does not constitute an audit of this integration or a mainnet-readiness claim.

## Upstream rather than rewritten AMM math

- `@uniswap/v2-core@1.0.1`: original factory, pair, LP ERC-20, square-root minting, locked minimum liquidity, reserve accounting, reentrancy lock, and balance-adjusted constant-product check.
- `@uniswap/v2-periphery@1.1.0-beta.0`: original Router02, safe transfer helpers, deadlines, minimum swap output, liquidity ratio matching, native wrapping/unwrapping and HYPE refunds.
- Original WETH9 from the periphery package; no custom wrapped-token accounting.
- Sources and package integrity digests are pinned by `package-lock.json`. `scripts/compile-contracts.mjs` compiles the actual upstream `.sol` files with solc 0.5.16 / 0.6.6, respectively. The Foundry harness uses 0.8.30 and deploys those artifacts, so tests exercise the same creation bytecode as the deployment script.
- **Only source transformation:** the `UniswapV2Library` pair init-code hash is replaced with `keccak256` of the pair bytecode produced by the pinned local build. This is required when compiler/settings/metadata differ from upstream's published deployment. Factory/pair/router logic is otherwise unchanged. Generated `contracts/artifacts/build-info.json` records compiler versions, settings, hash and exact transformed library. Generated artifacts are not committed; rebuild from pinned dependencies.
- Factory `feeToSetter` is zero at creation, so no account can enable a protocol fee. The 0.30% swap fee accrues to LPs. There is no upgrade, pause, rescue, or owner withdrawal added by this project.
- The UI exposes one pool. The upstream factory/router retain their general-purpose interfaces; it is not a token-restricted factory.

## Client protections

All transaction amounts, output quotes, minima and liquidity calculations use integer base units. Excess decimal precision, negative values and scientific notation are rejected. Slippage presets are 0.1%, 0.5% and 1%; trades over 5% quoted price impact are disabled. Price impact excludes the 0.30% fee. The displayed pool quote is not an independent oracle or fair-price estimate.

Approvals request the entered amount, not unlimited allowances, and require a separate action before trading. An approval is not automatically followed by a swap. Router refunds may leave a remaining approval; users can revoke it with their wallet. Every write is simulated first, checks the wallet chain, and waits for a successful receipt. Minimum outputs are computed from the displayed quote, so intervening price movement cannot silently lower them. Deadlines use current chain timestamp plus 20 minutes.

Wallet connection supports injected browser wallets, including discovery through wagmi. QR/mobile WalletConnect is not configured and no third-party project ID is required. RPC reads use a fixed configured chain, validate its chain ID, and reject old blocks. Failed/loading/stale pool reads disable actions. The UI reserves 0.001 HYPE for native-input transactions; this is a conservative UI buffer, not a guaranteed gas estimate.

The first LP selects the initial price and acknowledges it in the UI. Liquidity deposits match pool ratios; initial LP issuance locks 1,000 base units permanently. Tiny deposits can round down/revert. Impermanent loss and sandwich/MEV exposure remain. Minimum received is protection against execution below the chosen tolerance, not protection against all MEV.

## Known boundaries

Only the verified standard-transfer test USDC is supported by the frontend. Rebasing/fee-on-transfer tokens are not a supported extension. Bridge token controls, chain sequencer/bridge trust, token freezes and network resets are outside the AMM. WETH9 uses its established withdrawal implementation; router operations must be checked for any unusual smart-wallet recipient behavior. Keys never enter the website or project configuration. Testnet deployment uses an encrypted Foundry keystore or hardware wallet.

Tests cover two-way swaps, fee formula, slippage, deadline, approval requirements, LP issuance/removal, refunds, duplicate pairs, insufficient repayment and flash-callback reentrancy. Fuzz tests cover swap amounts and LP round trips; the stateful invariant handler exercises sequences of swaps and checks reserve backing and nondecreasing k. Browser tests use only unlocked local Anvil accounts to exercise the UI; they do not establish compatibility with every browser wallet or public testnet conditions.
