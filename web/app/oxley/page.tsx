'use client';
import {useEffect,useMemo,useRef,useState} from 'react';
import {useInfiniteQuery,useQuery} from '@tanstack/react-query';
import {useConnection,usePublicClient,useWalletClient,useSwitchChain} from 'wagmi';
import {erc20Abi,formatUnits,type Address,type Hex} from 'viem';
import type {DiscoveryCursor} from '@oxley/sdk';
import snapshot from '../../public/data/oxley-markets.json';
import {oxleyClient,nextOxleyTransaction,walletRejected,assertFreshSwap,journalKey,readPending,type PendingOxley} from '../../lib/oxley';
import {elysium,explorer,localDemo} from '../../lib/config';
import {amount} from '../../lib/math';
import {bufferedFees,transactionError} from '../../lib/transaction-feedback';
import {WalletMenu} from '../wallet-menu';
import {BalanceButtons} from '../balance-buttons';

export default function OxleyPage(){
 const {address,chainId}=useConnection();const client=usePublicClient({chainId:elysium.id});const {data:wallet}=useWalletClient();const {switchChain}=useSwitchChain();
 const sdk=useMemo(()=>client&&!localDemo?oxleyClient(client):undefined,[client]);
 const [search,setSearch]=useState(''),[filter,setFilter]=useState(''),[id,setId]=useState<Hex>(),[buy,setBuy]=useState(true),[input,setInput]=useState(''),[bps,setBps]=useState(50);
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState(''),[pending,setPending]=useState<PendingOxley|null>(null),[ready,setReady]=useState(false),[now,setNow]=useState(0);
 const lock=useRef(false);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key===journalKey){try{setPending(readPending(event.newValue));}catch(e){setReady(false);setError(transactionError(e));}}};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync);},[]);
 useEffect(()=>{try{setPending(readPending(localStorage.getItem(journalKey)));setReady(true);}catch(e){setError(transactionError(e));}const t=setInterval(()=>setNow(Date.now()),1000);setNow(Date.now());return()=>clearInterval(t);},[]);
 useEffect(()=>{const t=setTimeout(()=>setFilter(search.trim()),400);return()=>clearTimeout(t);},[search]);
 const catalog=useInfiniteQuery({queryKey:['oxley-catalog'],initialPageParam:undefined as DiscoveryCursor|undefined,queryFn:async({pageParam})=>{
  if(!pageParam)return {items:snapshot.items,cursor:snapshot.cursor as DiscoveryCursor,hasMore:true};
  const page=await sdk!.discoverMarkets({cursor:pageParam,pageSize:10000});
  const items=await Promise.all(page.markets.map(async m=>{
   const [name,symbol]=await Promise.all(['name','symbol'].map(functionName=>client!.readContract({address:m.coin,abi:erc20Abi,functionName:functionName as 'name'|'symbol'})));
   return {dealId:m.id,coin:m.coin,name,symbol,status:'active'};
  }));return {items,cursor:page.cursor,hasMore:page.hasMore};
 },getNextPageParam:p=>p.cursor,enabled:!!sdk,retry:false,staleTime:Infinity});
 const allRows=Array.from(new Map((catalog.data?.pages.flatMap(p=>p.items)??snapshot.items).map(x=>[x.dealId,x])).values());
 const rows=allRows.filter(x=>[x.name,x.symbol,x.dealId,x.coin].some(v=>v.toLowerCase().includes(filter.toLowerCase())));
 useEffect(()=>{const pages=catalog.data?.pages;if(!pages||pages.length<2||!pages.at(-1)?.hasMore||catalog.isFetching||catalog.isError)return;const t=setTimeout(()=>void catalog.fetchNextPage(),2000);return()=>clearTimeout(t);},[catalog.data,catalog.isFetching,catalog.isError,catalog.fetchNextPage]);
 const selected=allRows.find(x=>x.dealId===id);
 const market=useQuery({queryKey:['oxley-market',id],queryFn:()=>sdk!.getMarket(id!),enabled:!!sdk&&!!id,retry:false,refetchInterval:30000});
 const m=market.data?.market;
 const decimals=buy?6:18, outDecimals=buy?18:6;
 const tokenIn=m?(buy?m.quoteToken:m.coin):undefined;
 const symbol=selected?.symbol.slice(0,32)||'Token',inSymbol=buy?'Oxy-USDC':symbol,outSymbol=buy?symbol:'Oxy-USDC';
 const [settledInput,setSettledInput]=useState('');
 useEffect(()=>{const t=setTimeout(()=>setSettledInput(input),300);return()=>clearTimeout(t);},[input]);
 const n=amount(settledInput,decimals);
 const quote=useQuery({queryKey:['oxley-quote',id,buy,n.toString(),address,bps],queryFn:async()=>{
  const s=await sdk!.prepareSwap({marketId:id!,tokenIn:tokenIn!,tokenOut:buy?m!.coin:m!.quoteToken,amountIn:n,caller:address!,slippageBps:bps,ttlSeconds:300});assertFreshSwap(s,address!);return s;
 },enabled:!!sdk&&!!m&&!!address&&chainId===99801&&n>0n&&!busy&&!pending,retry:false,refetchInterval:15000});
 const balances=useQuery({queryKey:['oxley-balance',tokenIn,address],queryFn:async()=>({token:await client!.readContract({address:tokenIn!,abi:erc20Abi,functionName:'balanceOf',args:[address!]}),native:await client!.getBalance({address:address!})}),enabled:!!tokenIn&&!!address&&!localDemo,refetchInterval:15000});
 const s=quote.data;const fresh=!!s&&!quote.isError&&now/1000-Number(s.quote.timestamp)<=60;
 function persist(p:PendingOxley|null){if(p)localStorage.setItem(journalKey,JSON.stringify(p));else localStorage.removeItem(journalKey);setPending(p);}
 async function reconcile(){
  if(!pending?.hash||!client)return;
  try{const receipt=await client.getTransactionReceipt({hash:pending.hash});persist(null);setMessage(receipt.status==='success'?'Transaction confirmed. Balances updated; request a fresh quote for your next step.':'Transaction reverted. No swap was completed.');await Promise.all([balances.refetch(),quote.refetch()]);}catch{setMessage('Receipt is not available yet. The transaction remains pending; check your wallet and explorer before retrying.');}
 }
 async function submit(){
  if(lock.current||!sdk||!s||!address||!wallet||!client||pending)return;
  if(readPending(localStorage.getItem(journalKey))){setError('A pending wallet request must be checked first.');return;}
  lock.current=true;setBusy(true);setError('');setMessage('Checking quote and wallet…');let requested=false;
  try{
   assertFreshSwap(s,address);
   if(await wallet.getChainId()!==99801||(await wallet.getAddresses())[0]?.toLowerCase()!==address.toLowerCase())throw Error('Wallet changed. Reconnect and refresh your quote.');
   const {transaction:tx,isApproval:approval}=await nextOxleyTransaction(sdk,s,address);
   if(approval)await client.call({account:address,to:tx.to,data:tx.data,value:0n});
   const [block,estimate]=await Promise.all([client.getBlock(),client.estimateFeesPerGas()]);
   if(Date.now()/1000-Number(block.timestamp)>120)throw Error('Network data is stale. Retry later.');
   assertFreshSwap(s,address);
   const fees=bufferedFees(block.baseFeePerGas,estimate);
   const gas=await client.estimateGas({account:address,to:tx.to,data:tx.data,value:0n});
   if(await client.getBalance({address})<gas*fees.maxFeePerGas)throw Error('Not enough HYPE for network gas.');
   assertFreshSwap(s,address);
   if(await wallet.getChainId()!==99801||(await wallet.getAddresses())[0]?.toLowerCase()!==address.toLowerCase())throw Error('Wallet changed before signing. Refresh the quote.');
   persist({account:address,started:Date.now()});requested=true;
   setMessage(approval?'Confirm the token approval in your wallet.':'Confirm the Oxley swap in your wallet.');
   const hash=await wallet.sendTransaction({account:address,chain:elysium,to:tx.to,data:tx.data,value:0n,...fees});
   persist({account:address,started:Date.now(),hash});
   const receipt=await client.waitForTransactionReceipt({hash,timeout:60000});
   persist(null);
   if(receipt.status!=='success')throw Error('Transaction reverted. Check the explorer for details.');
   setMessage(approval?'Approval confirmed. Refresh the quote, then continue to swap.':'Swap confirmed.');
   await Promise.all([balances.refetch(),quote.refetch()]);
  }catch(e){const text=transactionError(e);setError(text);if(requested&&walletRejected(e))persist(null);}
  finally{lock.current=false;setBusy(false);}
 }
 const canTrade=input===settledInput&&ready&&!busy&&!pending&&chainId===99801&&!!wallet&&fresh&&!market.isError&&n>0n&&balances.data!==undefined&&!balances.isError&&balances.data.token>=n;

 return <main className="oxleyPage"><header><a className="brand" href="/" aria-label="Dex Da Costa home"><span className="mark" aria-hidden="true"><i/><b/></span><span>DEX <strong>DA COSTA</strong><small>ACCESS IS FOR EVERYONE</small></span></a><nav className="headerNav" aria-label="Main navigation"><a href="/">Exchange & pools</a><a href="/oxley" aria-current="page">Oxley markets</a></nav><WalletMenu/></header>
 <section className="oxleyHeading"><span className="eyebrow">ELYSIUM TESTNET / OXLEY</span><h1>Discover. Trade.</h1><p>Trade launched tokens using Oxley’s existing liquidity.</p><p className="notice">These markets use Oxy-USDC, a test token separate from bridged USDC. It has no cash value. HYPE pays network gas.</p><a className="textLink" href="https://app.oxley.fun/bridge" target="_blank" rel="noreferrer">Get Oxy-USDC from Oxley’s faucet ↗</a></section>
 <div className="oxleyGrid"><section className="oxleyCatalog" aria-label="Oxley market catalog"><h2>Oxley launches</h2>
 {localDemo?<p>Oxley markets are available on Elysium testnet only.</p>:<><label htmlFor="oxley-search">Find a token</label><input id="oxley-search" value={search} maxLength={66} disabled={busy} onChange={e=>setSearch(e.target.value)} placeholder="Name, symbol or market ID"/>
 <p>Onchain market list, initially checked {snapshot.checkedAt.slice(0,10)}. Each market is verified again before quoting.</p>
 {catalog.isFetchingNextPage&&<p role="status">Checking newer activation events…</p>}{catalog.isError&&<p role="alert">Discovery unavailable. The saved list remains visible; retry later. {transactionError(catalog.error)}</p>}
 {rows.map(row=><button key={row.dealId} className={`oxleyMarket ${row.dealId===id?'selected':''}`} disabled={busy||!!pending} onClick={()=>{setId(row.dealId as Hex);setInput('');setError('');setMessage('');}}><strong>{row.symbol.slice(0,32)}</strong><span>{row.name.slice(0,70)}</span><small>{row.status} · {row.coin.slice(0,8)}…{row.coin.slice(-4)}</small></button>)}
 {!catalog.isPending&&!catalog.isError&&rows.length===0&&<p>No launches found on this page.</p>}
 <button disabled={catalog.isFetching||busy} onClick={()=>void catalog.fetchNextPage()}>Check newer launches</button>
 <p>Checked through block {catalog.data?.pages.at(-1)?.cursor.blockNumber??snapshot.cursor.blockNumber}. {catalog.data?.pages.at(-1)?.hasMore?'More history may remain; check again to continue.':'Caught up to the latest check.'}</p></>}

 </section><section className="oxleyTrade" aria-label="Oxley trading"><h2>{selected?`${symbol} / Oxy-USDC`:'Choose a launch'}</h2>
 {selected&&<><p className="oxleyAddress"><a href={`${explorer}/address/${selected.coin}`} target="_blank" rel="noreferrer">Token: {selected.coin} ↗</a><br/>Market: {id}</p>
 {market.isPending&&<p>Verifying market contracts…</p>}{market.isError&&<p role="alert">This launch is not currently tradable through the verified Oxley deployment, or its chain data is unavailable. Active auctions and older deployments may be unsupported.</p>}
 <div className="tabs"><button aria-pressed={buy} disabled={busy||!!pending} onClick={()=>{setBuy(true);setInput('');}}>Buy</button><button aria-pressed={!buy} disabled={busy||!!pending} onClick={()=>{setBuy(false);setInput('');}}>Sell</button></div>
 <label htmlFor="oxley-amount">You pay · {inSymbol}</label><input id="oxley-amount" inputMode="decimal" value={input} disabled={busy||!!pending} onChange={e=>setInput(e.target.value)} placeholder="0.00"/>
 <p>Balance: {balances.data&&!balances.isError?formatUnits(balances.data.token,decimals):'—'} {inSymbol}</p><BalanceButtons balance={balances.data?.token} decimals={decimals} symbol={inSymbol} disabled={busy||!!pending||balances.isError||chainId!==99801} onFill={setInput}/>
 <label htmlFor="oxley-slippage">Slippage tolerance</label><select id="oxley-slippage" value={bps} disabled={busy||!!pending} onChange={e=>setBps(Number(e.target.value))}><option value={10}>0.1%</option><option value={50}>0.5%</option><option value={100}>1%</option></select>
 <dl><dt>Estimated received</dt><dd>{fresh?`${formatUnits(s!.quote.amountOut,outDecimals)} ${outSymbol}`:'—'}</dd><dt>Minimum received</dt><dd>{fresh?`${formatUnits(s!.minAmountOut,outDecimals)} ${outSymbol}`:'—'}</dd><dt>Oxley fee · included in quote</dt><dd>{fresh?`${formatUnits(s!.quote.feeAmount,6)} Oxy-USDC`:'—'}</dd></dl>
 <p>Ordinary Oxley trading fee: 2%. No Dex Da Costa LP fee. Quotes expire after 60 seconds; signed swaps have a 5-minute deadline.</p>
 {quote.isFetching&&<p role="status">Updating quote…</p>}{quote.isError&&<p role="alert">Quote unavailable: {transactionError(quote.error)}</p>}
 <button disabled={busy||!!pending||!n||!address} onClick={()=>void quote.refetch()}>Refresh quote</button>
 {address&&chainId!==99801?<button onClick={()=>switchChain({chainId:elysium.id})} disabled={localDemo}>Switch to Elysium testnet</button>:<button className="primary" disabled={!canTrade} onClick={()=>void submit()}>{busy?'Transaction in progress…':!address?'Connect a wallet to trade':'Continue · approval or swap'}</button>}
 {balances.data&&n>balances.data.token&&<p>Insufficient {inSymbol} balance.</p>}</>}
 {pending&&<div className="notice"><p>A previous wallet request needs checking before another transaction can be sent.</p>{pending.hash?<><a className="textLink" href={`${explorer}/transaction/${pending.hash}`} target="_blank" rel="noreferrer">View transaction ↗</a><button disabled={busy} onClick={()=>void reconcile()}>Check confirmation</button></>:<><p>No transaction hash was returned. Check your wallet activity for this account: {pending.account}.</p><button disabled={busy} onClick={()=>{if(window.confirm('Only clear this request after checking that it was rejected or that no transaction was broadcast. Have you checked your wallet activity?'))persist(null);}}>I checked my wallet; no transaction was sent</button></>}</div>}
 {message&&<p role="status">{message}</p>}{error&&<p role="alert">{error}</p>}
 </section></div></main>;
}
