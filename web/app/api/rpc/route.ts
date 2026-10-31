import {forwardRpc,rpcEndpoints,validRpcRequest} from '../../../lib/rpc-proxy';
export const runtime='nodejs';
export const maxDuration=45;
// Per-instance load shedding only. The Vercel WAF must enforce distributed IP limits.
let active=0;
export async function POST(request:Request){
 const headers={'Cache-Control':'no-store'};
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return new Response('Forbidden',{status:403,headers});
 // Bound the stream even when Content-Length is absent or dishonest.
 const reader=request.body?.getReader();if(!reader)return new Response('Invalid JSON',{status:400,headers});
 let size=0;const chunks:Uint8Array[]=[];
 while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>32768){await reader.cancel();return new Response('Request too large',{status:413,headers});}chunks.push(value);}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.length;}
 let body:unknown;try{body=JSON.parse(new TextDecoder().decode(bytes));}catch{return new Response('Invalid JSON',{status:400,headers});}
 const batch=Array.isArray(body);const calls:unknown[]=Array.isArray(body)?body:[body];
 if(!calls.length||calls.length>20||!calls.every(validRpcRequest)||new Set(calls.map(x=>x.id)).size!==calls.length)return new Response('Unsupported RPC request',{status:400,headers});
 // Prevent a single history query from scanning the entire chain.
 for(const call of calls)if(call.method==='eth_getLogs'){
  const filter=call.params?.[0];
  if(!filter||typeof filter!=='object'||Array.isArray(filter))return new Response('Invalid log filter',{status:400,headers});
  const {address,fromBlock,toBlock,blockHash}=filter as Record<string,unknown>;
  const addresses=Array.isArray(address)?address:[address];
  const validAddresses=addresses.length>0&&addresses.length<=10&&addresses.every(x=>typeof x==='string'&&/^0x[\da-f]{40}$/i.test(x));
  const bounded=typeof fromBlock==='string'&&typeof toBlock==='string'&&/^0x[\da-f]+$/i.test(fromBlock)&&/^0x[\da-f]+$/i.test(toBlock)&&BigInt(toBlock)>=BigInt(fromBlock)&&BigInt(toBlock)-BigInt(fromBlock)<100000n;
  if(!validAddresses||!(bounded||(typeof blockHash==='string'&&/^0x[\da-f]{64}$/i.test(blockHash))))return new Response('Log query must specify addresses and at most 100000 blocks',{status:400,headers});
 }
 if(active>=8)return Response.json({error:'RPC capacity temporarily unavailable'},{status:503,headers:{...headers,'Retry-After':'30'}});
 active++;
 try{
  const endpoints=rpcEndpoints(process.env.ALCHEMY_ELYSIUM_API_KEY,process.env.ELYSIUM_FALLBACK_RPC_URLS);
  // Four workers bound fan-out; retain request ordering and individual IDs.
  const results=new Array<Awaited<ReturnType<typeof forwardRpc>>>(calls.length);let cursor=0;
  await Promise.all(Array.from({length:Math.min(4,calls.length)},async()=>{while(cursor<calls.length){const index=cursor++;const call=calls[index];results[index]=await forwardRpc({...call,params:call.params??[]},endpoints);}}));
  const unavailable=results.some(x=>x.error?.code===-32002);
  // Fail the batch as a unit on infrastructure failure. Read-only requests are safe to retry later.
  return Response.json(batch?results:results[0],{status:unavailable?503:200,headers:{...headers,...(unavailable?{'Retry-After':'30'}:{})}});
 }finally{active--;}
}
