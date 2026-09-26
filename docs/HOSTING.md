# Publishing Dex Da Costa

The owner approved publishing the source to `ThePhunky1/dex-da-costa`. Website hosting and testnet contract deployment remain pending.

## Website

1. Review the source and `.gitignore`; keep `.env`, `.env.local`, keys and wallet files out of Git. Create a personal GitHub repository and push only after approval.
2. Import the repository into Vercel. Select Next.js and set Root Directory to `web`. Enable inclusion of source files outside the root directory for the npm workspace.
3. Use Node.js 22, install command `cd .. && npm ci`, and build command `npm run build`. Keep the framework’s default output directory. The server-side market-price route means this is not a static GitHub Pages export.
4. Set `NEXT_PUBLIC_RPC_URL=https://testnet-rpc.elysium.kinetiq.xyz`, `NEXT_PUBLIC_LOCAL_DEMO=false` and leave `NEXT_PUBLIC_ROUTER_ADDRESS` empty for a preview. Never put a deployer key in Vercel. All NEXT_PUBLIC variables are public and require a rebuild when changed.
5. After approval, deploy and check the assigned HTTPS URL, the market reference, wallet connection and the deployment-pending state on desktop and mobile. A custom domain is optional.

Vercel’s Hobby plan is intended for personal, non-commercial use and is subject to its current terms and limits. Check eligibility before publication; a commercial project may require a paid plan.

## Enable swaps

Website publication alone does not deploy contracts. Follow the README deployment procedure after explicit contract-deployment approval. Fund the deployment wallet with test HYPE, verify the exact bridged USDC, deploy and verify the router/factory/wrapper, then rebuild the website with the reviewed router address. The owner must separately provide initial HYPE and test USDC liquidity; that ratio establishes the pool’s starting price. Test both swap directions and liquidity withdrawal before inviting users to transact.

## Market reference

`/api/market-price` requests `spotMetaAndAssetCtxs` from Hyperliquid’s public mainnet API without user wallet information or an API key. It validates the exact HYPE and USDC token identities, joins the correct market context by market name, caches for 30 seconds and coalesces concurrent requests. The browser refreshes every 30 seconds and hides expired data after 90 seconds or a failed refresh. Displayed time is fetch time, not the last trade time. CDN caching is 15 seconds; cache is per server instance, not a global rate limiter.

This is a mainnet spot midpoint for context. AMM execution uses testnet reserves, fee, deadline and minimum-output protections, independently of this API. No external price feed pegs or rebalances the pool.

References: [Vercel Next.js](https://vercel.com/docs/frameworks/full-stack/nextjs), [Vercel Hobby](https://vercel.com/docs/plans/hobby), [Hyperliquid spot API](https://hyperliquid.gitbook.io/hyperliquid-docs/for-developers/api/info-endpoint/spot).
