'use client';
import {useQuery} from '@tanstack/react-query';
import {useState} from 'react';
import {parseAbi,type Address,type PublicClient} from 'viem';
import {applyFeeLogs,emptyLedger,type FeeSnapshot} from '../lib/fee-history';
import {display} from '../lib/math';
const factory='0xfa456ad175f0bdb9285960720b4b6e8f25deb3f9';
const firstPair='0xfb3a6f0b6ec7837eaf298efe0e5dc534bf1d746a';
type Props={client?:PublicClient;pair:Address;factory:Address;tokenA:Address;account?:Address;a:{symbol:string;decimals:number};b:{symbol:string;decimals:number}};
export function FeePanel({client,pair,factory:actualFactory,tokenA,account,a,b}:Props){
 const [refresh,setRefresh]=useState(false);const [progress,setProgress]=useState('');
 const supported=client?.chain?.id===99801&&actualFactory.toLowerCase()===factory;
 const history=useQuery({queryKey:['fee-history',pair,refresh],enabled:supported,staleTime:60000,retry:false,queryFn:async({signal})=>{
  let snapshot:FeeSnapshot|undefined;
  if(pair.toLowerCase()===firstPair){
   const response=await fetch('/data/hype-usdc-fees.json',{signal});if(!response.ok)throw Error('History checkpoint unavailable');snapshot=await response.json();
   if(snapshot?.chainId!==99801||snapshot.pair.toLowerCase()!==pair.toLowerCase())throw Error('Invalid history checkpoint');
  }
  if(!refresh)return snapshot??null;
  if(await client!.getChainId()!==99801)throw Error('Wrong history network');
  if(snapshot&&(await client!.getBlock({blockNumber:BigInt(snapshot.block)})).hash!==snapshot.blockHash)throw Error('History checkpoint changed. Please try again after the next update.');
  const end=await client!.getBlock({blockNumber:(await client!.getBlockNumber())-20n});
  let ledger=snapshot?.ledger??emptyLedger();
  for(let start=snapshot?BigInt(snapshot.block)+1n:311827n;start<=end.number;start+=100000n){
   signal.throwIfAborted();setProgress('Reading confirmed pool history…');
   await new Promise(r=>setTimeout(r,1800));signal.throwIfAborted();
   ledger=applyFeeLogs(ledger,await client!.getLogs({address:pair,fromBlock:start,toBlock:start+99999n>end.number?end.number:start+99999n}));
  }
  const supply=await client!.readContract({address:pair,abi:parseAbi(['function totalSupply() view returns(uint256)']),functionName:'totalSupply',blockNumber:end.number});
  if(String(supply)!==ledger.supply)throw Error('Incomplete LP history');
  const token0=snapshot?.token0??await client!.readContract({address:pair,abi:parseAbi(['function token0() view returns(address)']),functionName:'token0'});
  return {chainId:99801,pair,token0,block:String(end.number),blockHash:end.hash,timestamp:Number(end.timestamp),ledger} satisfies FeeSnapshot;
 }});
 const data=history.data;const first=data?.token0.toLowerCase()===tokenA.toLowerCase();const ai=first?0:1,bi=first?1:0;
 const own=account&&data?data.ledger.earned[account.toLowerCase()]??['0','0']:undefined;
 const fmt=(values:string[]|undefined,fees=false)=>values?`${display(BigInt(values[ai]),a.decimals+(fees?3:0))} ${a.symbol} + ${display(BigInt(values[bi]),b.decimals+(fees?3:0))} ${b.symbol}`:'—';
 return <section className="feePanel" aria-label="LP fee history">
  <h3>Fees at work</h3><p className="hint">Swap fees stay in the pool and compound into LP shares. Withdrawing liquidity includes your share of accrued fees; there is no separate fee balance to claim.</p>
  {supported?<>
   <dl><div><dt>Pool swap fees · lifetime</dt><dd>{fmt(data?.ledger.fees,true)}</dd></div><div><dt>Swap input volume · lifetime</dt><dd>{fmt(data?.ledger.volume)}</dd></div><div><dt>Swaps recorded</dt><dd>{data?.ledger.swaps.toLocaleString()??'—'}</dd></div><div><dt>Your historical fees · estimate</dt><dd>{account?fmt(own,true):'Connect wallet'}</dd></div></dl>
   <p className="hint">Personal estimates use your LP ownership at each swap, including transfers. They include fees from positions already withdrawn and exclude earnings before you received LP tokens. These are historical token amounts, not profit or an additional withdrawal amount. Token prices and pool composition can change.</p>
   {data&&<p className="hint">History through {new Date(data.timestamp*1000).toLocaleString('en-US')} · Block {data.block}. Recent transactions may not yet appear.</p>}
   <button disabled={history.isFetching} onClick={()=>{if(refresh)void history.refetch();else setRefresh(true);}}>{history.isFetching?(progress||'Loading history…'):'Update fee history'}</button>
   {history.isError&&<p role="status" className="hint">Fee history could not be updated. Try again later. Trading and withdrawals are unaffected.</p>}
   {!data&&!history.isFetching&&!history.isError&&<p className="hint">Update fee history to scan this pool from deployment. Large histories can take several minutes.</p>}
  </>:<p className="hint">Historical reporting is available for verified Elysium pools.</p>}
 </section>;
}
