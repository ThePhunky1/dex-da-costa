import test from 'node:test';
import assert from 'node:assert/strict';
import {type PublicClient,type Address,zeroAddress} from 'viem';
import {readPool} from '../lib/pool';
const router='0x0000000000000000000000000000000000000001' as Address,wrapper='0x0000000000000000000000000000000000000002' as Address,usdc='0x0000000000000000000000000000000000000003' as Address,purr='0x0000000000000000000000000000000000000004' as Address,pair='0x0000000000000000000000000000000000000005' as Address;
const a={symbol:'USDC',decimals:6,address:usdc},b={symbol:'PURR',decimals:18,address:purr};
function mock({exists=true,symbol='PURR',chain=99801,stale=false,wrongPair=false}={}){
 const reads:string[]=[];
 const client={chain:{id:99801},getChainId:async()=>chain,getBlock:async()=>({number:1n,timestamp:BigInt(Math.floor(Date.now()/1000)-(stale?200:0))}),getCode:async()=> '0x1234',getBalance:async()=>100n,
 readContract:async({address,functionName,args}:{address:string;functionName:string;args?:unknown[]})=>{
  reads.push(functionName);
  switch(functionName){
   case 'factory':return router;case 'WETH':return wrapper;
   case 'symbol':return address===usdc?'USDC':symbol;case 'decimals':return address===usdc?6:18;
   case 'getPair':assert.deepEqual(args,[usdc,purr]);return exists?pair:zeroAddress;
   case 'balanceOf':return 12n;
   case 'token0':return wrongPair?wrapper:purr;case 'token1':return usdc;
   case 'getReserves':return [20n*10n**18n,10n*10n**6n,0];case 'totalSupply':return 10n;
   default:throw Error(functionName);
  }
 }} as unknown as PublicClient;
 return {client,reads};
}
test('missing pair returns empty reserves while preserving wallet balances and avoiding pair calls',async()=>{
 const {client,reads}=mock({exists:false});const result=await readPool(client,router,a,b,router);
 assert.equal(result.exists,false);assert.equal(result.reserveA,0n);assert.equal(result.lpBalance,0n);assert.equal(result.balanceA,12n);assert.equal(result.nativeBalance,100n);assert.ok(!reads.includes('token0'));
});
test('reserves are ordered by selected tokens, independently of address ordering',async()=>{
 const result=await readPool(mock().client,router,a,b);
 assert.equal(result.reserveA,10n*10n**6n);assert.equal(result.reserveB,20n*10n**18n);assert.equal(result.balanceA,undefined);
});
test('wrong chain, stale RPC, mismatched metadata and unexpected pair tokens fail closed',async()=>{
 for(const options of [{chain:998},{stale:true},{symbol:'MTWOZ'},{wrongPair:true}])await assert.rejects(readPool(mock(options).client,router,a,b));
});
