import {formatUnits,parseUnits} from 'viem';
import {amount} from './math';
/** Token amounts, not swap quotes: no trading fee applies to the deposit ratio. */
export function pairedLiquidityInput(text:string,side:'hype'|'usdc',pool:{hypeReserve:bigint;usdcReserve:bigint;supply:bigint}|undefined,referencePrice?:number):string {
 const input=amount(text,side==='hype'?18:6);
 if(!input||!pool)return '';
 let rh=pool.hypeReserve,ru=pool.usdcReserve;
 if(pool.supply===0n&&rh===0n&&ru===0n){
  if(!referencePrice||!Number.isFinite(referencePrice)||referencePrice<=0||referencePrice>=1e12)return '';
  rh=10n**18n;ru=parseUnits(referencePrice.toFixed(6),6);
 }
 if(rh<=0n||ru<=0n)return '';
 // Round the matching maximum up by at most one token base unit.
 const numerator=input*(side==='hype'?ru:rh),denominator=side==='hype'?rh:ru;
 const result=(numerator+denominator-1n)/denominator;
 if(result>=(1n<<112n))return '';
 return formatUnits(result,side==='hype'?6:18);
}
