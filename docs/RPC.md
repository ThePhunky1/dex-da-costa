# Elysium RPC reliability

The web app reads through `/api/rpc`. Configure `ALCHEMY_ELYSIUM_API_KEY` as a **server-only Secret** in Vercel (Production and Preview), then redeploy. Create the key for **Kinetiq Elysium Testnet, chain 99801**. Do not use HyperEVM testnet (998), or Vulcan Forged Elysium (1338).

Alchemy endpoint: https://elysium-testnet.g.alchemy.com/v2/{apiKey}
Official documentation: https://www.alchemy.com/docs/reference/elysium-api-faq

The proxy tries Alchemy first when configured, then optional `ELYSIUM_FALLBACK_RPC_URLS` (comma-separated trusted HTTPS endpoints), then the official public RPC. At most three endpoints are used. It checks chain ID before forwarding, bounds request time, fails over on infrastructure errors, and returns contract errors without retrying them against another provider. No signing or transaction-submission methods are exposed. Wallet transactions still go through the user's wallet provider; app failover does not change the wallet's own RPC settings.

The browser retains a direct public RPC fallback if the web server itself is unavailable. Never place a private key-bearing endpoint in `NEXT_PUBLIC_RPC_URL`: this value is public. Without an Alchemy key or another configured endpoint, the app still relies on the official public node; retries cannot fix an outage of that node.

The API does not cache chain data. Pool reads retain their existing block freshness and metadata checks. Consider provider quotas and Vercel firewall rate limits for public production traffic.

# USDC / Oxy-USDC

The market uses six-decimal Oxy-USDC at `0xa4ce6e6c719f7fb524230c367948039b078683e4`, checked against the live chain on October 20, 2026. The existing factory/router support this ERC20/ERC20 pair. The first liquidity provider supplies both tokens and chooses the initial ratio; no new router deployment is required. Oxy-USDC is a test token, not redeemable for USDC, and there is no guaranteed 1:1 rate. Obtain it through the official Oxley faucet: https://oxley.fun/docs/faucet. The temporary “Ox” token icon is a label, not an official brand asset.
