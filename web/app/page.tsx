'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useConnection, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { formatUnits, erc20Abi, type Abi, type Address, type Hash } from 'viem';
import { elysium, explorer, localDemo, routerAddress } from '../lib/config';
import { routerAbi } from '../lib/abi';
import { amount, display, impactBps, liquidityAmounts, minimum, quote } from '../lib/math';
import { readPool } from '../lib/pool';
import { isFreshMarketPrice, type MarketPrice } from '../lib/market-price';
import { pairedLiquidityInput } from '../lib/liquidity-input';
import {markets} from '../lib/tokens';
import {matchAmount} from '../lib/pair-input';
import {swapPlan,liquidityPlan} from '../lib/transactions';
import { WalletMenu } from './wallet-menu';
import { BalanceButtons } from './balance-buttons';
import { gasReserve } from '../lib/balance-fill';
import { Orbit } from './orbit';
function TokenIcon({symbol}:{symbol:string}){return <Image className="tokenIcon" src={`/tokens/${symbol.toLowerCase()}.svg`} width={32} height={32} alt="" aria-hidden="true"/>;}
function errorText(error:unknown){return error instanceof Error?error.message.split('\n')[0]:'The transaction could not be completed.';}
function short(address:string){return `${address.slice(0,6)}…${address.slice(-4)}`;}
export default function Home(){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 const {address,chainId,isConnected}=useConnection();
 const {switchChain,isPending:switching,error:switchError}=useSwitchChain();
 const client=usePublicClient({chainId:elysium.id});const {data:wallet}=useWalletClient();
 const [tab,setTab]=useState<'swap'|'add'|'remove'>('swap');
 const [marketId,setMarketId]=useState('HYPE-USDC');
 const selectedMarket=markets.find(m=>m.id===marketId)!;const {a,b}=selectedMarket;
 const unavailable=a.unavailable||b.unavailable;
 const [hypeIn,setHypeIn]=useState(true);const [input,setInput]=useState('');
 const [liquidityInput,setLiquidityInput]=useState<{side:'hype'|'usdc';text:string}>({side:'usdc',text:''});const [percent,setPercent]=useState(25);
 const [bps,setBps]=useState(50);const [bootstrap,setBootstrap]=useState(false);
 const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');const [error,setError]=useState('');const [hash,setHash]=useState<Hash>();
 const pool=useQuery({queryKey:['pool',elysium.id,routerAddress,marketId,address],queryFn:()=>readPool(client!,routerAddress!,a,b,address),enabled:!!client&&!!routerAddress&&!unavailable,refetchInterval:5000,retry:1});
 const [now,setNow]=useState(0);
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 const market=useQuery<MarketPrice>({queryKey:['hype-market-reference'],queryFn:async()=>{
  const response=await fetch('/api/market-price',{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Reference unavailable');return response.json();
 },refetchInterval:30000,retry:1});
 const reference=!market.isError&&isFreshMarketPrice(market.data,now)?market.data:undefined;
 const p=pool.data;const empty=p?.supply===0n;
 const [manualA,setManualA]=useState('');const [manualB,setManualB]=useState('');
 const referencePair=marketId==='HYPE-USDC';
 const paired=referencePair&&empty?pairedLiquidityInput(liquidityInput.text,liquidityInput.side,p?{hypeReserve:p.reserveA,usdcReserve:p.reserveB,supply:p.supply}:undefined,reference?.price):
  p?matchAmount(liquidityInput.text,liquidityInput.side==='hype'?a.decimals:b.decimals,liquidityInput.side==='hype'?b.decimals:a.decimals,liquidityInput.side==='hype'?p.reserveA:p.reserveB,liquidityInput.side==='hype'?p.reserveB:p.reserveA):'';
 const manual=empty&&!referencePair;
 const hype=manual?manualA:liquidityInput.side==='hype'?liquidityInput.text:paired;
 const usdc=manual?manualB:liquidityInput.side==='usdc'?liquidityInput.text:paired;
 const inputToken=hypeIn?a:b,outputToken=hypeIn?b:a;
 useEffect(()=>setBootstrap(false),[hype,usdc]);
 function fill(side:'hype'|'usdc',text:string){setBootstrap(false);setLiquidityInput({side,text});if(side==='hype')setManualA(text);else setManualB(text);}
 function changeMarket(id:string){setMarketId(id);setInput('');setHypeIn(true);setManualA('');setManualB('');setLiquidityInput({side:'usdc',text:''});setBootstrap(false);setStatus('');setError('');setHash(undefined);}
 const n=amount(input,inputToken.decimals),h=amount(hype,a.decimals),u=amount(usdc,b.decimals);
 const output=p?quote(n,hypeIn?p.reserveA:p.reserveB,hypeIn?p.reserveB:p.reserveA):0n;
 const minOut=minimum(output,bps),impact=p?impactBps(n,output,hypeIn?p.reserveA:p.reserveB,hypeIn?p.reserveB:p.reserveA):0;
 const [usedH,usedU]=p?liquidityAmounts(h,u,p.reserveA,p.reserveB):[0n,0n];
 const lp=(p?.lpBalance??0n)*BigInt(percent)/100n;
 const removeH=p&&p.supply>0n?lp*p.reserveA/p.supply:0n,removeU=p&&p.supply>0n?lp*p.reserveB/p.supply:0n;
 const approvals=tab==='remove'?(p?.exists?[{token:p.pair,symbol:'LP tokens',amount:lp}]:[]):
  tab==='swap'?(inputToken.native?[]:[{token:inputToken.address!,symbol:inputToken.symbol,amount:n}]):
  [...(a.native?[]:[{token:a.address!,symbol:a.symbol,amount:h}]),{token:b.address!,symbol:b.symbol,amount:u}];
 const allowance=useQuery({queryKey:['allowances',elysium.id,routerAddress,address,approvals.map(x=>x.token)],queryFn:()=>Promise.all(approvals.map(x=>client!.readContract({address:x.token,abi:erc20Abi,functionName:'allowance',args:[address!,routerAddress!]}))),enabled:!!client&&!!routerAddress&&!!address&&!unavailable&&approvals.length>0,refetchInterval:5000});
 const approval=approvals.find((x,i)=>x.amount>0n&&(allowance.data?.[i]??0n)<x.amount);
 const needsApproval=!!approval;
 const wrongNetwork=isConnected&&chainId!==elysium.id;
 const availableA=p?.balanceA??0n,availableB=p?.balanceB??0n;
 const insufficient=!!p&&((p.nativeBalance??0n)<gasReserve||(tab==='swap'?(hypeIn?n+(a.native?gasReserve:0n)>availableA:n>availableB):tab==='add'?h+(a.native?gasReserve:0n)>availableA||u>availableB:lp>(p.lpBalance??0n)));
 const valid=tab==='swap'?n>0n&&minOut>0n&&impact<=500:tab==='add'?usedH>0n&&usedU>0n&&minimum(usedH,bps)>0n&&minimum(usedU,bps)>0n&&(!empty||bootstrap):lp>0n&&minimum(removeH,bps)>0n&&minimum(removeU,bps)>0n;
 const fillsDisabled=!mounted||!isConnected||wrongNetwork||busy||!!unavailable||pool.isError||!p||Date.now()-pool.dataUpdatedAt>30000;
 const disabled=fillsDisabled||!wallet||!valid||insufficient||(approvals.some(x=>x.amount>0n)&&(allowance.isPending||allowance.isError));
 useEffect(()=>{setError('');setStatus('');setHash(undefined);setBootstrap(false);},[address,chainId,tab]);
 async function submit(){
  if(disabled||!wallet||!client||!address||!p||!routerAddress)return;
  setBusy(true);setError('');setHash(undefined);setStatus('Checking wallet…');
  try {
   if(await wallet.getChainId()!==elysium.id)throw Error('Switch to the displayed network first.');
   if(!(await wallet.getAddresses()).some(a=>a.toLowerCase()===address.toLowerCase()))throw Error('Wallet account changed. Reconnect and try again.');
   const block=await client.getBlock();
   if(Date.now()/1000-Number(block.timestamp)>120)throw Error('RPC block is stale. Try again later.');
   const deadline=block.timestamp+1200n;
   let target:Address=routerAddress,abi:Abi=routerAbi,name:string,args:readonly unknown[],value:bigint|undefined;
   if(approval){target=approval.token;abi=erc20Abi;name='approve';args=[routerAddress,approval.amount];}
   else {
    const plan=tab==='swap'?swapPlan(!!inputToken.native,!!outputToken.native,n,minOut,hypeIn?[p.tokenA,p.tokenB]:[p.tokenB,p.tokenA],address,deadline):
     liquidityPlan(tab==='remove',!!a.native,p.tokenA,p.tokenB,h,u,tab==='remove'?removeH:usedH,tab==='remove'?removeU:usedU,lp,bps,address,deadline);
    name=plan.name;args=plan.args;value=plan.value;
   }
   setStatus('Checking transaction…');
   const {request}=await client.simulateContract({account:address,address:target,abi,functionName:name,args,value});
   setStatus(needsApproval?'Approve the exact amount in your wallet.':'Review the transaction in your wallet.');
   const tx=await wallet.writeContract({...request,chain:elysium,account:address});setHash(tx);setStatus('Transaction submitted. Waiting for confirmation…');
   const receipt=await client.waitForTransactionReceipt({hash:tx});
   if(receipt.status!=='success')throw Error('Transaction reverted. Your trade was not executed.');
   setStatus(needsApproval?'Approval confirmed. Review the amounts, then continue.':'Transaction confirmed. Balances updated.');
   await Promise.all([pool.refetch(),allowance.refetch()]);
  }catch(e){setError(errorText(e));setStatus('');}finally{setBusy(false);}
 }
 const action=approval?`Approve ${approval.symbol}`:tab==='swap'?'Swap':tab==='add'?'Add liquidity':'Remove liquidity';
 const inputSymbol=inputToken.symbol;const outputSymbol=outputToken.symbol;
 return <main>
  <header>
   <a className="brand" href="/" aria-label="Dex Da Costa home"><span className="mark" aria-hidden="true"><i/><b/></span><span>DEX <strong>DA COSTA</strong><small>ACCESS IS FOR EVERYONE</small></span></a>
   <nav className="headerNav" aria-label="Main navigation"><a href="#exchange">Exchange</a><a href="#pool">The pool</a></nav>
   <div className="wallet"><span className="network"><i/>{localDemo?'Local development':'Elysium testnet'}</span><WalletMenu/></div>
  </header>
  <div className="workspace">
   <section className="intro">
    <div className="eyebrow"><span className="tinyCross">+</span> INDEPENDENT EXCHANGE / ELYSIUM</div>
    <h1>A way in.<br/><span>For everyone.</span></h1>
    <p>More tokens. Open liquidity.<br/>Trade Elysium testnet assets against HYPE and USDC.</p>
    <div className="heroVisual"><Orbit/><Image className="heroCharacter" src="/artwork/agent-k-kinetiq.png" width={1466} height={1073} sizes="(max-width: 760px) 92vw, 540px" priority alt="Agent K wearing mirrored sunglasses and a mechanical exoskeleton, with the Kinetiq wordmark on his science-fiction weapon."/><span className="imageCaption">DA COSTA / OPEN ACCESS</span></div>
    <div className="marketCard">
     <div className="marketLabel"><TokenIcon symbol="HYPE"/><div><strong>HYPE <span>/ USDC</span></strong><small>MAINNET SPOT REFERENCE</small></div><span className="feedState"><i className={reference?'':'offline'}/>{reference?'LIVE FEED':market.isPending?'CONNECTING':'UNAVAILABLE'}</span></div>
     <div className="marketNumbers"><strong>{reference?reference.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}):'—'}<small> USDC</small></strong><span className={reference?.change24h!==null&&reference?.change24h!==undefined?(reference.change24h>=0?'positive':'negative'):''}>{reference?.change24h!==null&&reference?.change24h!==undefined?`${reference.change24h>=0?'+':''}${reference.change24h.toFixed(2)}%`:'—'}<small>24H</small></span></div>
     <div className="marketSource"><a href="https://app.hyperliquid.xyz/trade/HYPE/USDC" target="_blank" rel="noreferrer">Hyperliquid spot ↗</a><span>{reference?`Fetched ${new Date(reference.fetchedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Reference feed unavailable'}</span></div>
     <p className="marketDisclaimer">For context only. Your swap price comes from this testnet pool.</p>
    </div>
   </section>
   <section className="trade" id="exchange" aria-label="Exchange"><div className="tradeHeading"><div><span className="eyebrow">THE EXCHANGE</span><h2>Make your move.</h2></div><span className="tradeNumber" aria-hidden="true">01 /</span></div>
    <nav className="tabs" aria-label="Exchange action">{(['swap','add','remove'] as const).map(t=><button key={t} aria-pressed={tab===t} className={tab===t?'active':''} disabled={busy} onClick={()=>setTab(t)}>{t==='swap'?'Swap':t==='add'?'Add liquidity':'Remove'}</button>)}</nav>
    <div className="marketSelector"><label htmlFor="market">Trading pair</label><select id="market" value={marketId} disabled={busy} onChange={e=>changeMarket(e.target.value)}>{markets.map(m=><option value={m.id} key={m.id}>{m.a.symbol} / {m.b.symbol}{m.a.unavailable||m.b.unavailable?' — awaiting verification':''}</option>)}</select></div>
    {unavailable&&<p className="notice">{b.symbol}: {unavailable}. Trading and liquidity deposits are disabled until the contract is verified.</p>}
    {!routerAddress&&<div className="notice">Testnet preview · Swaps open after pool deployment.</div>}
    {wrongNetwork&&<button className="networkSwitch" disabled={switching} onClick={()=>switchChain({chainId:elysium.id})}>{switching?'Switching…':`Switch to ${elysium.name}`}</button>}
    {tab==='swap'?<>
     <div className="tokenBox"><label htmlFor="swapAmount">You pay</label><div className="amountRow"><input id="swapAmount" inputMode="decimal" placeholder="0.00" value={input} disabled={busy} onChange={e=>setInput(e.target.value)}/><span className="token"><TokenIcon symbol={inputSymbol}/>{inputSymbol}</span></div><div className="balanceFooter"><small>Balance: {display(hypeIn?p?.balanceA:p?.balanceB,inputToken.decimals)}</small><BalanceButtons balance={hypeIn?p?.balanceA:p?.balanceB} decimals={inputToken.decimals} symbol={inputSymbol} reserve={inputToken.native?gasReserve:0n} disabled={fillsDisabled} onFill={setInput}/></div></div>
     <button className="reverse" disabled={busy} aria-label="Reverse swap direction" onClick={()=>{setHypeIn(!hypeIn);setInput('');}}>↓</button>
     <div className="tokenBox"><label>You receive · estimated</label><div className="amountRow"><output>{output>0n?display(output,outputToken.decimals):'0.00'}</output><span className="token"><TokenIcon symbol={outputSymbol}/>{outputSymbol}</span></div><small>Balance: {display(hypeIn?p?.balanceB:p?.balanceA,outputToken.decimals)}</small></div>
     <dl><div><dt>Minimum received</dt><dd>{display(minOut,outputToken.decimals)} {outputSymbol}</dd></div><div><dt>Price impact <small>(excludes fee)</small></dt><dd className={impact>300?'warning':''}>{(impact/100).toFixed(2)}%</dd></div><div><dt>Liquidity provider fee</dt><dd>0.30%</dd></div></dl>
     {impact>500&&<p className="notice">This trade moves the pool price too far. Try a smaller amount (maximum 5% impact).</p>}
     {p&&p.supply===0n&&<p className="notice">This pool is empty. Add the first liquidity to enable swaps.</p>}
    </>:tab==='add'?<>
     <div className="tokenBox"><label htmlFor="hypeAmount">Maximum {a.symbol}</label><div className="amountRow"><input id="hypeAmount" inputMode="decimal" placeholder="0.00" value={hype} disabled={busy} onChange={e=>fill('hype',e.target.value)}/><span className="token"><TokenIcon symbol={a.symbol}/>{a.symbol}</span></div><div className="balanceFooter"><small>Balance: {display(p?.balanceA,a.decimals)}</small><BalanceButtons balance={p?.balanceA} decimals={a.decimals} symbol={a.symbol} reserve={a.native?gasReserve:0n} disabled={fillsDisabled} onFill={text=>fill('hype',text)}/></div></div>
     <div className="tokenBox separated"><label htmlFor="usdcAmount">Maximum {b.symbol}</label><div className="amountRow"><input id="usdcAmount" inputMode="decimal" placeholder="0.00" value={usdc} disabled={busy} onChange={e=>fill('usdc',e.target.value)}/><span className="token"><TokenIcon symbol={b.symbol}/>{b.symbol}</span></div><div className="balanceFooter"><small>Balance: {display(p?.balanceB,b.decimals)}</small><BalanceButtons balance={p?.balanceB} decimals={b.decimals} symbol={b.symbol} disabled={fillsDisabled} onFill={text=>fill('usdc',text)}/></div></div>
     <p className="hint">{empty?(manual?'Enter both amounts. This first deposit sets the price for this testnet pool.':reference?'Suggested starting amounts use the live mainnet reference. Your first deposit sets the testnet pool price; it will not stay pegged to mainnet.':'A fresh market reference is needed to suggest the first deposit. Please wait for the feed to reconnect.'):'Amounts automatically match this testnet pool’s reserve ratio, which can differ from the mainnet reference.'}</p>
     <dl><div><dt>Expected deposit</dt><dd>{display(usedH,a.decimals)} {a.symbol} + {display(usedU,b.decimals)} {b.symbol}</dd></div><div><dt>Minimum accepted</dt><dd>{display(minimum(usedH,bps),a.decimals)} {a.symbol} + {display(minimum(usedU,bps),b.decimals)} {b.symbol}</dd></div></dl>
     <p className="hint">The router deposits tokens at the pool ratio. Unused native HYPE is refunded. Keep HYPE for gas.</p>
     {empty&&<label className="notice check"><input type="checkbox" checked={bootstrap} onChange={e=>setBootstrap(e.target.checked)}/>I understand this first deposit sets the price at {h>0n?Number(formatUnits(u*10n**BigInt(a.decimals)/h,b.decimals)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}):'—'} {b.symbol} per {a.symbol}.</label>}
    </>:<>
     <div className="position"><small>Your liquidity tokens</small><h2>{display(p?.lpBalance,18,8)} <span>LP</span></h2><label htmlFor="removePercent">Remove {percent}%</label><input id="removePercent" type="range" min="1" max="100" value={percent} disabled={busy} onChange={e=>setPercent(Number(e.target.value))}/><div className="percent">{[25,50,75,100].map(v=><button key={v} disabled={busy} className={percent===v?'selected':''} onClick={()=>setPercent(v)}>{v}%</button>)}</div></div>
     <dl><div><dt>Estimated {a.symbol}</dt><dd>{display(removeH,a.decimals)}</dd></div><div><dt>Estimated {b.symbol}</dt><dd>{display(removeU,b.decimals)}</dd></div><div><dt>Minimum {a.symbol}</dt><dd>{display(minimum(removeH,bps),a.decimals)}</dd></div><div><dt>Minimum {b.symbol}</dt><dd>{display(minimum(removeU,bps),b.decimals)}</dd></div></dl>
    </>}
    <div className="slippage"><span>Slippage tolerance</span><div>{[10,50,100].map(s=><button key={s} disabled={busy} aria-pressed={bps===s} className={bps===s?'selected':''} onClick={()=>setBps(s)}>{s/100}%</button>)}</div></div>
    <button className="primary" disabled={disabled} onClick={submit}>{busy?'Transaction in progress…':!mounted||!isConnected?'Connect a wallet to continue':insufficient?'Insufficient balance':action}<span>↗</span></button>
    <p className="hint centered">0.001 HYPE reserved for gas. Transactions expire after 20 minutes.</p>
    {approvals.some(x=>x.amount>0n)&&allowance.isError&&<p role="alert" className="error">Could not read your allowance. Please retry.</p>}
    {(error||pool.error||switchError)&&<p role="alert" className="error">{error||errorText(pool.error||switchError)}</p>}
    {status&&<p role="status" aria-label="Transaction status" className="status">{status}</p>}
    {hash&&!localDemo&&<a className="transaction" href={`${explorer}/transaction/${hash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}
    {hash&&localDemo&&<p className="hint">Transaction: {short(hash)}</p>}
   </section>
  </div>
  <section className="poolBar" id="pool" aria-label="Pool details">
   <div className="poolHeading"><span className="eyebrow">SHARED LIQUIDITY</span><h2>{a.symbol} <span>/</span> {b.symbol}</h2><span className="poolStatus"><i/>{unavailable?'AWAITING VERIFICATION':p?(p.supply>0n?'POOL CONNECTED':p.exists?'EMPTY POOL':'NOT CREATED'):'LOADING POOL'}</span></div>
   <dl className="poolStats"><div><dt>{a.symbol} in pool</dt><dd>{display(p?.reserveA,a.decimals)}<small>{a.symbol}</small></dd></div><div><dt>{b.symbol} in pool</dt><dd>{display(p?.reserveB,b.decimals)}<small>{b.symbol}</small></dd></div><div><dt>Your pool share</dt><dd>{p?.supply&&p.lpBalance!==undefined?`${(Number(p.lpBalance*1000000n/p.supply)/10000).toFixed(4)}%`:'—'}</dd></div><div><dt>LP trading fee</dt><dd>0.30<small>%</small></dd></div></dl>
  </section>
  <section className="belowFold"><div className="testnetNote"><span aria-hidden="true">⊕</span><div><strong>A proving ground. Not a promise.</strong><p>Experimental software, built for Elysium testnet. Test tokens have no monetary value. Liquidity provision can change the mix of tokens you hold.</p></div></div><div className="links"><a href="https://elysium.kinetiq.xyz/testnet-faucet" target="_blank" rel="noreferrer">Get test HYPE <span>↗</span></a><a href="https://elysium.kinetiq.xyz/testnet-bridge" target="_blank" rel="noreferrer">Official bridge <span>↗</span></a><a href="https://elysium.kinetiq.xyz/docs/building-on-elysium" target="_blank" rel="noreferrer">Explore Elysium <span>↗</span></a></div></section>
  <footer><span>DEX DA COSTA <i> / </i> An independent personal project</span><span>{p?.exists?`Block ${p.blockNumber.toString()} · Pool ${short(p.pair)}`:'Built for the way in.'}</span></footer>
 </main>;
}
