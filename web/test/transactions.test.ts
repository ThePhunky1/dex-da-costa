import test from 'node:test';
import assert from 'node:assert/strict';
import {type Address} from 'viem';
import {swapPlan,liquidityPlan} from '../lib/transactions';
import {matchAmount} from '../lib/pair-input';
const a='0x0000000000000000000000000000000000000001' as Address,b='0x0000000000000000000000000000000000000002' as Address;
test('direct swaps select native or token router functions and attach value only for native input',()=>{
 assert.deepEqual(swapPlan(true,false,100n,90n,[a,b],a,1000n),{name:'swapExactETHForTokens',args:[90n,[a,b],a,1000n],value:100n});
 assert.deepEqual(swapPlan(false,true,100n,90n,[b,a],a,1000n),{name:'swapExactTokensForETH',args:[100n,90n,[b,a],a,1000n],value:undefined});
 assert.equal(swapPlan(false,false,100n,90n,[a,b],a,1000n).name,'swapExactTokensForTokens');
});
test('liquidity plans keep the correct token order and minimums for native and ERC20 pairs',()=>{
 const args=[a,b,1000n,2000n,1000n,2000n,500n,50,a,1000n] as const;
 assert.deepEqual(liquidityPlan(false,false,...args),{name:'addLiquidity',args:[a,b,1000n,2000n,995n,1990n,a,1000n],value:undefined});
 assert.deepEqual(liquidityPlan(false,true,...args),{name:'addLiquidityETH',args:[b,2000n,1990n,995n,a,1000n],value:1000n});
 assert.deepEqual(liquidityPlan(true,false,...args),{name:'removeLiquidity',args:[a,b,500n,995n,1990n,a,1000n],value:undefined});
 assert.deepEqual(liquidityPlan(true,true,...args),{name:'removeLiquidityETH',args:[b,500n,1990n,995n,a,1000n],value:undefined});
});
test('paired input supports 6/18 and 18/18 decimals without inventing a price for empty pools',()=>{
 assert.equal(matchAmount('2',6,18,1000000n,10n**18n),'2');
 assert.equal(matchAmount('2',18,6,10n**18n,1000000n),'2');
 assert.equal(matchAmount('0.1',18,18,10n**18n,2n*10n**18n),'0.2');
 assert.equal(matchAmount('1',18,18,0n,0n),'');
 assert.equal(matchAmount('0.0000001',6,18,1n,1n),'');
});
