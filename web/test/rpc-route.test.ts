import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPublicClient,http} from 'viem';
import {POST} from '../app/api/rpc/route';

test('real viem requests pass through the route, including omitted params',async(t)=>{
 const browserRequests:Record<string,unknown>[]=[];
 const upstreamRequests:Record<string,unknown>[]=[];
 t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{
  const body=JSON.parse(String(options.body));upstreamRequests.push(body);
  assert.ok(Array.isArray(body.params),'upstream requests are normalized');
  const results:Record<string,string>={eth_chainId:'0x185d9',eth_blockNumber:'0x123',eth_gasPrice:'0x5f5e100',eth_maxPriorityFeePerGas:'0x0',eth_call:'0x1234'};
  return Response.json({jsonrpc:'2.0',id:body.id,result:results[body.method]});
 });
 const client=createPublicClient({transport:http('https://dex.example/api/rpc',{
  retryCount:0,fetchFn:async(input,init)=>{
   const req=new Request(input,init);browserRequests.push(await req.clone().json());
   return POST(req);
  },
 })});
 assert.equal(await client.getChainId(),99801);
 assert.equal(await client.getBlockNumber(),291n);
 assert.equal(await client.getGasPrice(),100000000n);
 assert.equal(await client.estimateMaxPriorityFeePerGas(),0n);
 assert.equal((await client.call({to:'0x0000000000000000000000000000000000000001',data:'0x1234'})).data,'0x1234');
 assert.ok(browserRequests.some(r=>r.method==='eth_chainId'&&!('params' in r)),'exercise the exact production request shape');
 assert.ok(upstreamRequests.some(r=>r.method==='eth_call'));
});

test('real viem batches concurrent reads into one function invocation',async(t)=>{
 let browserRequests=0,upstream=0;
 t.mock.method(globalThis,'fetch',async(_url:unknown,options:RequestInit)=>{
  const body=JSON.parse(String(options.body));upstream++;
  return Response.json({jsonrpc:'2.0',id:body.id,result:body.method==='eth_chainId'?'0x185d9':'0x123'});
 });
 const client=createPublicClient({transport:http('https://batch.example/api/rpc',{batch:{wait:20,batchSize:20},retryCount:0,fetchFn:async(input,init)=>{browserRequests++;return POST(new Request(input,init));}})});
 const balances=await Promise.all(Array.from({length:10},(_,i)=>client.getBalance({address:`0x${i.toString(16).padStart(40,'0')}`})));
 assert.equal(browserRequests,1);assert.ok(balances.every(x=>x===291n));assert.ok(upstream>=10);
});

test('reject oversized batches, body streams, writes and unbounded log scans before upstream access',async(t)=>{
 t.mock.method(globalThis,'fetch',async()=>{throw Error('Must not call upstream');});
 const req=(body:unknown)=>POST(new Request('https://dex.example/api/rpc',{method:'POST',body:JSON.stringify(body)}));
 const read={jsonrpc:'2.0',id:1,method:'eth_chainId'};
 assert.equal((await req(Array.from({length:21},(_,id)=>({...read,id})))).status,400);
 assert.equal((await req([read,{...read,id:2,method:'eth_sendTransaction'}])).status,400);
 assert.equal((await req([read,read])).status,400);
 assert.equal((await req({...read,method:'eth_getLogs',params:[{fromBlock:'0x0',toBlock:'latest'}]})).status,400);
 assert.equal((await req({padding:'x'.repeat(32769)})).status,413);
});

test('upstream outages produce HTTP 503 and Retry-After rather than misleading HTTP success',async(t)=>{
 let calls=0;
 t.mock.method(globalThis,'fetch',async()=>{calls++;return new Response('',{status:429});});
 const send=()=>POST(new Request('https://dex.example/api/rpc',{method:'POST',body:JSON.stringify({jsonrpc:'2.0',id:99,method:'eth_gasPrice'})}));
 const response=await send();assert.equal(response.status,503);assert.equal(response.headers.get('retry-after'),'30');
 const count=calls;const retry=await send();assert.equal(retry.status,503);assert.equal(calls,count,'provider is not hit again during cooldown');
});
