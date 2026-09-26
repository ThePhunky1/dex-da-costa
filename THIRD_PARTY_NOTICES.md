# Third-party components

This project is distributed under GPL-3.0-or-later. It integrates Uniswap V2 core 1.0.1 and periphery 1.1.0-beta.0, licensed under GPL-3.0; their original notices remain in the installed package sources. See:

- https://github.com/Uniswap/v2-core
- https://github.com/Uniswap/v2-periphery

The only transformation is the pair init-code hash in the router library, described in docs/SECURITY.md. Solidity compiler versions are pinned separately for each package. WETH9 comes from the upstream periphery test source and retains its legacy name, symbol, and behavior.

Next.js, React, wagmi, viem, TanStack Query, TypeScript and testing tools retain their respective package licenses. Dependency versions and integrity digests are recorded in package-lock.json. Patched tmp and esbuild versions are pinned to avoid known dependency advisories while retaining original Solidity compiler versions.
