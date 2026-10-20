import { createOxleyClient, type Swap } from '@oxley/sdk';
import deployment from '@oxley/sdk/deployments/elysium-testnet.json';
import type { PublicClient, Address } from 'viem';
export const oxleyDeployment = deployment;
export const oxleyClient = (publicClient:PublicClient)=>createOxleyClient({deployment,publicClient});
export function assertFreshSwap(swap:Swap, account:Address, now=Date.now()) {
 if(swap.quote.chainId!==99801||swap.quote.caller.toLowerCase()!==account.toLowerCase())throw Error('Wallet or network changed. Refresh the quote.');
 const age=now/1000-Number(swap.quote.timestamp);
 if(age>60||age< -30||Number(swap.deadline)<=now/1000)throw Error('Quote expired. Refresh the quote before continuing.');
 if(swap.minAmountOut<=0n)throw Error('Minimum received must be greater than zero.');
}
export type PendingOxley={account:Address;hash?:`0x${string}`;started:number};
export const journalKey='dex-oxley-pending-v1';
export function readPending(raw:string|null):PendingOxley|null {
 if(!raw)return null;
 try{const p=JSON.parse(raw);if(/^0x[0-9a-f]{40}$/i.test(p.account)&&Number.isFinite(p.started)&&(!p.hash||/^0x[0-9a-f]{64}$/i.test(p.hash)))return p;}catch{}
 throw Error('Saved transaction record is unreadable. Check wallet activity before trading again.');
}
export async function nextOxleyTransaction(sdk:Pick<ReturnType<typeof oxleyClient>,'checkSwap'>,swap:Swap,account:Address){
 assertFreshSwap(swap,account);
 const funding=await sdk.checkSwap(swap);
 if(!funding.sufficientBalance)throw Error('Insufficient token balance.');
 const approval=funding.approvals[0];
 if(!approval)await sdk.checkSwap(swap,true);
 return {transaction:approval??swap.transaction,isApproval:!!approval};
}
export function walletRejected(error:unknown):boolean {
 const seen=new Set<unknown>();let e=error;
 for(let i=0;i<8&&e&&typeof e==='object'&&!seen.has(e);i++){
  seen.add(e);const value=e as {code?:unknown;cause?:unknown};if(value.code===4001)return true;e=value.cause;
 }return false;
}
