import {balanceFill} from '../lib/balance-fill';
export function BalanceButtons({balance,decimals,symbol,reserve=0n,disabled,onFill}:{balance?:bigint;decimals:number;symbol:string;reserve?:bigint;disabled:boolean;onFill:(value:string)=>void}){
 return <div className="balanceButtons" role="group" aria-label={`${symbol} balance shortcuts`}>{[25,50,75,100].map(percent=><button type="button" key={percent} disabled={disabled||balance===undefined||balance<=reserve} aria-label={`Use ${percent===100?'maximum':`${percent}% of`} available ${symbol}`} onClick={()=>onFill(balanceFill(balance!,decimals,percent,reserve))}>{percent===100?'Max':`${percent}%`}</button>)}</div>;
}
