import test from 'node:test';
import assert from 'node:assert/strict';
import {parseUnits} from 'viem';
import {poolPrice, priceDivergence, simulateRebalance} from '../lib/rebalance';
import type {MarketPrice} from '../lib/market-price';
const h=(s:string)=>parseUnits(s,18), u=(s:string)=>parseUnits(s,6);
const reference:MarketPrice={price:100, fetchedAt:100000,source:'Hyperliquid spot',pair:'HYPE/USDC',network:'mainnet',change24h:null};
const base={hype:h('10'),usdc:u('2000'),blockTimestamp:100000,reference,now:100000,hypeInventory:h('1000'),usdcInventory:u('100000'),maxHype:h('1000'),maxUsdc:u('100000'),gasReserve:h('0.001')};
test('pool reference handles decimals, either direction, missing and stale values',()=>{
 assert.equal(poolPrice(h('10'),u('2000')),200);
 assert.equal(priceDivergence(h('10'),u('2000'),reference,100000)?.percent,100);
 assert.equal(priceDivergence(h('10'),u('500'),reference,100000)?.percent,-50);
 assert.equal(priceDivergence(h('10'),u('500'),reference,200000),undefined);
 assert.equal(poolPrice(0n,u('20')),undefined);
 assert.equal(priceDivergence(h('10'),u('500'),{...reference,stale:true},100000),undefined);
});
test('both trade directions reach the reference with fee retained in reserves',()=>{
 for(const usdc of [u('2000'),u('500')]){
  const result=simulateRebalance({...base,usdc});
  assert.equal(result.status,'simulated');
  assert.equal(result.inputToken,usdc>u('1000')?'HYPE':'USDC');
  assert.ok(Math.abs(result.after!-100)<0.0001);
  const input=parseUnits(result.simulatedInput,result.inputToken==='HYPE'?18:6);
  const output=parseUnits(result.simulatedOutput,result.inputToken==='HYPE'?6:18);
  const rh=result.inputToken==='HYPE'?base.hype+input:base.hype-output;
  const ru=result.inputToken==='HYPE'?usdc-output:usdc+input;
  assert.ok(rh*ru>base.hype*usdc);
 }
});
test('holds inside band and caps inventory and spend, preserving gas',()=>{
 assert.equal(simulateRebalance({...base,usdc:u('1040')}).status,'within-band');
 const capped=simulateRebalance({...base,maxHype:h('0.1')});
 assert.equal(capped.status,'budget-limited');
 assert.equal(capped.simulatedInput,'0.1');
 const inventory=simulateRebalance({...base,hypeInventory:h('0.101')});
 if(inventory.status==='within-band')throw Error('Unexpected hold');
 assert.equal(inventory.simulatedInput,'0.1');
 assert.equal(simulateRebalance({...base,hypeInventory:0n}).status,'insufficient-budget');
 assert.equal(simulateRebalance({...base,usdc:u('500'),hypeInventory:0n}).status,'insufficient-budget');
 assert.equal(simulateRebalance({...base,usdc:u('500'),usdcInventory:0n}).status,'insufficient-budget');
});
test('fails closed for stale/future data, empty reserves and invalid limits',()=>{
 for(const change of [{reference:{...reference,stale:true}},{now:300000},{blockTimestamp:110000},{hype:0n},{maxHype:-1n},{thresholdBps:NaN},{reference:{...reference,price:Infinity}}]){
  assert.throws(()=>simulateRebalance({...base,...change}));
 }
});
test('extreme screenshot imbalance needs much more HYPE than the default budget',()=>{
 const result=simulateRebalance({...base,hype:h('23.469665'),usdc:u('282795.217786'),reference:{...reference,price:87.9975},maxHype:h('1')});
 assert.equal(result.status,'budget-limited');
 assert.ok(Number(result.requiredInput)>200);
 assert.equal(result.simulatedInput,'1');
 assert.ok(result.after!>10000);
});
