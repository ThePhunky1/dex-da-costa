// Read-only: never signs, sends, bridges, mints, or deploys.
import fs from 'node:fs';
import {createPublicClient,http,parseAbi,keccak256} from 'viem';
const rpc=process.env.ELYSIUM_RPC_URL||'https://testnet-rpc.elysium.kinetiq.xyz';
const client=createPublicClient({transport:http(rpc)});
const parent=createPublicClient({transport:http('https://rpc.hyperliquid-testnet.xyz/evm')});
const bridge='0x89659883a9d980925733B0A698F117AAb65ac718';
const usdc='0x7D29d8047B905000459c0E80c34a26CeedcB47b2';
const parentUsdc='0x2B3370eE501B4a559b57D449569354196457D8Ab';
const bridgedWhype='0xCD57F65c2B0e5881CFC2E609F7CD53b746E1F234';
const abi=parseAbi(['function calculateL2TokenAddress(address) view returns(address)','function getGateway(address) view returns(address)','function l1Address() view returns(address)','function l2Gateway() view returns(address)','function symbol() view returns(string)','function decimals() view returns(uint8)']);
if(await client.getChainId()!==99801||await parent.getChainId()!==998)throw Error('Wrong network');
const block=await client.getBlock();
if(Date.now()/1000-Number(block.timestamp)>120)throw Error('RPC is stale');
const call=(address,functionName,args=[])=>client.readContract({address,abi,functionName,args,blockNumber:block.number});
const assets=[];
for(const [address,original,decimals] of [[usdc,parentUsdc,6],[bridgedWhype,'0x5555555555555555555555555555555555555555',18]]){
 const [representation,l1Address,l2Gateway,symbol,dp,code]=await Promise.all([call(bridge,'calculateL2TokenAddress',[original]),call(address,'l1Address'),call(address,'l2Gateway'),call(address,'symbol'),call(address,'decimals'),client.getCode({address,blockNumber:block.number})]);
 if(representation.toLowerCase()!==address.toLowerCase()||l1Address.toLowerCase()!==original.toLowerCase()||dp!==decimals||!code||code==='0x')throw Error('Asset provenance mismatch');
 assets.push({address,original,representation,l1Address,l2Gateway,symbol,decimals:dp,runtimeCodeHash:keccak256(code)});
}
const parentDecimals=await parent.readContract({address:parentUsdc,abi,functionName:'decimals'});
if(parentDecimals!==6)throw Error('Parent USDC decimals mismatch');
const report={checkedAt:new Date().toISOString(),chainId:99801,parentChainId:998,rpc,block:block.number.toString(),blockHash:block.hash,nativeAsset:'HYPE, 18 decimals, no ERC-20 address',assets,notes:['WHYPE above is bridged HyperEVM WHYPE; it is NOT our native-HYPE wrapper.','USDC is the official bridge-listed test token representation; this does not establish Circle issuance or monetary value.']};
console.log(JSON.stringify(report,null,2));
if(process.argv.includes('--save'))fs.writeFileSync('docs/network-verification.json',JSON.stringify(report,null,2)+'\n');
