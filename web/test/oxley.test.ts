import {test} from 'node:test';
import assert from 'node:assert/strict';
import {buildSwap,buildApprovals,type Quote} from '@oxley/sdk';
import {assertFreshSwap,nextOxleyTransaction,readPending,walletRejected} from '../lib/oxley';
const address='0x1111111111111111111111111111111111111111';
const quote={chainId:99801,caller:address,timestamp:BigInt(Math.floor(Date.now()/1000)),blockNumber:1n,blockHash:`0x${'a'.repeat(64)}`,releaseId:'test',side:'buy',tokenIn:'0x2222222222222222222222222222222222222222',tokenOut:'0x3333333333333333333333333333333333333333',amountIn:10000000n,amountOut:123456789123456789000n,feeAmount:200000n,feeToken:'0x2222222222222222222222222222222222222222',market:{id:`0x${'b'.repeat(64)}`,coin:'0x3333333333333333333333333333333333333333',quoteToken:'0x2222222222222222222222222222222222222222',curve:'0x4444444444444444444444444444444444444444',coinDecimals:18,activatedAt:1n,creator:address}} as Quote;
const swap=buildSwap(quote,{slippageBps:50,deadline:quote.timestamp+300n});
test('Oxley keeps net output, floors the minimum and targets its own curve',()=>{
 assert.equal(swap.minAmountOut,quote.amountOut*9950n/10000n);assert.equal(swap.transaction.to,quote.market.curve);assert.equal(swap.transaction.value,0n);assert.equal(swap.allowance.amount,quote.amountIn);
 const approvals=buildApprovals(swap,1n);assert.equal(approvals.length,2);assert.equal(approvals[1].to,quote.tokenIn);
});
test('rejects old, future, wrong-account and zero-floor quotes',()=>{
 assert.doesNotThrow(()=>assertFreshSwap(swap,address));
 for(const changed of [{...swap,quote:{...quote,timestamp:quote.timestamp-61n}},{...swap,quote:{...quote,timestamp:quote.timestamp+40n}},{...swap,minAmountOut:0n}])assert.throws(()=>assertFreshSwap(changed,address));
 assert.throws(()=>assertFreshSwap(swap,quote.tokenIn));
});
test('approvals are separate steps; funded swaps simulate the exact reviewed minimum',async()=>{
 const approvals=buildApprovals(swap,1n);const calls:boolean[]=[];
 const sdk={checkSwap:async(s:typeof swap,simulate=false)=>{assert.equal(s,swap);calls.push(simulate);return {approvals,balance:quote.amountIn,allowance:1n,sufficientBalance:true,gas:undefined,blockNumber:1n,blockHash:quote.blockHash,timestamp:quote.timestamp};}};
 const next=await nextOxleyTransaction(sdk,swap,address);assert.equal(next.transaction,approvals[0]);assert.deepEqual(calls,[false]);
 const funded={checkSwap:async(s:typeof swap,simulate=false)=>{const result=await sdk.checkSwap(s,simulate);return {...result,approvals:[]};}};
 calls.length=0;assert.equal((await nextOxleyTransaction(funded,swap,address)).transaction,swap.transaction);assert.deepEqual(calls,[false,true]);
 const failing={checkSwap:async()=>{throw Error('Slippage');}};
 await assert.rejects(nextOxleyTransaction(failing,swap,address),/Slippage/);
});
test('pending and unknown outcomes survive serialization; only wallet rejection releases the hold',()=>{
 const p={account:address,started:Date.now(),hash:`0x${'c'.repeat(64)}`};assert.deepEqual(readPending(JSON.stringify(p)),p);assert.equal(readPending(null),null);assert.throws(()=>readPending('broken'));
 assert.equal(walletRejected({cause:{code:4001}}),true);assert.equal(walletRejected(new Error('RPC rejected connection')),false);assert.equal(walletRejected({code:-32000}),false);
});
