# HYPE / USDC price monitoring and simulation

The existing V2 pool is not pegged to mainnet. The website displays its reserve price and warns at a 5% or greater deviation from a fresh mainnet reference. Stale/failed reads suppress the comparison. This is information, not a restriction on direct contract trading, and adds no new polling. Adding proportional liquidity cannot correct the reserve ratio.

## Run a read-only observation

After `npm ci`, from the repository root:

```sh
npm run rebalance:simulate
```

This reads the pinned Elysium testnet deployment (chain 99801) and Hyperliquid HYPE/USDC spot reference. It validates deployment identities, token metadata, and pool block freshness. It prints a JSON report; no wallet or private key is needed. There is no broadcast mode, signer, approval, or transaction submission code.

Defaults are **hypothetical** inventory of 10 HYPE and 1,000 USDC, input limits of 1 HYPE or 100 USDC per observation, and a 0.001 HYPE gas reserve. Customize without credentials:

```sh
SIM_HYPE_INVENTORY=20 SIM_USDC_INVENTORY=2000 SIM_MAX_HYPE=2 SIM_MAX_USDC=200 npm run rebalance:simulate
```

`ELYSIUM_RPC_URL` optionally selects a trusted RPC. Keep any credential-bearing URL in your shell environment, not a committed file. RPC exceptions are deliberately sanitized. No automatic polling or Vercel function is added. For machine-readable history, invoke `npm run --silent rebalance:simulate >> /tmp/dex-rebalance-observations.json` (each report is formatted JSON, so use a JSON stream parser rather than a line parser).

## Interpret the report

- `within-band`: current reserve price is within 5% of the reference; do nothing.
- `simulated`: hypothetical inventory and per-observation cap allow the modeled trade to reach the reference.
- `budget-limited`: shows the partial correction possible with the cap/inventory, plus full `requiredInput`.
- `insufficient-budget`: no input can be spent while respecting inventory and gas reserve.

The model uses integer token units, the V2 0.30% fee, and full input added to reserves. It searches for the smallest input reaching the reference. Gas cost, concurrent trades, transaction ordering, MEV and slippage are not modeled. Tiny rounding can cross the reference by one input unit. Required input is for a single correction, not an estimate of ongoing funding. Each observation starts from the stated hypothetical budget; this is not a persistent paper portfolio or backtest.

The reference has one source. A successful simulation is **not approval or readiness for automated execution**. Before any funded bot: add an independent identity-verified reference and disagreement cutoff, persistent daily spend limits and inventory accounting, fresh pre-trade simulation, execution slippage/impact limits, failure cooldowns, monitoring and an emergency stop. Use a dedicated limited testnet wallet and explicitly authorize funding and signing separately. Never use the website operator's personal wallet.

Maintaining a mainnet-like price consumes inventory and can subsidize traders with freely obtainable test tokens. It cannot guarantee a peg. Existing LP positions are not migrated or modified by this feature.
