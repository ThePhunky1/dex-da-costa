/** Display-only mainnet reference. Never import into swap or liquidity math. */
export const HYPE_TOKEN_ID = '0x0d01dc56dcaaca66ad901c959b4011ec';
export const USDC_TOKEN_ID = '0x6d1e7cde53ba9467b783cb7c530ce054';
export type MarketPrice = {
  price: number;
  change24h: number | null;
  fetchedAt: number;
  source: 'Hyperliquid spot';
  pair: 'HYPE/USDC';
  network: 'mainnet';
};
function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw Error('Invalid market response');
  return value as Record<string, unknown>;
}
function positive(value: unknown): number {
  if (typeof value !== 'string' || !/^\d+(\.\d+)?$/.test(value)) throw Error('Invalid market price');
  const price = Number(value);
  if (!Number.isFinite(price) || price <= 0) throw Error('Invalid market price');
  return price;
}
export function parseMarketPrice(payload: unknown, fetchedAt: number): MarketPrice {
  if (!Array.isArray(payload) || payload.length !== 2 || !Array.isArray(payload[1])) throw Error('Invalid market response');
  const meta = record(payload[0]);
  if (!Array.isArray(meta.tokens) || !Array.isArray(meta.universe)) throw Error('Missing market metadata');
  const tokens = meta.tokens.map(record);
  // Symbols are not unique. Pin asset identities, then resolve the spot market.
  const hype = tokens.filter(t => t.tokenId === HYPE_TOKEN_ID && t.name === 'HYPE');
  const usdc = tokens.filter(t => t.tokenId === USDC_TOKEN_ID && t.name === 'USDC');
  if (hype.length !== 1 || usdc.length !== 1 || !Number.isInteger(hype[0].index) || !Number.isInteger(usdc[0].index)) throw Error('Unexpected market tokens');
  const pairs = meta.universe.map(record).filter(p => Array.isArray(p.tokens) && p.tokens.length === 2 && p.tokens[0] === hype[0].index && p.tokens[1] === usdc[0].index);
  if (pairs.length !== 1 || typeof pairs[0].name !== 'string') throw Error('HYPE/USDC market unavailable');
  // Contexts can contain markets absent from universe: never join by array position.
  const contexts = payload[1].map(record).filter(c => c.coin === pairs[0].name);
  if (contexts.length !== 1) throw Error('HYPE/USDC context unavailable');
  const price = positive(contexts[0].midPx);
  let change24h: number | null = null;
  try { change24h = (price / positive(contexts[0].prevDayPx) - 1) * 100; } catch { /* No valid comparison. */ }
  return { price, change24h: Number.isFinite(change24h) ? change24h : null, fetchedAt, source: 'Hyperliquid spot', pair: 'HYPE/USDC', network: 'mainnet' };
}
export function isFreshMarketPrice(data: MarketPrice | undefined, now = Date.now()): data is MarketPrice {
  return !!data && Number.isFinite(data.price) && data.price > 0 && Number.isFinite(data.fetchedAt) && data.fetchedAt <= now + 5000 && now - data.fetchedAt <= 90000;
}
export function createMarketPriceLoader(fetcher: typeof fetch = fetch, now: () => number = Date.now) {
  let cached: MarketPrice | undefined;
  let inflight: Promise<MarketPrice> | undefined;
  return async (): Promise<MarketPrice> => {
    if (cached && now() - cached.fetchedAt < 30000) return cached;
    if (inflight) return inflight;
    inflight = (async () => {
      const response = await fetcher('https://api.hyperliquid.xyz/info', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'spotMetaAndAssetCtxs' }),
        cache: 'no-store', signal: AbortSignal.timeout(5000),
      });
      if (!response.ok) throw Error('Market source unavailable');
      cached = parseMarketPrice(await response.json(), now());
      return cached;
    })();
    try { return await inflight; } finally { inflight = undefined; }
  };
}
