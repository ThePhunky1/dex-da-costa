import test from 'node:test';
import assert from 'node:assert/strict';
import {balanceFill,gasReserve} from '../lib/balance-fill';
test('HYPE shortcuts keep gas and retain full precision',()=>{
 assert.equal(balanceFill(249998000000000000n,18,100,gasReserve),'0.248998');
 assert.equal(balanceFill(249998000000000000n,18,25,gasReserve),'0.0622495');
 for(const balance of [0n,gasReserve-1n,gasReserve])assert.equal(balanceFill(balance,18,100,gasReserve),'0');
});
test('USDC shortcuts floor fractions and Max includes every base unit',()=>{
 assert.equal(balanceFill(20150395n,6,100),'20.150395');
 assert.equal(balanceFill(20150395n,6,25),'5.037598');
 assert.equal(balanceFill(20150395n,6,50),'10.075197');
 assert.equal(balanceFill(20150395n,6,75),'15.112796');
});
