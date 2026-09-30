# Elysium testnet markets

Only direct V2 pairs against native HYPE or USDC are supported. No multi-hop routing or assumed price peg. The existing deployed factory/router is reused; adding first liquidity creates a missing pair atomically. Native HYPE uses the router's existing wrapper, not a separately branded WHYPE token.

## Sources and verification (2026-09-29)

Official sources:
- https://elysium.kinetiq.xyz/testnet-bridge (parent token configuration)
- https://elysium.kinetiq.xyz/testnet-explorer (token representations and icons)
- https://elysium.kinetiq.xyz/docs/bridging-hyperevm-tokens-to-elysium (canonical gateway mapping)

Use `node scripts/verify-tokens.mjs` to repeat read-only checks. It checks chains 998/99801, calls the official parent router `calculateL2TokenAddress`, and checks child code, symbol, decimals and `l1Address`. The dated JSON alongside this document records the results. Names in an explorer alone are not sufficient evidence of token identity.

| Token | Elysium testnet address | Decimals | Status |
|---|---|---|---|
| PURR | 0x5688c9Ca58435Ee982c16cCBE05eAC6993e32Bdd | 18 | Verified, enabled |
| kHYPE | 0xd63d373D3a529fA935C2e3B470dbB394B0EDb56f | Expected 18 | No code at bridge-derived address; disabled |
| kmHYPE | 0x5218bE476C6197934A0aA89c39698d12058fe230 | 18 | Verified, enabled |
| KNTQ | 0xDb3d47D1C7aB037e1250d0b70EF077996af6f2ff | 18 | Reports MockTwoZero / MTWOZ; disabled |
| sKNTQ | 0xE51A294DD40D5887678A694F70C5C547788A8Add | Expected 18 | No code at bridge-derived address; disabled |

These are testnet representations, not mainnet staking or governance assets. Recheck team-confirmed addresses and canonical mappings before removing `unavailable` from the registry. Runtime metadata checks also pause a market if symbol or decimals do not match.

## Seeding liquidity

Choose a verified pair, connect on Elysium testnet, and select **Add liquidity**. An empty new-token pool requires both amounts and an explicit acknowledgement of the initial price. A populated pool calculates the other amount from reserves. HYPE/USDC retains its optional first-deposit mainnet reference; it is never applied to other tokens.

USDC/token pools require two exact-amount approvals, presented one at a time, before the deposit transaction. HYPE/token pools only approve the ERC-20. LP removal has its own approval. Keep HYPE for gas in every market. All signatures remain with the user's wallet; no pool is seeded by this update.

The dropdown includes 11 markets. Only HYPE/USDC, HYPE/PURR, USDC/PURR, HYPE/kmHYPE and USDC/kmHYPE are enabled. Empty pools cannot quote or execute swaps until funded. This release does not create or fund testnet pools automatically.
