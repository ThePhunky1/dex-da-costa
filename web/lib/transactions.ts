import type {Address} from 'viem';
import {minimum} from './math';
export function swapPlan(nativeIn:boolean,nativeOut:boolean,n:bigint,minOut:bigint,path:Address[],to:Address,deadline:bigint){
 return nativeIn?{name:'swapExactETHForTokens',args:[minOut,path,to,deadline],value:n}:
 {name:nativeOut?'swapExactTokensForETH':'swapExactTokensForTokens',args:[n,minOut,path,to,deadline],value:undefined};
}
// Supported markets place the base asset (HYPE or USDC) first; token B is always ERC-20.
export function liquidityPlan(remove:boolean,nativeA:boolean,tokenA:Address,tokenB:Address,a:bigint,b:bigint,usedA:bigint,usedB:bigint,lp:bigint,bps:number,to:Address,deadline:bigint){
 const minA=minimum(usedA,bps),minB=minimum(usedB,bps);
 if(remove)return nativeA?{name:'removeLiquidityETH',args:[tokenB,lp,minB,minA,to,deadline],value:undefined}:{name:'removeLiquidity',args:[tokenA,tokenB,lp,minA,minB,to,deadline],value:undefined};
 return nativeA?{name:'addLiquidityETH',args:[tokenB,b,minB,minA,to,deadline],value:a}:{name:'addLiquidity',args:[tokenA,tokenB,a,b,minA,minB,to,deadline],value:undefined};
}
