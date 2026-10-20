import {test} from 'node:test';
import assert from 'node:assert/strict';
import {forwardRpc,rpcEndpoints,validRpcRequest} from '../lib/rpc-proxy';
const request={jsonrpc:'2.0',id:7,method:'eth_call',params:[]};
const response=(value:unknown)=>new Response(JSON.stringify(value));
test('RPC proxy accepts reads but refuses signing, writes and batches',()=>{
 assert.ok(validRpcRequest(request));
 for(const method of ['eth_sendRawTransaction','eth_sendTransaction','personal_sign','debug_traceTransaction'])assert.equal(validRpcRequest({...request,method}),false);
 assert.equal(validRpcRequest([request]),false);
});
test('RPC fails over on rate limits and checks the replacement chain',async()=>{
 const calls:string[]=[];
 const fetcher:typeof fetch=async(url,options)=>{
  calls.push(String(url));const body=JSON.parse(String(options?.body));
  if(String(url)==='bad')return new Response('',{status:429});
  if(body.method==='eth_chainId')return response({result:String(url)==='wrong'?'0x3e6':'0x185d9'});
  return response({jsonrpc:'2.0',id:7,result:'0x123'});
 };
 assert.deepEqual(await forwardRpc(request,['bad','wrong','good'],fetcher),{jsonrpc:'2.0',id:7,result:'0x123'});
 assert.deepEqual(calls,['bad','wrong','good','good']);
});
test('contract revert does not trigger failover or leak provider messages',async()=>{
 let count=0;
 const fetcher:typeof fetch=async()=>response(++count===1?{result:'0x185d9'}:{jsonrpc:'2.0',id:7,error:{code:3,message:'secret provider url',data:'0x1234'}});
 const result=await forwardRpc(request,['one','two'],fetcher);
 assert.equal(count,2);assert.equal(result.error?.code,3);assert.equal(result.error?.data,'0x1234');assert.ok(!JSON.stringify(result).includes('secret'));
});
test('all providers down yields a safe actionable error',async()=>{
 const result=await forwardRpc(request,['one'],async()=>{throw Error('API KEY');});
 assert.equal(result.error?.code,-32002);assert.ok(!JSON.stringify(result).includes('API KEY'));
});
test('server endpoint configuration is bounded and HTTPS only',()=>{
 const urls=rpcEndpoints('key','http://wrong,https://backup.example');
 assert.equal(urls.length,3);assert.ok(urls[0].includes('elysium-testnet.g.alchemy.com'));assert.ok(urls.every(x=>x.startsWith('https:')));
});
