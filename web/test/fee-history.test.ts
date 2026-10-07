import {test} from 'node:test';import assert from 'node:assert/strict';
import {encodeEventTopics,encodeAbiParameters,parseAbiParameters,zeroAddress,type Log} from 'viem';
import {applyFeeLogs,emptyLedger,feeEvents} from '../lib/fee-history';
const alice='0x1111111111111111111111111111111111111111',bob='0x2222222222222222222222222222222222222222';
let index=0;
function transfer(from:string,to:string,value:bigint){return {blockNumber:1n,logIndex:index++,topics:encodeEventTopics({abi:feeEvents,eventName:'Transfer',args:{from:from as `0x${string}`,to:to as `0x${string}`}}),data:encodeAbiParameters(parseAbiParameters('uint256'),[value])} as Log;}
function swap(a:bigint,b:bigint){return {blockNumber:1n,logIndex:index++,topics:encodeEventTopics({abi:feeEvents,eventName:'Swap',args:{sender:alice,to:alice}}),data:encodeAbiParameters(parseAbiParameters('uint256,uint256,uint256,uint256'),[a,b,0n,0n])} as Log;}
test('fees follow ownership at each swap, not the current wallet share',()=>{
 const s=applyFeeLogs(emptyLedger(),[transfer(zeroAddress,alice,100n),swap(1000n,0n),transfer(alice,bob,50n),swap(0n,2000n),transfer(bob,zeroAddress,50n),swap(1000n,0n)]);
 assert.deepEqual(s.fees,['6000','6000']);assert.deepEqual(s.earned[alice],['6000','3000']);assert.deepEqual(s.earned[bob],['0','3000']);assert.equal(s.supply,'50');assert.equal(s.swaps,3);
});
test('minimum locked liquidity participates in supply but is not wallet earnings',()=>{
 const s=applyFeeLogs(emptyLedger(),[transfer(zeroAddress,zeroAddress,10n),transfer(zeroAddress,alice,90n),swap(1000n,0n)]);
 assert.equal(s.supply,'100');assert.deepEqual(s.earned[alice],['2700','0']);assert.equal(s.earned[zeroAddress],undefined);
});
test('checkpoint continuation matches complete replay and does not mutate checkpoint',()=>{
 const first=[transfer(zeroAddress,alice,100n),swap(333n,444n)];const rest=[transfer(alice,bob,25n),swap(123n,456n)];const checkpoint=applyFeeLogs(emptyLedger(),first);const before=JSON.stringify(checkpoint);
 assert.deepEqual(applyFeeLogs(checkpoint,rest),applyFeeLogs(emptyLedger(),[...first,...rest]));assert.equal(JSON.stringify(checkpoint),before);
});
test('incomplete ownership history fails instead of fabricating earnings',()=>{
 assert.throws(()=>applyFeeLogs(emptyLedger(),[transfer(alice,bob,1n)]),/Incomplete/);
 assert.throws(()=>applyFeeLogs(emptyLedger(),[swap(1n,0n)]),/Incomplete/);
});
