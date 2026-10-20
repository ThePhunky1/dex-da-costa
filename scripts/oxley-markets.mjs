// Read-only discovery. Never signs or broadcasts transactions.
import {createPublicClient,http,parseAbiItem,erc20Abi} from 'viem';
import {createOxleyClient} from '@oxley/sdk';
import {readFileSync,writeFileSync} from 'node:fs';
const deployment=JSON.parse(readFileSync(new URL('../node_modules/@oxley/sdk/deployments/elysium-testnet.json',import.meta.url)));
const rpc=createPublicClient({transport:http('https://testnet-rpc.elysium.kinetiq.xyz',{retryCount:3})});
const sdk=createOxleyClient({deployment,publicClient:rpc});await sdk.verifyDeployment();
const head=await rpc.getBlock();const to=head.number-20n;const ids=new Set();
for(let from=BigInt(deployment.startBlock);from<=to;from+=100000n){
 const logs=await rpc.getLogs({address:deployment.curve.address,event:parseAbiItem('event MarketActivated(bytes32 indexed dealId,address indexed coin,address indexed creator,address reserveAsset,uint256 quoteSeed)'),fromBlock:from,toBlock:from+99999n<to?from+99999n:to,strict:true});
 for(const log of logs)if(!log.removed)ids.add(log.args.dealId);
 console.log(String(from),ids.size);await new Promise(r=>setTimeout(r,400));
}
const items=[];
for(const id of ids){const {market}=await sdk.getMarket(id,to);const [name,symbol]=await Promise.all(['name','symbol'].map(functionName=>rpc.readContract({address:market.coin,abi:erc20Abi,functionName,blockNumber:to})));items.push({dealId:id,coin:market.coin,name,symbol,status:'active'});}
const block=await rpc.getBlock({blockNumber:to});
const output={checkedAt:new Date().toISOString(),cursor:{chainId:99801,releaseId:deployment.releaseId,curve:deployment.curve.address,blockNumber:String(to),blockHash:block.hash},items};
writeFileSync(new URL('../web/public/data/oxley-markets.json',import.meta.url),JSON.stringify(output,null,2)+'\n');console.log('Verified markets:',items.length);
