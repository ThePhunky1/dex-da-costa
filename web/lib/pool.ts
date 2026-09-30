import {erc20Abi,type Address,type PublicClient,zeroAddress} from 'viem';
import {factoryAbi,pairAbi,routerAbi} from './abi';
import type {Token} from './tokens';
export async function readPool(client:PublicClient,router:Address,a:Token,b:Token,account?:Address){
 if(await client.getChainId()!==client.chain?.id)throw Error('RPC is serving the wrong network.');
 const block=await client.getBlock();const blockNumber=block.number;
 if(Date.now()/1000-Number(block.timestamp)>120)throw Error('RPC block is stale. Trading is paused.');
 const [factory,wrapper,routerCode]=await Promise.all([
  client.readContract({address:router,abi:routerAbi,functionName:'factory',blockNumber}),
  client.readContract({address:router,abi:routerAbi,functionName:'WETH',blockNumber}),client.getCode({address:router,blockNumber})]);
 if(!routerCode||routerCode==='0x')throw Error('Router configuration is invalid.');
 const tokenA=a.native?wrapper:a.address,tokenB=b.native?wrapper:b.address;
 if(!tokenA||!tokenB||tokenA.toLowerCase()===tokenB.toLowerCase())throw Error('Select two different configured tokens.');
 for(const t of [a,b])if(!t.native){
  const [decimals,symbol]=await Promise.all([
   client.readContract({address:t.address!,abi:erc20Abi,functionName:'decimals',blockNumber}),
   client.readContract({address:t.address!,abi:erc20Abi,functionName:'symbol',blockNumber})]);
  if(decimals!==t.decimals||symbol!==t.symbol)throw Error(`${t.symbol} contract metadata does not match. Trading is paused.`);
 }
 const [pair,nativeBalance,balanceA,balanceB]=await Promise.all([
  client.readContract({address:factory,abi:factoryAbi,functionName:'getPair',args:[tokenA,tokenB],blockNumber}),
  account?client.getBalance({address:account,blockNumber}):undefined,
  account?(a.native?client.getBalance({address:account,blockNumber}):client.readContract({address:tokenA,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber})):undefined,
  account?(b.native?client.getBalance({address:account,blockNumber}):client.readContract({address:tokenB,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber})):undefined,
 ]);
 const base={factory,wrapper,pair,tokenA,tokenB,nativeBalance,balanceA,balanceB,blockNumber,timestamp:block.timestamp};
 if(pair===zeroAddress)return {...base,exists:false,supply:0n,reserveA:0n,reserveB:0n,lpBalance:account?0n:undefined};
 const [token0,token1,reserves,supply,lpBalance]=await Promise.all([
  client.readContract({address:pair,abi:pairAbi,functionName:'token0',blockNumber}),client.readContract({address:pair,abi:pairAbi,functionName:'token1',blockNumber}),
  client.readContract({address:pair,abi:pairAbi,functionName:'getReserves',blockNumber}),client.readContract({address:pair,abi:pairAbi,functionName:'totalSupply',blockNumber}),
  account?client.readContract({address:pair,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber}):undefined,
 ]);
 const actual=[token0.toLowerCase(),token1.toLowerCase()];
 if(!actual.includes(tokenA.toLowerCase())||!actual.includes(tokenB.toLowerCase()))throw Error('Unexpected pool tokens');
 const first=token0.toLowerCase()===tokenA.toLowerCase();
 return {...base,exists:true,supply,reserveA:reserves[first?0:1],reserveB:reserves[first?1:0],lpBalance};
}
