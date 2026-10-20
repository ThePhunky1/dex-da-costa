import {imageIds,parseArtwork} from '../../../lib/oxley-images';
export async function GET(request:Request){
 const ids=imageIds(new URL(request.url).searchParams.get('ids')||'');
 if(!ids)return Response.json({error:'Invalid market IDs'},{status:400});
 try{
  const response=await fetch(`https://app.oxley.fun/api/elysium/token-images?${new URLSearchParams({ids:ids.join(',')})}`,{next:{revalidate:300},signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Metadata unavailable');
  const items=parseArtwork(await response.json()).filter(x=>ids.includes(x.dealId.toLowerCase()));
  return Response.json({items},{headers:{'Cache-Control':'public, s-maxage=300, stale-while-revalidate=600'}});
 }catch{return Response.json({items:[]},{status:503});}
}
