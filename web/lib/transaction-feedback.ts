/** EIP-1559 cap headroom, not an instruction to spend the cap. */
export function bufferedFees(base:bigint|null,estimate:{maxFeePerGas:bigint;maxPriorityFeePerGas:bigint}){
 if(base===null||base<0n||estimate.maxFeePerGas<0n||estimate.maxPriorityFeePerGas<0n)throw Error('Could not estimate current network fees. Please retry.');
 const floor=base*2n+estimate.maxPriorityFeePerGas;
 return {maxFeePerGas:estimate.maxFeePerGas>floor?estimate.maxFeePerGas:floor,maxPriorityFeePerGas:estimate.maxPriorityFeePerGas};
}
export function transactionError(error:unknown):string{
 const parts:string[]=[];const codes:unknown[]=[];const seen=new Set<unknown>();
 function visit(value:unknown,depth=0){
  if(!value||typeof value!=='object'||depth>6||seen.has(value))return;seen.add(value);
  const e=value as Record<string,unknown>;codes.push(e.code);
  for(const key of ['name','shortMessage','message','details','reason'])if(typeof e[key]==='string')parts.push(e[key] as string);
  visit(e.cause,depth+1);visit(e.data,depth+1);visit(e.error,depth+1);
 }
 visit(error);const text=parts.join(' ').toLowerCase();
 if(codes.includes(4001)||/user rejected|user denied/.test(text))return 'Request cancelled in your wallet. Nothing new was submitted by this request.';
 if(/max fee per gas.*(less|lower)|fee cap.*(less|low)|maxfeepergas.*(low|base)|transaction underpriced|gas price.*(low|base)/.test(text))return 'The network fee changed before submission. Retry for an updated fee estimate and review the fee in your wallet.';
 if(/insufficient funds|exceeds.*balance/.test(text))return 'Not enough HYPE to cover the transaction and network fee. Keep some HYPE available for gas.';
 if(/expired|deadline/.test(text))return 'This transaction quote expired. Refresh the amounts and try again.';
 if(/insufficient_output_amount|excessive_input_amount|insufficient_[ab]_amount/.test(text))return 'The pool price moved beyond your slippage limit. Refresh the quote and review the amounts before retrying.';
 if(/revert/.test(text))return 'The transaction could not be completed, and the wallet or network supplied no usable explanation. Refresh balances and the quote, check your network fee, and retry. If a transaction was submitted, check its explorer status first.';
 if(/timeout|timed out|fetch failed|http request|rpc request failed|rpc rejected|connections are temporarily unavailable|network.*error/.test(text))return 'The wallet or network did not respond. If you already submitted a transaction, check its explorer status before trying again.';
 const message=error instanceof Error?error.message.split('\n').find(line=>line.trim()):undefined;
 return message&&!/following reason:|execution reverted/i.test(message)?message.slice(0,240):'The transaction could not be completed. Refresh balances and try again; check any submitted transaction in the explorer first.';
}
