import {decodeEventLog,parseAbi,type Log,zeroAddress} from 'viem';
export const feeEvents=parseAbi([
 'event Transfer(address indexed from,address indexed to,uint256 value)',
 'event Swap(address indexed sender,uint256 amount0In,uint256 amount1In,uint256 amount0Out,uint256 amount1Out,address indexed to)',
]);
export type FeeLedger={supply:string;balances:Record<string,string>;earned:Record<string,[string,string]>;volume:[string,string];fees:[string,string];swaps:number};
export type FeeSnapshot={chainId:number;pair:string;token0:string;block:string;blockHash:string;timestamp:number;ledger:FeeLedger};
export function emptyLedger():FeeLedger{return {supply:'0',balances:{},earned:{},volume:['0','0'],fees:['0','0'],swaps:0};}
// Fee amounts have three additional decimal places. Estimates floor each wallet's share.
export function applyFeeLogs(original:FeeLedger,logs:Log[]):FeeLedger{
 const s=structuredClone(original);
 for(const l of [...logs].sort((a,b)=>a.blockNumber===b.blockNumber?(a.logIndex??0)-(b.logIndex??0):a.blockNumber!<b.blockNumber!?-1:1)){
  let e;try{e=decodeEventLog({abi:feeEvents,data:l.data,topics:l.topics});}catch{continue;}
  if(e.eventName==='Transfer'){
   const from=e.args.from.toLowerCase(),to=e.args.to.toLowerCase(),value=e.args.value;
   if(from===zeroAddress)s.supply=String(BigInt(s.supply)+value);
   else {const balance=BigInt(s.balances[from]??'0')-value;if(balance<0n)throw Error('Incomplete LP ownership history');s.balances[from]=String(balance);}
   // V2 permanently locks the initial minimum liquidity at address zero.
   if(to===zeroAddress&&from!==zeroAddress)s.supply=String(BigInt(s.supply)-value);
   else s.balances[to]=String(BigInt(s.balances[to]??'0')+value);
  }else{
   const inputs=[e.args.amount0In,e.args.amount1In];const supply=BigInt(s.supply);
   if(supply<=0n)throw Error('Incomplete pool history');
   for(let i=0;i<2;i++){
    const fee=inputs[i]*3n;s.volume[i]=String(BigInt(s.volume[i])+inputs[i]);s.fees[i]=String(BigInt(s.fees[i])+fee);
    for(const [owner,balance] of Object.entries(s.balances)){
     if(owner===zeroAddress||BigInt(balance)===0n)continue;
     s.earned[owner]??=['0','0'];s.earned[owner][i]=String(BigInt(s.earned[owner][i])+fee*BigInt(balance)/supply);
    }
   }s.swaps++;
  }
 }
 return s;
}
