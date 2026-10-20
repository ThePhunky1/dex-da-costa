# Oxley markets

`/oxley` supports direct-wallet buys and sells on Elysium testnet (99801), using
Oxley's existing curve. There is no new Dex Da Costa contract or LP pool.
Oxy-USDC is a distinct six-decimal test asset; it is not the bridged USDC in the
V2 pools. Native HYPE pays gas only. Auctions, launch creation, and mainnet are
outside this integration.

## Deployment and discovery

The SDK is pinned to `@oxley/sdk@0.5.0-next.4`. Its bundled manifest pins runtime
hashes for curve `0x18bf92514c0d749a017aaf69153442703e1a966b`, registry and Oxy-USDC.
Viem is overridden to the application's existing 2.56.9 to avoid incompatible
copies of its TypeScript definitions; integration tests exercise this combination.

On October 19 (US Eastern), the public auction catalog returned older markets
that the current deployment rejected. We therefore use onchain activation events
rather than presenting those entries as tradable. The checked-in market snapshot
contains six registered markets from a full scan starting at deployment block
5451974. Names and symbols are untrusted display labels, never identifiers.

`node scripts/oxley-markets.mjs` regenerates the snapshot through head minus 20
blocks. It is read-only. Review and commit the resulting JSON. The UI displays
its date and offers incremental discovery from the saved canonical block/hash
cursor. A user-started traversal continues sequentially in SDK-sized 10,000-block
pages, with two seconds between pages. Discovery failure retains the saved list
and displays an error. A reorganized checkpoint fails closed; regenerate the
snapshot if needed. Every selected market is independently revalidated onchain.

## Execution

Only wallet-connected, current-chain quotes enable trading. The SDK verifies the
runtime hashes, registry/controller/token bindings, active status, 18-decimal coin,
and six-decimal quote asset through the configured public RPC. No hosted quote
or backend minimum is used. Fee output is already included, normally 2%, and is
shown in Oxy-USDC. These trades earn no Dex Da Costa V2 LP fees.

Quotes expire in the UI after 60 seconds. The actual reviewed minimum is preserved
through SDK simulation; refreshed prices never silently lower it. Signed swaps
expire after five minutes. Each click sends at most one transaction: a zero-first
allowance reset if necessary, an exact approval, or the swap. After approval the
user reviews a fresh quote and clicks again. Direct calls retain the wallet as
output recipient and Oxley buying-reward identity. No reward payout is promised.

Pending hashes and unknown wallet-request outcomes persist in local storage;
reload does not resubmit. Confirmations can be checked via the explorer and the
Check confirmation button. A wallet timeout with no hash remains blocked until
the user checks their wallet activity. Only explicit wallet rejection clears an
unknown request automatically. Keep the same browser/storage until reconciled.

## Validation

- `npm test`: quote expiry, exact approvals, slippage floor, simulation gate,
  pending-state parsing and rejection discrimination, plus existing tests.
- `npm run test:oxley`: isolated browser RPC/wallet simulation exercises buys,
  sells, exact approval amounts, signed minimum, mobile layout, failed quotes,
  invalid input and reload recovery. Fixtures contain public runtime bytecode
  matching the SDK pins; they are not wallet keys or live endpoints.
- Existing Foundry and browser suites remain required in CI.
- `scripts/oxley-markets.mjs` verifies the live manifest and active markets without
  sending transactions. Browser tests simulate settlement, not a funded testnet swap.

Sources: https://oxley.fun/docs/builders and
https://github.com/greenpeez/oxley-sdk/blob/main/docs/provider-handoff.md
