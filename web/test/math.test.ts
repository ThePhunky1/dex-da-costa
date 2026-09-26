import test from 'node:test';
import assert from 'node:assert/strict';
import {amount,quote,minimum,liquidityAmounts,impactBps,display} from '../lib/math';
test('parse amounts without silently rounding or accepting scientific notation',()=>{
 assert.equal(amount('1.000001',6),1000001n);assert.equal(amount('1.0000001',6),0n);
 for(const s of ['-1','NaN','1e6','Infinity','','.','1,000'])assert.equal(amount(s,18),0n);
 assert.equal(amount('0.000000000000000001',18),1n);
});
test('V2 output with 18 to 6 decimals and 30bp fee',()=>{
 assert.equal(quote(10n**18n,100n*10n**18n,2000n*10n**6n),19743160n);
 assert.equal(quote(0n,1n,1n),0n);assert.equal(quote(1n,0n,1n),0n);
});
test('minimum output rounds down and rejects unsafe tolerances',()=>{
 assert.equal(minimum(19743160n,50),19644444n);assert.throws(()=>minimum(1n,10000));
 assert.throws(()=>minimum(1n,-1));assert.throws(()=>minimum(1n,NaN));
});
test('liquidity only consumes amounts at pool ratio',()=>{
 assert.deepEqual(liquidityAmounts(2n*10n**18n,20n*10n**6n,100n*10n**18n,2000n*10n**6n),[10n**18n,20n*10n**6n]);
 assert.deepEqual(liquidityAmounts(10n,20n,0n,0n),[10n,20n]);
 assert.deepEqual(liquidityAmounts(10n,20n,0n,1n),[0n,0n]);
});
test('price impact excludes liquidity fee and uses integer math',()=>{
 const input=10n**18n,ri=100n*10n**18n,ro=2000n*10n**6n;
 assert.equal(impactBps(input,quote(input,ri,ro),ri,ro),98);
 assert.equal(display(1n,18),'<0.000001');
});
