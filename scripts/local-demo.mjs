// Only operates on an unlocked local Anvil chain. No key material is read or written.
import fs from 'node:fs';
import {createPublicClient,createWalletClient,http,parseEther,parseAbi} from 'viem';
import {anvil} from 'viem/chains';
const transport=http('http://127.0.0.1:8545');
const publicClient=createPublicClient({chain:anvil,transport});
const wallet=createWalletClient({chain:anvil,transport});
if(await publicClient.getChainId()!==31337)throw Error('Local Anvil chain 31337 required');
const [account]=await wallet.getAddresses();if(!account)throw Error('Anvil needs an unlocked local account');
const envPath='web/.env.local';
if(fs.existsSync(envPath)&&!fs.readFileSync(envPath,'utf8').includes('NEXT_PUBLIC_LOCAL_DEMO=true'))throw Error('Refusing to overwrite non-local frontend settings');
async function deploy(file,args=[]){
 const artifact=JSON.parse(fs.readFileSync(file));
 const hash=await wallet.deployContract({account,abi:artifact.abi,bytecode:artifact.bytecode.object,args});
 const receipt=await publicClient.waitForTransactionReceipt({hash});
 if(receipt.status!=='success'||!receipt.contractAddress)throw Error('Local deployment failed');
 return receipt.contractAddress;
}
async function send(address,abi,functionName,args=[],value){
 const {request}=await publicClient.simulateContract({account,address,abi,functionName,args,value});
 const hash=await wallet.writeContract(request);const receipt=await publicClient.waitForTransactionReceipt({hash});
 if(receipt.status!=='success')throw Error('Local transaction failed');return receipt;
}
const artifacts='contracts/artifacts/';
const wrapper=await deploy(artifacts+'WETH9.json');
const factory=await deploy(artifacts+'UniswapV2Factory.json',['0x0000000000000000000000000000000000000000']);
const router=await deploy(artifacts+'UniswapV2Router02.json',[factory,wrapper]);
const usdc=await deploy('contracts/out/Dex.t.sol/MockUSDC.json');
const purr=await deploy('contracts/out/MockPURR.sol/MockPURR.json');
const erc=parseAbi(['function mint(address,uint256)','function approve(address,uint256) returns(bool)']);
await send(usdc,erc,'mint',[account,100000n*10n**6n]);await send(usdc,erc,'approve',[router,2000n*10n**6n]);
const routerAbi=JSON.parse(fs.readFileSync(artifacts+'UniswapV2Router02.json')).abi;
await send(router,routerAbi,'addLiquidityETH',[usdc,2000n*10n**6n,2000n*10n**6n,parseEther('100'),account,BigInt(Math.floor(Date.now()/1000)+3600)],parseEther('100'));
await send(purr,erc,'mint',[account,parseEther('100000')]);
await send(purr,erc,'approve',[router,parseEther('2000')]);
await send(router,routerAbi,'addLiquidityETH',[purr,parseEther('2000'),parseEther('2000'),parseEther('100'),account,BigInt(Math.floor(Date.now()/1000)+3600)],parseEther('100'));
fs.writeFileSync(envPath,`# Generated local demo settings, never for testnet. No private keys.\nNEXT_PUBLIC_LOCAL_DEMO=true\nNEXT_PUBLIC_ROUTER_ADDRESS=${router}\nNEXT_PUBLIC_LOCAL_USDC_ADDRESS=${usdc}\nNEXT_PUBLIC_LOCAL_PURR_ADDRESS=${purr}\n`);
console.log(JSON.stringify({network:'Local Anvil only',account,wrapper,factory,router,usdc,seed:'100 HYPE + 2,000 mock USDC'},null,2));
