// Read-only checkpoint to avoid rescanning deployment history in every browser.
import {createPublicClient,http,parseAbi} from 'viem';
import {writeFileSync,existsSync,readFileSync} from 'node:fs';
import {applyFeeLogs,emptyLedger,type FeeSnapshot} from '../web/lib/fee-history';
const client=createPublicClient({transport:http('https://testnet-rpc.elysium.kinetiq.xyz',{retryCount:0})});
if(await client.getChainId()!==99801)throw Error('Wrong chain');
const pair='0xfb3a6F0b6Ec7837EAF298Efe0e5DC534Bf1D746a';
const file='web/public/data/hype-usdc-fees.json';
const prior:FeeSnapshot|undefined=existsSync(file)?JSON.parse(readFileSync(file,'utf8')):undefined;
if(prior&&(await client.getBlock({blockNumber:BigInt(prior.block)})).hash!==prior.blockHash)throw Error('Checkpoint reorg');
let ledger=prior?.ledger??emptyLedger();
const end=await client.getBlock({blockNumber:(await client.getBlockNumber())-20n});
for(let start=prior?BigInt(prior.block)+1n:311827n;start<=end.number;start+=100000n){
 const to=start+99999n>end.number?end.number:start+99999n;
 for(let attempt=0;;attempt++){
  await new Promise(r=>setTimeout(r,attempt?10000:1800));
  try{ledger=applyFeeLogs(ledger,await client.getLogs({address:pair,fromBlock:start,toBlock:to}));break;}catch(e){if(attempt>=5)throw e;}
 }
 console.log('Checked through',String(to));
}
const supply=await client.readContract({address:pair,abi:parseAbi(['function totalSupply() view returns(uint256)']),functionName:'totalSupply',blockNumber:end.number});
if(String(supply)!==ledger.supply)throw Error('History does not reconcile with LP supply');
const token0=await client.readContract({address:pair,abi:parseAbi(['function token0() view returns(address)']),functionName:'token0'});
const snapshot:FeeSnapshot={chainId:99801,pair,token0,block:String(end.number),blockHash:end.hash,timestamp:Number(end.timestamp),ledger};
writeFileSync(file,JSON.stringify(snapshot)+'\n');console.log('Snapshot saved:',ledger.swaps,'swaps');
