import {formatUnits, parseUnits} from 'viem';
import {isFreshMarketPrice, type MarketPrice} from './market-price';
import {quote} from './math';

export const divergenceThresholdPercent = 5;
export function poolPrice(hype: bigint, usdc: bigint): number | undefined {
  if (hype <= 0n || usdc <= 0n) return undefined;
  const price = Number(formatUnits(usdc, 6)) / Number(formatUnits(hype, 18));
  return Number.isFinite(price) && price > 0 ? price : undefined;
}
export function priceDivergence(hype: bigint, usdc: bigint, reference: MarketPrice | undefined, now = Date.now()) {
  const price = poolPrice(hype, usdc);
  if (!price || !isFreshMarketPrice(reference, now)) return undefined;
  return {price, percent: (price / reference.price - 1) * 100};
}

/** Pure, single-observation model. No signer, transaction construction, or network access. */
export function simulateRebalance(input: {
  hype: bigint; usdc: bigint; blockTimestamp: number; reference: MarketPrice;
  now: number; hypeInventory: bigint; usdcInventory: bigint;
  maxHype: bigint; maxUsdc: bigint; gasReserve: bigint; thresholdBps?: number;
}) {
  const {hype, usdc, reference, now} = input;
  const limit = (1n << 112n) - 1n;
  const threshold = input.thresholdBps ?? 500;
  if (!Number.isInteger(threshold) || threshold < 1 || threshold > 5000) throw Error('Invalid deviation threshold');
  if (!isFreshMarketPrice(reference, now)) throw Error('Reference is stale or invalid');
  if (!Number.isFinite(input.blockTimestamp) || input.blockTimestamp > now + 5000 || now - input.blockTimestamp > 120000) throw Error('Pool block is stale or invalid');
  if (hype <= 0n || usdc <= 0n || hype > limit || usdc > limit) throw Error('Invalid or empty pool');
  for (const value of [input.hypeInventory, input.usdcInventory, input.maxHype, input.maxUsdc, input.gasReserve]) {
    if (value < 0n) throw Error('Inventory and limits must not be negative');
  }
  const target = parseUnits(reference.price.toFixed(8), 8);
  if (target <= 0n) throw Error('Reference is below supported precision');
  const difference = usdc * 10n ** 20n - hype * target;
  const deviationBps = (difference < 0n ? -difference : difference) * 10000n / (hype * target);
  const before = poolPrice(hype, usdc)!;
  if (deviationBps <= BigInt(threshold)) return {status: 'within-band' as const, before, target: reference.price};
  const sellHype = difference > 0n;
  const reserveIn = sellHype ? hype : usdc;
  const reserveOut = sellHype ? usdc : hype;
  const after = (amount: bigint) => {
    const output = quote(amount, reserveIn, reserveOut);
    return {h: sellHype ? hype + amount : hype - output, u: sellHype ? usdc - output : usdc + amount, output};
  };
  const reached = (amount: bigint) => {
    const {h, u} = after(amount);
    return sellHype ? u * 10n ** 20n <= h * target : u * 10n ** 20n >= h * target;
  };
  let low = 0n, high = limit - reserveIn;
  if (!reached(high)) throw Error('Target cannot be reached within reserve limits');
  // Smallest integer input reaching the reference; includes the 0.30% V2 fee.
  while (low < high) {
    const mid = (low + high) / 2n;
    if (reached(mid)) high = mid; else low = mid + 1n;
  }
  const availableHype = input.hypeInventory > input.gasReserve ? input.hypeInventory - input.gasReserve : 0n;
  const inventory = sellHype ? availableHype : input.usdcInventory;
  const cap = sellHype ? input.maxHype : input.maxUsdc;
  const budget = input.hypeInventory < input.gasReserve ? 0n : inventory < cap ? inventory : cap;
  const amount = low < budget ? low : budget;
  const result = after(amount);
  return {
    status: amount === 0n ? 'insufficient-budget' as const : amount < low ? 'budget-limited' as const : 'simulated' as const,
    before, target: reference.price, after: poolPrice(result.h, result.u),
    inputToken: sellHype ? 'HYPE' : 'USDC', outputToken: sellHype ? 'USDC' : 'HYPE',
    requiredInput: formatUnits(low, sellHype ? 18 : 6),
    simulatedInput: formatUnits(amount, sellHype ? 18 : 6),
    simulatedOutput: formatUnits(result.output, sellHype ? 6 : 18),
    feeInInputToken: formatUnits(amount * 3n / 1000n, sellHype ? 18 : 6),
  };
}
