import {formatUnits} from 'viem';
export const gasReserve=1000000000000000n;
/** Use integer base units so a quick fill never rounds above the available balance. */
export function balanceFill(balance:bigint,decimals:number,percent:number,reserve=0n):string {
 const available=balance>reserve?balance-reserve:0n;
 return formatUnits(available*BigInt(percent)/100n,decimals);
}
