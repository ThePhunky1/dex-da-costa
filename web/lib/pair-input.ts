import {formatUnits} from 'viem';
import {amount} from './math';
export function matchAmount(text:string,decimalsIn:number,decimalsOut:number,reserveIn:bigint,reserveOut:bigint):string {
 const n=amount(text,decimalsIn);
 if(!n||reserveIn<=0n||reserveOut<=0n)return '';
 const result=(n*reserveOut+reserveIn-1n)/reserveIn;
 return result<(1n<<112n)?formatUnits(result,decimalsOut):'';
}
