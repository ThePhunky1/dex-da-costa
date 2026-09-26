// Read-only integrity checks; run after an approved deployment.
import fs from 'node:fs';
import {createPublicClient,http,getAddress,isAddress,zeroAddress,pad} from 'viem';
const local=process.env.LOCAL_DEMO==='true';
const client=createPublicClient({transport:http(local?'http://127.0.0.1:8545':process.env.ELYSIUM_RPC_URL||'https://testnet-rpc.elysium.kinetiq.xyz')});
const router=process.env.ROUTER_ADDRESS;
if(!router||!isAddress(router))throw Error('Set ROUTER_ADDRESS');
const usdc=local?process.env.LOCAL_USDC_ADDRESS:'0x7D29d8047B905000459c0E80c34a26CeedcB47b2';
if(!usdc||!isAddress(usdc))throw Error('USDC address required');
if(await client.getChainId()!==(local?31337:99801))throw Error('Wrong network');
const artifact=name=>JSON.parse(fs.readFileSync(`contracts/artifacts/${name}.json`));
const read=(address,name,functionName,args=[])=>client.readContract({address,abi:artifact(name).abi,functionName,args});
const factory=await read(router,'UniswapV2Router02','factory');const wrapper=await read(router,'UniswapV2Router02','WETH');
const pair=await read(factory,'UniswapV2Factory','getPair',[wrapper,usdc]);
if(pair===zeroAddress)throw Error('Pair is missing');
const [token0,token1,feeTo,feeToSetter]=await Promise.all([read(pair,'UniswapV2Pair','token0'),read(pair,'UniswapV2Pair','token1'),read(factory,'UniswapV2Factory','feeTo'),read(factory,'UniswapV2Factory','feeToSetter')]);
if(![token0,token1].map(x=>x.toLowerCase()).includes(usdc.toLowerCase())||![token0,token1].map(x=>x.toLowerCase()).includes(wrapper.toLowerCase()))throw Error('Wrong pair');
if(feeTo!==zeroAddress||feeToSetter!==zeroAddress)throw Error('Unexpected protocol fee configuration');
for(const [name,address] of [['WETH9',wrapper],['UniswapV2Factory',factory],['UniswapV2Pair',pair],['UniswapV2Router02',router]]){
 const deployed=await client.getCode({address});if(!deployed||deployed==='0x')throw Error(`${name} missing`);
 const expected=artifact(name).deployedBytecode;let normalized=deployed.slice(2).toLowerCase();
 for(const ranges of Object.values(expected.immutableReferences??{})){
  let first;
  for(const {start,length} of ranges){
   const bytes=normalized.slice(start*2,(start+length)*2);
   if(first&&bytes!==first)throw Error('Inconsistent immutable value');first=bytes;
   if(![factory,wrapper].some(a=>pad(a,{size:length}).slice(2).toLowerCase()===bytes))throw Error('Unexpected immutable address');
   normalized=normalized.slice(0,start*2)+'0'.repeat(length*2)+normalized.slice((start+length)*2);
  }
 }
 if(normalized!==expected.object.slice(2).toLowerCase())throw Error(`${name} runtime mismatch; rebuild with the deployment lockfile`);
}
console.log(JSON.stringify({chain:local?31337:99801,router:getAddress(router),factory,wrapper,pair,usdc,runtimeChecks:'all passed',protocolFee:'permanently disabled'},null,2));
