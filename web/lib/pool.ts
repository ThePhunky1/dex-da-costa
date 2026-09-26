import { erc20Abi, type Address, type PublicClient, zeroAddress } from 'viem';
import { factoryAbi, pairAbi, routerAbi } from './abi';
export async function readPool(client:PublicClient,router:Address,usdc:Address,account?:Address) {
 if(await client.getChainId()!==client.chain?.id)throw Error("RPC is serving the wrong network.");
 const block=await client.getBlock();const blockNumber=block.number;
 if(Date.now()/1000-Number(block.timestamp)>120)throw Error('RPC block is stale. Trading is paused.');
 const [factory,wrapper,decimals,routerCode]=await Promise.all([
   client.readContract({address:router,abi:routerAbi,functionName:'factory',blockNumber}),
   client.readContract({address:router,abi:routerAbi,functionName:'WETH',blockNumber}),
   client.readContract({address:usdc,abi:erc20Abi,functionName:'decimals',blockNumber}),client.getCode({address:router,blockNumber})]);
 if(!routerCode||routerCode==='0x'||decimals!==6)throw Error('Contract configuration is invalid.');
 const pair=await client.readContract({address:factory,abi:factoryAbi,functionName:'getPair',args:[wrapper,usdc],blockNumber});
 if(pair===zeroAddress)throw Error('HYPE / USDC pool has not been created.');
 const [token0,token1,reserves,supply,hypeBalance,usdcBalance,lpBalance]=await Promise.all([
  client.readContract({address:pair,abi:pairAbi,functionName:'token0',blockNumber}),
  client.readContract({address:pair,abi:pairAbi,functionName:'token1',blockNumber}),
  client.readContract({address:pair,abi:pairAbi,functionName:'getReserves',blockNumber}),
  client.readContract({address:pair,abi:pairAbi,functionName:'totalSupply',blockNumber}),
  account?client.getBalance({address:account,blockNumber}):undefined,
  account?client.readContract({address:usdc,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber}):undefined,
  account?client.readContract({address:pair,abi:erc20Abi,functionName:'balanceOf',args:[account],blockNumber}):undefined,
 ]);
 if(![token0.toLowerCase(),token1.toLowerCase()].includes(usdc.toLowerCase())||![token0.toLowerCase(),token1.toLowerCase()].includes(wrapper.toLowerCase()))throw Error('Unexpected pool tokens');
 const hypeFirst=token0.toLowerCase()===wrapper.toLowerCase();
 return {factory,wrapper,pair,supply,hypeReserve:reserves[hypeFirst?0:1],usdcReserve:reserves[hypeFirst?1:0],hypeBalance,usdcBalance,lpBalance,blockNumber,timestamp:block.timestamp};
}
