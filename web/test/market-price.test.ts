import test from 'node:test';
import assert from 'node:assert/strict';
import { HYPE_TOKEN_ID, USDC_TOKEN_ID, parseMarketPrice, isFreshMarketPrice, createMarketPriceLoader } from '../lib/market-price';
function fixture() {
  return [{ tokens: [{ name: 'HYPE', index: 150, tokenId: HYPE_TOKEN_ID }, { name: 'USDC', index: 0, tokenId: USDC_TOKEN_ID }],
    universe: [{ name: '@107', index: 107, tokens: [150, 0] }] },
  [{ coin: '@105', midPx: '0.08', prevDayPx: '0.09' }, { coin: '@107', midPx: '50', prevDayPx: '40' }]];
}
test('finds the exact HYPE/USDC context by identity, not array offset', () => {
  const result = parseMarketPrice(fixture(), 1000);
  assert.equal(result.price, 50); assert.equal(result.change24h, 25); assert.equal(result.fetchedAt, 1000);
});
test('rejects ticker impersonation and missing spot context', () => {
  const fake = JSON.parse(JSON.stringify(fixture())); fake[0].tokens[0].tokenId = 'wrong';
  assert.throws(() => parseMarketPrice(fake, 0));
  const absent = JSON.parse(JSON.stringify(fixture())); absent[1][1].coin = 'HYPE';
  assert.throws(() => parseMarketPrice(absent, 0));
});
test('does not silently replace a missing midpoint with a mark or stale price', () => {
  for (const midPx of [null, '0', '-5', 'NaN', 'Infinity']) {
    const data = JSON.parse(JSON.stringify(fixture())); data[1][1].midPx = midPx;
    assert.throws(() => parseMarketPrice(data, 0));
  }
});
test('expires reference data and rejects future timestamps', () => {
  const result = parseMarketPrice(fixture(), 1000);
  assert.equal(isFreshMarketPrice(result, 91000), true);
  assert.equal(isFreshMarketPrice(result, 91001), false);
  assert.equal(isFreshMarketPrice({ ...result, fetchedAt: 100000 }, 1000), false);
});
test('coalesces requests, caches briefly, and fails closed after expiry', async () => {
  let calls = 0, time = 1000, fail = false;
  const get = createMarketPriceLoader(async () => {
    calls++;
    return new Response(JSON.stringify(fixture()), { status: fail ? 429 : 200 });
  }, () => time);
  const [a, b] = await Promise.all([get(), get()]);
  assert.equal(calls, 1); assert.deepEqual(a, b); await get(); assert.equal(calls, 1);
  time += 31000; fail = true; await assert.rejects(get()); assert.equal(calls, 2);
  fail = false; assert.equal((await get()).fetchedAt, time); assert.equal(calls, 3);
});
