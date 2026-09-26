import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUnits} from 'viem';
import {pairedLiquidityInput as pair} from '../lib/liquidity-input';
const empty={hypeReserve:0n,usdcReserve:0n,supply:0n};
test('40 USDC follows the reference without coarse HYPE rounding',()=>{
 const h=pair('40','usdc',empty,92.1455);
 assert.ok(Math.abs(40/Number(h)-92.1455)<0.000001);
 assert.equal(pair(h,'hype',empty,92.1455),'40.000001');
});
test('existing pool uses reserves, ignoring mainnet reference in both directions',()=>{
 const pool={hypeReserve:parseUnits('2',18),usdcReserve:parseUnits('100',6),supply:1n};
 assert.equal(pair('40','usdc',pool,92),'0.8');
 assert.equal(pair('0.8','hype',pool,92),'40');
});
test('missing reference or pool and invalid input cannot produce a deposit',()=>{
 for(const price of [undefined,0,-1,NaN,Infinity])assert.equal(pair('40','usdc',empty,price),'');
 assert.equal(pair('40','usdc',undefined,92),'');
 for(const value of ['','-1','1e3','0','1.0000001'])assert.equal(pair(value,'usdc',empty,92),'');
 assert.equal(pair('40','usdc',{...empty,supply:1n},92),'');
});
test('matching maximum rounds up at most one base unit',()=>{
 const pool={hypeReserve:3n,usdcReserve:2n,supply:1n};
 assert.equal(pair('0.000001','usdc',pool),'0.000000000000000002');
});
