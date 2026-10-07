# LP fees and reporting

V2 retains 0.30% of swap inputs in the pool. The deployed factory has feeTo and feeToSetter set to zero; no protocol cut is collected. Fees are redeemed with liquidity, never paid twice through an additional claim.

The position panel shows the wallet's pro-rata reserves, refreshed with the existing pool reads. Removal previews include accrued fees and preserve the existing minimum amounts and approvals.

Fee history is independent of trading. HYPE/USDC starts from a bundled, dated checkpoint. **Update fee history** reads subsequent confirmed logs from the public RPC, ending 20 blocks behind the head; it is not an automatic live feed. Other pools on our deployed factory can scan from the factory's deployment era on demand. Failures display an unavailable message and never disable withdrawals. Large scans may take several minutes or hit public RPC rate limits.

Pool fees are 0.003 times Swap input amounts, in the original input tokens. Input volumes are shown separately in each token; they are not summed into a USD valuation. Wallet estimates use LP Transfer events to reconstruct ownership at each swap. Burned shares stop accruing, transferred shares start accruing for the recipient, and old earnings remain attributed to the historical owner. The minimum locked liquidity remains in the denominator. Wallet fee estimates round down per swap with three extra decimal places. Estimates include previously withdrawn positions, exclude previous owners' earnings, and are not current claimable balances, profit, or impermanent-loss-adjusted returns. Underlying tokens and prices change after fees accrue. LP held by another contract is attributed to that contract, not its depositors.

Refresh the checked-in bootstrap checkpoint from repository root:

```
node --import tsx scripts/fee-snapshot.mts
```

The script is read-only onchain, validates chain ID, checks the prior checkpoint block hash, and reconciles final LP supply. It writes only after completing the scan. Review and commit the JSON with a deployment to shorten browser catch-up scans. No secrets or wallet signatures are needed. The checkpoint contains public-chain wallet addresses and estimated historical fees.
