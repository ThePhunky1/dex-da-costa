# Elysium RPC reliability and traffic controls

Configure `ALCHEMY_ELYSIUM_API_KEY` as a server-only Secret in Vercel and redeploy. Use Kinetiq Elysium Testnet, chain 99801, not HyperEVM (998) or Vulcan Forged Elysium (1338).
https://www.alchemy.com/docs/reference/elysium-api-faq

## App changes (October 31, 2026)

- Pool polling is 15 seconds instead of 5; allowances 30 seconds instead of 5. Background interval polling is disabled. Transaction completion still refreshes balances immediately. Quotes retain their existing freshness checks and simulations.
- Concurrent browser reads are batched with a 20ms collection window, at most 20 calls per HTTP request. Local demos retain their direct transport.
- `/api/rpc` validates the entire batch before forwarding, rejects duplicate IDs, limits streamed bodies to 32KiB, and bounds log scans to 100,000 blocks with explicit addresses. Four workers process each batch. Up to eight requests can run per function instance; further work returns 503.
- Providers enter a bounded cooldown on HTTP 429 and transient errors. Identity checks are shared for 60 seconds; balances, quotes and results are not cached. The client respects 429/503 Retry-After (15–120 seconds), avoiding immediate retries by every query.
- Provider failover remains server-side: Alchemy, optional `ELYSIUM_FALLBACK_RPC_URLS`, official public RPC. Browser fallback was removed because it bypassed backoff and amplified outages. Signing remains in the wallet; no writes/signatures are accepted by the proxy.
- Infrastructure failures return HTTP 503 with Retry-After. Contract errors remain JSON-RPC errors under HTTP 200. HTTP 200 alone is never evidence of successful contract execution. A batch with any unavailable read returns 503, so it is retried later as a whole.

## REQUIRED: configure Vercel Firewall separately

These code controls reduce normal usage and protect upstream capacity. They do NOT enforce a distributed per-IP limit or prevent function invocation/CDN charges from incoming abusive requests. Instance memory is not a global security boundary.

In project **dex-da-costa-elysium → Firewall → Configure → New Rule**:

- Name: `Limit DEX RPC requests`
- Match request path exactly `/api/rpc` and method `POST`.
- Action: Rate Limit; fixed window 60 seconds; initial limit **300 requests per IP**; response **429** (not an interactive challenge).
- Review and Publish. This rule is NOT enabled by a Git push.
- Inspect allowed/limited traffic after rollout; tune down after normal browser and shared-IP traffic is measured. Existing tabs may need refreshing to get batching.
- Consider additional targeted limits only after reviewing sources. Do not blanket-block countries or hosting networks.

Vercel's documented deployment-file mitigations support deny/challenge; counting rate limits require dashboard/API configuration. No authenticated Vercel CLI/session was available when this patch was prepared, so the firewall rule was not applied. Budget settings are also separate and unchanged.

Sources:
https://vercel.com/docs/vercel-firewall/vercel-waf/rate-limiting
https://vercel.com/docs/vercel-firewall/vercel-waf/custom-rules
https://vercel.com/docs/spend-management

## USDC / Oxy-USDC

Six-decimal Oxy-USDC: `0xa4ce6e6c719f7fb524230c367948039b078683e4`. The existing factory/router support the pair. Its exchange rate floats; Oxy-USDC is a test token, not redeemable for USDC. Faucet instructions: https://oxley.fun/docs/faucet.
