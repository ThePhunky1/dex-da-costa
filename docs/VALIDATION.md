# Validation — 2026-09-25

## Passed locally

- Pinned upstream V2 factory/pair, Router02 and WETH9 compilation. Derived pair init-code hash: `0x5a2dc30108940dd053e5fe06fe4deb55d420828f787d508920ac29e08aed3ad9`.
- **16 Foundry tests**: 12 AMM integration/fuzz tests, 3 deployment-script tests and 1 stateful invariant test. Each fuzz test ran 512 cases. The invariant ran 128 sequences / 8,192 swaps with zero reverts and no reserve-backing or constant-product failures.
- **10 TypeScript tests**: five math tests covering decimal rejection, V2 quotes, minimum rounding, liquidity ratios and price impact; five market-reference tests covering exact asset identity, context matching, invalid prices, freshness and cache/failure behavior.
- TypeScript checking and optimized Next.js production build.
- `npm audit`: **zero reported vulnerabilities** after pinning patched development dependencies. This is dependency-advisory checking, not a contract audit.
- Read-only official testnet RPC verification of chain ID, block freshness, USDC/WHYPE metadata, parent token identity, gateway and deterministic bridge mapping. See the dated JSON report.
- Local Anvil deployment/seed: upstream wrapper, factory, router, MockUSDC and pool; seed of 100 native units + 2,000 mock USDC. No public-chain transactions.
- Read-only deployment integrity script against that local deployment: all four runtime bytecodes matched, router immutables matched, pair/factory wiring matched, and protocol fee administration was disabled.
- In-app browser visual checks against the production frontend: desktop layout, 390px mobile viewport with no horizontal overflow, swap direction control, live quote (1 HYPE → 19.74316 USDC; 0.5% minimum 19.644444 USDC), liquidity ratio adjustment and disconnected transaction blocking.

## Not yet passed / external work

- Automated Playwright browser-wallet tests were **blocked before any test action**: Chromium could not register its macOS Mach-port service under the execution sandbox. The tests are included and runnable outside that restriction, but are not reported as passing. The manual browser check did not connect a user's wallet or sign transactions.
- An initial development-server attempt hit host file-watcher limits. The browser checks used a production server, and the automated suite builds/starts its own production server on port 3100. The application root is explicitly scoped in Next.js configuration.
- The real browser-wallet approval/swap/liquidity receipt flow must still be exercised outside this sandbox or in CI, followed by a small public-testnet smoke test after deployment approval.
- Public Elysium deployment, gas-cost review for the user's deployer, token acquisition, initial liquidity, explorer source verification, and GitHub publication remain unperformed.
- No independent contract/integration audit, broad wallet compatibility assessment or mainnet readiness review has been performed.

Foundry's optional signature-cache writes were unavailable in the sandbox; that did not prevent compilation, tests or invariant execution. Pinned compiler binaries were kept in the task's work directory for this run rather than changing the user's global tool installation.

## Dex Da Costa visual revision

Production build passed after the logo revision. In-app browser verified the updated hero image, wallet button hydration and live HYPE/USDC mainnet reference. The source archive includes the updated branding and pricing route.
