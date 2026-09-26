# Third-party components

This project is distributed under GPL-3.0-or-later. It integrates Uniswap V2 core 1.0.1 and periphery 1.1.0-beta.0, licensed under GPL-3.0; their original notices remain in the installed package sources. See:

- https://github.com/Uniswap/v2-core
- https://github.com/Uniswap/v2-periphery

The only transformation is the pair init-code hash in the router library, described in docs/SECURITY.md. Solidity compiler versions are pinned separately for each package. WETH9 comes from the upstream periphery test source and retains its legacy name, symbol, and behavior.

Next.js, React, wagmi, viem, TanStack Query, TypeScript and testing tools retain their respective package licenses. Dependency versions and integrity digests are recorded in package-lock.json. Patched tmp and esbuild versions are pinned to avoid known dependency advisories while retaining original Solidity compiler versions.

## Token logos

Unmodified official brand-kit SVGs, retrieved 2026-09-26:
- `web/public/tokens/hype.svg`: `SVG/Hyperliquid_Blob_Green.svg` from https://hyperliquid.gitbook.io/hyperliquid-docs/brand-kit
- `web/public/tokens/usdc.svg`: `Token Logo/USDC Token.svg` from Circle’s USDC logo archive at https://www.circle.com/pressroom (https://6778953.fs1.hubspotusercontent-na1.net/hubfs/6778953/Pressroom/brandkit/logo-downloads/usdc.zip).

Brand marks remain the property of their respective owners and are not covered by this project’s GPL license. Used to identify tokens; no endorsement or mainnet issuance claim is implied.

## Wallet logos

`web/public/wallets/phantom.svg` is the unmodified Phantom ghost favicon from the official Phantom documentation site (https://docs.phantom.com), retrieved 2026-09-26: https://mintcdn.com/phantom-e50e2e68/tU9g5MXFXgx4l6Em/favicon.svg?fit=max. The mark remains Phantom’s property and is excluded from this project’s GPL license. Other wallet icons are supplied by their installed providers through EIP-6963.
