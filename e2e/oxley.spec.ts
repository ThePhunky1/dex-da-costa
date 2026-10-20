import {test,expect} from '@playwright/test';
import {decodeFunctionData,encodeFunctionResult,erc20Abi,type Abi,type Hex} from 'viem';
import {curveAbi,registryAbi} from '@oxley/sdk';
import deployment from '@oxley/sdk/deployments/elysium-testnet.json' with {type:'json'};
import codes from './fixtures/oxley-code.json' with {type:'json'};
import snapshot from '../web/public/data/oxley-markets.json' with {type:'json'};
const account='0x1111111111111111111111111111111111111111';
const hash=`0x${'a'.repeat(64)}`;
const coin=snapshot.items[0].coin;
const zero='0x0000000000000000000000000000000000000000';
const abi=[...curveAbi,...registryAbi,...erc20Abi] as Abi;

test('Oxley buys and sells with exact approvals, reviewed minimums and mobile layout',async({page})=>{
 const allowance:Record<string,bigint>={};let sent=0;const transactions:any[]=[];let failQuote=false;
 const block={number:'0xbebc20',hash,parentHash:hash,timestamp:`0x${Math.floor(Date.now()/1000).toString(16)}`,nonce:'0x0000000000000000',sha3Uncles:hash,logsBloom:`0x${'0'.repeat(512)}`,transactionsRoot:hash,stateRoot:hash,receiptsRoot:hash,miner:zero,difficulty:'0x0',totalDifficulty:'0x0',extraData:'0x',size:'0x100',gasLimit:'0x1c9c380',gasUsed:'0x10000',baseFeePerGas:'0x5f5e100',transactions:[],uncles:[]};
 await page.route('http://127.0.0.1:8556/**',async route=>{
  const request=route.request().postDataJSON();
  function rpc(q:any):any{
   const {method,params=[]}=q;let result:any;
   if(method==='eth_chainId')result='0x185d9';
   else if(method==='eth_accounts'||method==='eth_requestAccounts')result=[account];
   else if(method==='eth_blockNumber')result=block.number;
   else if(method==='eth_getBlockByNumber')result={...block,timestamp:`0x${Math.floor(Date.now()/1000).toString(16)}`};
   else if(method==='eth_getCode')result=(codes as Record<string,string>)[params[0].toLowerCase()]??'0x6000';
   else if(method==='eth_getBalance')result='0xde0b6b3a7640000';
   else if(method==='eth_maxPriorityFeePerGas'||method==='eth_gasPrice')result='0x5f5e100';
   else if(method==='eth_estimateGas')result='0x30000';
   else if(method==='eth_getTransactionCount')result='0x0';
   else if(method==='eth_sendTransaction'){
    const tx=params[0];const decoded=decodeFunctionData({abi,data:tx.data});transactions.push({...tx,...decoded});sent++;
    if(decoded.functionName==='approve')allowance[tx.to.toLowerCase()]=decoded.args![1] as bigint;
    result=`0x${sent.toString(16).padStart(64,'0')}`;
   }else if(method==='eth_getTransactionReceipt')result={transactionHash:params[0],transactionIndex:'0x0',blockHash:hash,blockNumber:block.number,from:account,to:deployment.curve.address,cumulativeGasUsed:'0x10000',gasUsed:'0x10000',contractAddress:null,logs:[],logsBloom:block.logsBloom,status:'0x1',effectiveGasPrice:'0x5f5e100',type:'0x2'};
   else if(method==='eth_call'){
    const tx=params[0];const decoded=decodeFunctionData({abi,data:tx.data});const fn=decoded.functionName;let value:any;
    if(fn==='quoteAsset')value=deployment.quoteToken.address;
    else if(fn==='decimals')value=tx.to.toLowerCase()===deployment.quoteToken.address.toLowerCase()?6:18;
    else if(fn==='deal')value={creator:account,coin,controller:deployment.auctionController,reserveAsset:deployment.quoteToken.address,profile:1,status:3,createdAt:1n,activatedAt:1n,profileDigest:hash};
    else if(fn==='market')value={coin,creator:account,reserveAsset:deployment.quoteToken.address,activatedAt:1n,active:true,position:{segmentIndex:0,soldInSegment:0n},priceOffsetWad:0n,curveInventory:10n**25n,unburnedSupply:10n**25n,curveCapital:10n**12n};
    else if(fn==='balanceOf')value=10n**24n;
    else if(fn==='allowance')value=allowance[tx.to.toLowerCase()]??0n;
    else if(fn==='quoteBuy'||fn==='quoteSell'){
     if(failQuote)return {jsonrpc:'2.0',id:q.id,error:{code:-32000,message:'Quote temporarily unavailable'}};
     value=fn==='quoteBuy'?[100n*10n**18n,200000n]:[9800000n,0n,200000n];
    }else if(fn==='approve')value=true;
    else if(fn==='buy'||fn==='sell'){result='0x';return {jsonrpc:'2.0',id:q.id,result};}
    else throw Error(`Unhandled read ${fn}`);
    result=encodeFunctionResult({abi,functionName:fn,result:value});
   }else throw Error(`Unhandled RPC ${method}`);
   return {jsonrpc:'2.0',id:q.id,result};
  }
  await route.fulfill({json:Array.isArray(request)?request.map(rpc):rpc(request)});
 });
 await page.addInitScript(()=>{
  const provider={on:()=>{},removeListener:()=>{},request:async({method,params=[]}:{method:string;params?:unknown[]})=>{
   if(method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];
   const r=await fetch('http://127.0.0.1:8556/',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method,params})}).then(r=>r.json());if(r.error)throw r.error;return r.result;
  }};Object.defineProperty(window,'ethereum',{value:provider});
 });
 await page.goto('/oxley');await page.getByRole('button',{name:/MAYHEM/}).click();
 await page.getByRole('button',{name:'Connect wallet',exact:true}).click();await page.getByRole('dialog').getByRole('button',{name:'Browser wallet Detected'}).click();
 await page.getByLabel('You pay').fill('10');const go=page.getByRole('button',{name:'Continue · approval or swap'});
 await expect(go).toBeEnabled();await expect(page.locator('dd').nth(1)).toHaveText('99.5 MAYHEM');await go.click();
 await expect(page.getByText('Approval confirmed. Refresh the quote, then continue to swap.')).toBeVisible();
 expect(transactions[0].functionName).toBe('approve');expect(transactions[0].args[1]).toBe(10000000n);
 await go.click();await expect(page.getByText('Swap confirmed.',{exact:true})).toBeVisible();
 expect(transactions[1].functionName).toBe('buy');expect(transactions[1].args[2]).toBe(995n*10n**17n);
 expect(transactions[1].to.toLowerCase()).toBe(deployment.curve.address);
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Sell',exact:true}).click();await page.getByLabel('You pay').fill('100');
 await expect(go).toBeEnabled();await go.click();await expect(page.getByText('Approval confirmed. Refresh the quote, then continue to swap.')).toBeVisible();await go.click();
 await expect(page.getByText('Swap confirmed.',{exact:true})).toBeVisible();expect(transactions.at(-1).functionName).toBe('sell');
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 failQuote=true;await page.getByLabel('You pay').fill('101');await expect(go).toBeDisabled();await expect(page.getByRole('alert')).toContainText('Quote unavailable');
 await page.getByLabel('You pay').fill('-1');await expect(go).toBeDisabled();
 await page.evaluate(({account})=>localStorage.setItem('dex-oxley-pending-v1',JSON.stringify({account,started:Date.now()})),{account});
 await page.reload();await expect(page.getByText('A previous wallet request needs checking before another transaction can be sent.')).toBeVisible();
});
