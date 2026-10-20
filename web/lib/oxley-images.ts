export type TokenArtwork={dealId:string;coin:string;cid:string};
const deal=/^0x[0-9a-f]{64}$/i,coin=/^0x[0-9a-f]{40}$/i;
const cid=/^(bafy|bafk)[a-z2-7]{20,110}$/;
export function imageIds(value:string){const ids=[...new Set(value.split(',').map(x=>x.toLowerCase()))];return ids.length>0&&ids.length<=50&&ids.every(x=>deal.test(x))?ids:undefined;}
export function parseArtwork(value:unknown):TokenArtwork[]{
 if(!value||typeof value!=='object'||!('items' in value)||!Array.isArray(value.items))return [];
 return value.items.slice(0,100).filter((x):x is TokenArtwork=>!!x&&typeof x.dealId==='string'&&deal.test(x.dealId)&&typeof x.coin==='string'&&coin.test(x.coin)&&typeof x.cid==='string'&&cid.test(x.cid));
}
export function artworkUrl(items:TokenArtwork[],market:{dealId:string;coin:string}){
 const item=items.find(x=>x.dealId.toLowerCase()===market.dealId.toLowerCase()&&x.coin.toLowerCase()===market.coin.toLowerCase());
 return item&&cid.test(item.cid)?`https://gateway.pinata.cloud/ipfs/${item.cid}`:undefined;
}
