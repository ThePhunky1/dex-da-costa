export const publicRpc = 'https://testnet-rpc.elysium.kinetiq.xyz';
const methods = new Set(['eth_chainId','eth_blockNumber','eth_call','eth_getBalance','eth_getCode','eth_getBlockByNumber','eth_getBlockByHash','eth_getTransactionReceipt','eth_getTransactionByHash','eth_getTransactionCount','eth_estimateGas','eth_gasPrice','eth_maxPriorityFeePerGas','eth_feeHistory','eth_getLogs']);
export function validRpcRequest(value: unknown): value is {jsonrpc:string;id:string|number;method:string;params:unknown[]} {
 if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
 const r=value as Record<string,unknown>;
 return r.jsonrpc==='2.0' && (typeof r.id==='string'||typeof r.id==='number') && typeof r.method==='string' && methods.has(r.method) && Array.isArray(r.params);
}
export function rpcEndpoints(key?:string, extra?:string) {
 const urls=[...(key?[`https://elysium-testnet.g.alchemy.com/v2/${encodeURIComponent(key.trim())}`]:[]),...(extra?extra.split(',').map(x=>x.trim()).filter(Boolean):[]),publicRpc];
 return [...new Set(urls)].filter(url=>{try{return new URL(url).protocol==='https:';}catch{return false;}}).slice(0,3);
}
// Only infrastructure errors trigger another provider; contract reverts are authoritative.
function retryable(code:number,message:string) {
 return [-32603,-32005,-32002,429].includes(code)||/rate limit|too many requests|timeout|timed out|temporarily unavailable|header not found|missing trie node/i.test(message);
}
export async function forwardRpc(request: {id:string|number;method:string;params:unknown[]}, endpoints:string[], fetcher:typeof fetch=fetch) {
 for(const endpoint of endpoints){
  try {
   const post=async(body:unknown)=>{
    const response=await fetcher(endpoint,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body),cache:'no-store',signal:AbortSignal.timeout(6000)});
    if(!response.ok)throw Error('Provider unavailable');
    return response.json();
   };
   // Validate every provider before using it, including after failover.
   const chain=await post({jsonrpc:'2.0',id:0,method:'eth_chainId',params:[]});
   if(chain.result!=='0x185d9')continue;
   const data=await post({...request,jsonrpc:'2.0'});
   if(data.jsonrpc!=='2.0'||data.id!==request.id||(!('result' in data)&&!data.error))continue;
   if(data.error){
    if(retryable(data.error.code,String(data.error.message)))continue;
    // Don't expose provider URLs or credentials in error messages.
    return {jsonrpc:'2.0',id:request.id,error:{code:data.error.code,message:data.error.code===3?'Contract execution reverted.':'RPC rejected this request.',...(typeof data.error.data==='string'&&/^0x[0-9a-f]*$/i.test(data.error.data)?{data:data.error.data}:{})}};
   }
   return {jsonrpc:'2.0',id:request.id,result:data.result};
  }catch{/* Try the next configured provider; never log credential-bearing URLs. */}
 }
 return {jsonrpc:'2.0',id:request.id,error:{code:-32002,message:'Elysium connections are temporarily unavailable. Please retry shortly.'}};
}
