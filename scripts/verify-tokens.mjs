// Read-only verification of official bridge mappings; never signs or broadcasts.
import {createPublicClient,http,erc20Abi,parseAbi} from 'viem';
const parent=createPublicClient({transport:http('https://rpc.hyperliquid-testnet.xyz/evm')});
const child=createPublicClient({transport:http('https://testnet-rpc.elysium.kinetiq.xyz')});
if(await parent.getChainId()!==998||await child.getChainId()!==99801)throw Error('Wrong network');
const list=[
 ['PURR','0xa9056c15938f9aff34CD497c722Ce33dB0C2fD57','0x5688c9Ca58435Ee982c16cCBE05eAC6993e32Bdd',true],
 ['kHYPE','0xc8BB404F66D5853565f739Fa17534D455b845894','0xd63d373D3a529fA935C2e3B470dbB394B0EDb56f',false],
 ['kmHYPE','0x3fDc8Ab0c6a3BA4D29d7009e1b51720E0B60E2e6','0x5218bE476C6197934A0aA89c39698d12058fe230',true],
 ['KNTQ','0xF92f59fa223A0c7B8D06c5181e6B1c7961d40Cb2','0xDb3d47D1C7aB037e1250d0b70EF077996af6f2ff',false],
 ['sKNTQ','0xFE09176D7615fd49b6b1Eeb538d0a8D2eb84d218','0xE51A294DD40D5887678A694F70C5C547788A8Add',false],
];
const blockNumber=await child.getBlockNumber();const results=[];
for(const [symbol,l1,expected,enabled] of list){
 const mapped=await parent.readContract({address:'0x1aAE2caD8B0249905492087EF230FcCEa3707C45',abi:parseAbi(['function calculateL2TokenAddress(address) view returns(address)']),functionName:'calculateL2TokenAddress',args:[l1]});
 if(mapped.toLowerCase()!==expected.toLowerCase())throw Error(`${symbol}: bridge mapping changed`);
 const code=await child.getCode({address:mapped,blockNumber});
 let metadata=null;
 if(code&&code!=='0x'){
  const [name,actualSymbol,decimals,back]=await Promise.all([
   ...['name','symbol','decimals'].map(functionName=>child.readContract({address:mapped,abi:erc20Abi,functionName,blockNumber})),
   child.readContract({address:mapped,abi:parseAbi(['function l1Address() view returns(address)']),functionName:'l1Address',blockNumber})]);
  metadata={name,symbol:actualSymbol,decimals,parent:back};
 }
 const verified=metadata?.symbol===symbol&&metadata?.decimals===18&&metadata?.parent.toLowerCase()===l1.toLowerCase();
 results.push({symbol,address:mapped,parent:l1,enabled,verified,metadata});
 if(enabled&&!verified)throw Error(`${symbol}: enabled token failed verification`);
}
console.log(JSON.stringify({checkedAt:new Date().toISOString(),chainId:99801,blockNumber:String(blockNumber),results},null,2));
