import test from 'node:test';import assert from 'node:assert/strict';
import {bufferedFees,transactionError} from '../lib/transaction-feedback';
test('fee cap covers twice the base plus tip, including the reported 0.1 gwei boundary',()=>{
 assert.deepEqual(bufferedFees(100030000n,{maxFeePerGas:100000000n,maxPriorityFeePerGas:0n}),{maxFeePerGas:200060000n,maxPriorityFeePerGas:0n});
 assert.equal(bufferedFees(100n,{maxFeePerGas:500n,maxPriorityFeePerGas:10n}).maxFeePerGas,500n);
 assert.equal(bufferedFees(100n,{maxFeePerGas:110n,maxPriorityFeePerGas:10n}).maxFeePerGas,210n);
 assert.throws(()=>bufferedFees(null,{maxFeePerGas:0n,maxPriorityFeePerGas:0n}));
});
test('nested fee errors override unhelpful outer revert and circular causes terminate',()=>{
 const e={message:'Execution reverted for the following reason:',cause:{details:'max fee per gas less than block base fee'}};
 assert.match(transactionError(e),/network fee changed/);
 const cycle:{cause?:unknown}={};cycle.cause=cycle;assert.match(transactionError(cycle),/could not be completed/);
});
test('rejection, slippage, timeouts, and empty reverts have actionable explanations',()=>{
 assert.match(transactionError({cause:{code:4001}}),/cancelled/);
 assert.match(transactionError({details:'UniswapV2Router: INSUFFICIENT_OUTPUT_AMOUNT'}),/slippage/);
 assert.match(transactionError(Error('fetch failed')),/explorer status/);
 assert.match(transactionError(Error('Execution reverted for the following reason:\n')),/no usable explanation/);
 assert.match(transactionError(Error('insufficient funds for gas')),/HYPE/);
});
