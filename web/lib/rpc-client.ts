// Shared by every read in this tab. Never retry wallet submissions here.
export function createRpcFetch(fetcher:typeof fetch=fetch,now=Date.now){
 let resumeAt=0;
 return async(input:RequestInfo|URL,init?:RequestInit)=>{
  if(now()<resumeAt)throw Error('RPC is cooling down after a connection limit. Please wait before retrying.');
  try{
   const response=await fetcher(input,init);
   if(response.status===429||response.status===503){
    const seconds=Number(response.headers.get('retry-after'));
    resumeAt=now()+1000*(Number.isFinite(seconds)&&seconds>0?Math.min(120,Math.max(15,seconds)):30);
   }
   return response;
  }catch(error){resumeAt=Math.max(resumeAt,now()+15000);throw error;}
 };
}
export function pollingInterval(failures:number,normal=15000){return failures?Math.min(120000,30000*2**Math.min(failures-1,2)):normal;}
