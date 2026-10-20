import {forwardRpc,rpcEndpoints,validRpcRequest} from '../../../lib/rpc-proxy';
export const runtime='nodejs';
export const maxDuration=45;
export async function POST(request:Request){
 const origin=request.headers.get('origin');
 if(origin&&origin!==new URL(request.url).origin)return new Response('Forbidden',{status:403});
 const text=await request.text();
 if(text.length>32768)return new Response('Request too large',{status:413});
 let body:unknown;try{body=JSON.parse(text);}catch{return new Response('Invalid JSON',{status:400});}
 if(!validRpcRequest(body))return new Response('Unsupported RPC request',{status:400});
 const result=await forwardRpc(body,rpcEndpoints(process.env.ALCHEMY_ELYSIUM_API_KEY,process.env.ELYSIUM_FALLBACK_RPC_URLS));
 return Response.json(result,{headers:{'Cache-Control':'no-store'}});
}
