import test from 'node:test';
import assert from 'node:assert/strict';
import { HYPE_TOKEN_ID, USDC_TOKEN_ID, parseMarketPrice, isFreshMarketPrice, isDisplayableMarketPrice, createMarketPriceLoader } from '../lib/market-price';
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
test('coalesces requests, retries, labels cached prices and expires them', async () => {
  let calls = 0, time = 1000, fail = false;
  const get = createMarketPriceLoader(async () => {
    calls++;
    return new Response(JSON.stringify(fixture()), { status: fail ? 429 : 200 });
  }, () => time);
  const [a, b] = await Promise.all([get(), get()]);
  assert.equal(calls, 1); assert.deepEqual(a, b); await get(); assert.equal(calls, 1);
  time += 31000; fail = true; const stale=await get(); assert.equal(stale.stale,true); assert.equal(stale.fetchedAt,1000); assert.equal(isFreshMarketPrice(stale,time),false); assert.equal(isDisplayableMarketPrice(stale,time),true); assert.equal(calls,3);
  time=601001; await assert.rejects(get()); assert.equal(isDisplayableMarketPrice(stale,time),false);
  fail = false; const recovered=await get(); assert.equal(recovered.fetchedAt,time); assert.equal(recovered.stale,undefined);
});

test('a transient source error retries successfully without inventing a price',async()=>{
 let calls=0;const get=createMarketPriceLoader(async()=>++calls===1?new Response('',{status:503}):new Response(JSON.stringify(fixture())),()=>1000);
 assert.equal((await get()).price,50);assert.equal(calls,2);
});
test('cold-start failures have no fallback and future timestamps cannot be displayed',async()=>{
 const get=createMarketPriceLoader(async()=>{throw Error('offline');});await assert.rejects(get());
 assert.equal(isDisplayableMarketPrice(parseMarketPrice(fixture(),100000),1000),false);
});
