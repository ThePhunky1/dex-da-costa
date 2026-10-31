import {test} from 'node:test';import assert from 'node:assert/strict';
import {createRpcFetch,pollingInterval} from '../lib/rpc-client';
test('rate-limit cooldown suppresses all further network requests in this tab until retry-after expires',async()=>{
 let now=0,calls=0;
 const request=createRpcFetch(async()=>{calls++;return new Response('',{status:429,headers:{'Retry-After':'60'}});},()=>now);
 await request('https://example.com');
 await assert.rejects(request('https://example.com'),/cooling down/);assert.equal(calls,1);
 now=59999;await assert.rejects(request('https://example.com'));assert.equal(calls,1);
 now=60000;await request('https://example.com');assert.equal(calls,2);
});
test('503 and fetch failures back off; valid RPC revert responses do not',async()=>{
 let now=0,calls=0;
 const request=createRpcFetch(async()=>{calls++;return new Response('',{status:calls===1?503:200});},()=>now);
 await request('https://example.com');await assert.rejects(request('https://example.com'));now=30000;await request('https://example.com');await request('https://example.com');assert.equal(calls,3);
 const failed=createRpcFetch(async()=>{throw Error('offline');},()=>now);await assert.rejects(failed('https://example.com'),/offline/);await assert.rejects(failed('https://example.com'),/cooling down/);
 assert.equal(pollingInterval(0),15000);assert.equal(pollingInterval(1),30000);assert.equal(pollingInterval(9),120000);
});
