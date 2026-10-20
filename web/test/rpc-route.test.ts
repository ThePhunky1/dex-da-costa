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
