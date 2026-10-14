# Wallet fees, errors, and reference feed

Transactions (including exact approvals and liquidity operations) are simulated first. Immediately before requesting a signature, the client obtains a fresh block and EIP-1559 estimate. The cap is the greater of the network estimate and twice the base fee plus the suggested priority fee. This is headroom, not a fixed charge; the wallet still presents the transaction for approval. Fast fee changes or wallet overrides can still require a retry. Transactions are not automatically resubmitted.

Nested wallet/RPC errors are inspected for rejection, underpriced fees, balance shortages, slippage, expiration and network timeouts. Empty reverts get an explicit fallback. Submitted transaction links remain available so users can check status before retrying.

The Hyperliquid spot reference retries once and can show a last-known value for at most ten minutes, retaining its original timestamp and labeling it LAST KNOWN. Last-known data is display-only and is never used for first-deposit suggestions. Freshness for suggestions stays at 90 seconds, and execution always uses actual testnet pool reserves. A cold server/client with no cached value may still show unavailable during an upstream outage.

## MetaMask alert investigation (2026-10-14)

A bot reported malicious-site and high-risk alerts. Its report alone does not establish a false positive or identify the alert provider. The production hostname had no exact or parent-domain entry in MetaMask's public eth-phishing-detect blacklist at inspection; this does not exclude fuzzy matches or other providers. Onchain router, factory, wrapper and HYPE/USDC pair runtime verification passed against local deployment artifacts, including disabled protocol fees. These checks are not a full security audit.

Obtain the precise visited URL, warning text, flagged address/transaction and MetaMask version. Use MetaMask's in-wallet report option or official support portal for review:
- https://support.metamask.io/configure/wallet/security-alerts
- https://blockaid-false-positive-portal.metamask.io/

Do not tell users or bots to bypass alerts. No report has been submitted by this update; security-provider reclassification cannot be accomplished by frontend code.
