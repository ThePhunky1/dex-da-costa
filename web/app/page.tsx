'use client';
import { useEffect, useState } from 'react';
import Image from 'next/image';
import { useQuery } from '@tanstack/react-query';
import { useConnection, usePublicClient, useSwitchChain, useWalletClient } from 'wagmi';
import { formatUnits, erc20Abi, type Abi, type Address, type Hash } from 'viem';
import { elysium, explorer, localDemo, routerAddress, usdcAddress } from '../lib/config';
import { routerAbi } from '../lib/abi';
import { amount, display, impactBps, liquidityAmounts, minimum, quote } from '../lib/math';
import { readPool } from '../lib/pool';
import { isFreshMarketPrice, type MarketPrice } from '../lib/market-price';
import { pairedLiquidityInput } from '../lib/liquidity-input';
import { WalletMenu } from './wallet-menu';
import { BalanceButtons } from './balance-buttons';
import { gasReserve } from '../lib/balance-fill';
import { Orbit } from './orbit';
function TokenIcon({symbol}:{symbol:'HYPE'|'USDC'}){return <Image className="tokenIcon" src={`/tokens/${symbol.toLowerCase()}.svg`} width={32} height={32} alt="" aria-hidden="true"/>;}
function errorText(error:unknown){return error instanceof Error?error.message.split('\n')[0]:'The transaction could not be completed.';}
function short(address:string){return `${address.slice(0,6)}…${address.slice(-4)}`;}
export default function Home(){
 const [mounted,setMounted]=useState(false);
 useEffect(()=>setMounted(true),[]);
 const {address,chainId,isConnected}=useConnection();
 const {switchChain,isPending:switching,error:switchError}=useSwitchChain();
 const client=usePublicClient({chainId:elysium.id});const {data:wallet}=useWalletClient();
 const [tab,setTab]=useState<'swap'|'add'|'remove'>('swap');
 const [hypeIn,setHypeIn]=useState(true);const [input,setInput]=useState('');
 const [liquidityInput,setLiquidityInput]=useState<{side:'hype'|'usdc';text:string}>({side:'usdc',text:''});const [percent,setPercent]=useState(25);
 const [bps,setBps]=useState(50);const [bootstrap,setBootstrap]=useState(false);
 const [busy,setBusy]=useState(false);const [status,setStatus]=useState('');const [error,setError]=useState('');const [hash,setHash]=useState<Hash>();
 const pool=useQuery({queryKey:['pool',elysium.id,routerAddress,usdcAddress,address],queryFn:()=>readPool(client!,routerAddress!,usdcAddress!,address),enabled:!!client&&!!routerAddress&&!!usdcAddress,refetchInterval:5000,retry:1});
 const [now,setNow]=useState(0);
 useEffect(()=>{setNow(Date.now());const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 const market=useQuery<MarketPrice>({queryKey:['hype-market-reference'],queryFn:async()=>{
  const response=await fetch('/api/market-price',{cache:'no-store',signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error('Reference unavailable');return response.json();
 },refetchInterval:30000,retry:1});
 const reference=!market.isError&&isFreshMarketPrice(market.data,now)?market.data:undefined;
 const p=pool.data;
 const paired=pairedLiquidityInput(liquidityInput.text,liquidityInput.side,p,reference?.price);
 const hype=liquidityInput.side==='hype'?liquidityInput.text:paired;
 const usdc=liquidityInput.side==='usdc'?liquidityInput.text:paired;
 useEffect(()=>setBootstrap(false),[hype,usdc]);
 const n=amount(input,hypeIn?18:6);const h=amount(hype,18);const u=amount(usdc,6);
 const output=p?quote(n,hypeIn?p.hypeReserve:p.usdcReserve,hypeIn?p.usdcReserve:p.hypeReserve):0n;
 const minOut=minimum(output,bps);const impact=p?impactBps(n,output,hypeIn?p.hypeReserve:p.usdcReserve,hypeIn?p.usdcReserve:p.hypeReserve):0;
 const [usedH,usedU]=p?liquidityAmounts(h,u,p.hypeReserve,p.usdcReserve):[0n,0n];
 const lp=(p?.lpBalance??0n)*BigInt(percent)/100n;
 const removeH=p&&p.supply>0n?lp*p.hypeReserve/p.supply:0n;
 const removeU=p&&p.supply>0n?lp*p.usdcReserve/p.supply:0n;
 const approvalToken=tab==='remove'?p?.pair:usdcAddress;
 const approvalAmount=tab==='swap'?(hypeIn?0n:n):tab==='add'?u:lp;
 const allowance=useQuery({queryKey:['allowance',elysium.id,approvalToken,routerAddress,address],queryFn:()=>client!.readContract({address:approvalToken!,abi:erc20Abi,functionName:'allowance',args:[address!,routerAddress!]}),enabled:!!client&&!!approvalToken&&!!routerAddress&&!!address,refetchInterval:5000});
 const needsApproval=approvalAmount>0n&&(allowance.data??0n)<approvalAmount;
 const empty=p?.supply===0n;
 const wrongNetwork=isConnected&&chainId!==elysium.id;
 const insufficient=!!p&&(tab==='swap'?(hypeIn?n+gasReserve>(p.hypeBalance??0n):n>(p.usdcBalance??0n)):
 tab==='add'?h+gasReserve>(p.hypeBalance??0n)||u>(p.usdcBalance??0n):lp>(p.lpBalance??0n));
 const valid=tab==='swap'?n>0n&&minOut>0n&&impact<=500:tab==='add'?usedH>0n&&usedU>0n&&minimum(usedH,bps)>0n&&minimum(usedU,bps)>0n&&(!empty||bootstrap):lp>0n&&minimum(removeH,bps)>0n&&minimum(removeU,bps)>0n;
 const fillsDisabled=!mounted||!isConnected||wrongNetwork||busy||pool.isError||!p||Date.now()-pool.dataUpdatedAt>30000;
 const disabled=!mounted||!isConnected||wrongNetwork||!wallet||!p||pool.isError||Date.now()-pool.dataUpdatedAt>30000||busy||!valid||insufficient||(approvalAmount>0n&&(allowance.isPending||allowance.isError));
 useEffect(()=>{setError('');setStatus('');setHash(undefined);setBootstrap(false);},[address,chainId,tab]);
 async function submit(){
  if(disabled||!wallet||!client||!address||!p||!routerAddress||!usdcAddress)return;
  setBusy(true);setError('');setHash(undefined);setStatus('Checking wallet…');
  try {
   if(await wallet.getChainId()!==elysium.id)throw Error('Switch to the displayed network first.');
   if(!(await wallet.getAddresses()).some(a=>a.toLowerCase()===address.toLowerCase()))throw Error('Wallet account changed. Reconnect and try again.');
   const block=await client.getBlock();
   if(Date.now()/1000-Number(block.timestamp)>120)throw Error('RPC block is stale. Try again later.');
   const deadline=block.timestamp+1200n;
   let target:Address=routerAddress,abi:Abi=routerAbi,name:string,args:readonly unknown[],value:bigint|undefined;
   if(needsApproval){target=approvalToken!;abi=erc20Abi;name='approve';args=[routerAddress,approvalAmount];}
   else if(tab==='swap'){
    const path=hypeIn?[p.wrapper,usdcAddress]:[usdcAddress,p.wrapper];
    name=hypeIn?'swapExactETHForTokens':'swapExactTokensForETH';
    args=hypeIn?[minOut,path,address,deadline]:[n,minOut,path,address,deadline];value=hypeIn?n:undefined;
   }else if(tab==='add'){
    name='addLiquidityETH';args=[usdcAddress,u,minimum(usedU,bps),minimum(usedH,bps),address,deadline];value=h;
   }else {name='removeLiquidityETH';args=[usdcAddress,lp,minimum(removeU,bps),minimum(removeH,bps),address,deadline];}
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
 const action=needsApproval?`Approve ${tab==='remove'?'LP tokens':'USDC'}`:tab==='swap'?'Swap':tab==='add'?'Add liquidity':'Remove liquidity';
 const inputSymbol=hypeIn?'HYPE':'USDC';const outputSymbol=hypeIn?'USDC':'HYPE';
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
    <p>Two tokens. One open pool.<br/>Swap HYPE and USDC on Elysium testnet.</p>
    <div className="heroVisual"><Orbit/><Image className="heroCharacter" src="/artwork/da-costa-hyperliquid-v2.png" width={1466} height={1073} sizes="(max-width: 760px) 92vw, 540px" priority alt="Stylized Max Da Costa in an exoskeleton, with the Hyperliquid emblem and wordmark on his science-fiction weapon."/><span className="imageCaption">DA COSTA / OPEN ACCESS</span></div>
    <div className="marketCard">
     <div className="marketLabel"><TokenIcon symbol="HYPE"/><div><strong>HYPE <span>/ USDC</span></strong><small>MAINNET SPOT REFERENCE</small></div><span className="feedState"><i className={reference?'':'offline'}/>{reference?'LIVE FEED':market.isPending?'CONNECTING':'UNAVAILABLE'}</span></div>
     <div className="marketNumbers"><strong>{reference?reference.price.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}):'—'}<small> USDC</small></strong><span className={reference?.change24h!==null&&reference?.change24h!==undefined?(reference.change24h>=0?'positive':'negative'):''}>{reference?.change24h!==null&&reference?.change24h!==undefined?`${reference.change24h>=0?'+':''}${reference.change24h.toFixed(2)}%`:'—'}<small>24H</small></span></div>
     <div className="marketSource"><a href="https://app.hyperliquid.xyz/trade/HYPE/USDC" target="_blank" rel="noreferrer">Hyperliquid spot ↗</a><span>{reference?`Fetched ${new Date(reference.fetchedAt).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'})}`:'Reference feed unavailable'}</span></div>
     <p className="marketDisclaimer">For context only. Your swap price comes from this testnet pool.</p>
    </div>
   </section>
   <section className="trade" id="exchange" aria-label="Exchange"><div className="tradeHeading"><div><span className="eyebrow">THE EXCHANGE</span><h2>Make your move.</h2></div><span className="tradeNumber" aria-hidden="true">01 /</span></div>
    <nav className="tabs" aria-label="Exchange action">{(['swap','add','remove'] as const).map(t=><button key={t} aria-pressed={tab===t} className={tab===t?'active':''} disabled={busy} onClick={()=>setTab(t)}>{t==='swap'?'Swap':t==='add'?'Add liquidity':'Remove'}</button>)}</nav>
    {!routerAddress&&<div className="notice">Testnet preview · Swaps open after pool deployment.</div>}
    {wrongNetwork&&<button className="networkSwitch" disabled={switching} onClick={()=>switchChain({chainId:elysium.id})}>{switching?'Switching…':`Switch to ${elysium.name}`}</button>}
    {tab==='swap'?<>
     <div className="tokenBox"><label htmlFor="swapAmount">You pay</label><div className="amountRow"><input id="swapAmount" inputMode="decimal" placeholder="0.00" value={input} disabled={busy} onChange={e=>setInput(e.target.value)}/><span className="token"><TokenIcon symbol={inputSymbol}/>{inputSymbol}</span></div><div className="balanceFooter"><small>Balance: {display(hypeIn?p?.hypeBalance:p?.usdcBalance,hypeIn?18:6)}</small><BalanceButtons balance={hypeIn?p?.hypeBalance:p?.usdcBalance} decimals={hypeIn?18:6} symbol={inputSymbol} reserve={hypeIn?gasReserve:0n} disabled={fillsDisabled} onFill={setInput}/></div></div>
     <button className="reverse" disabled={busy} aria-label="Reverse swap direction" onClick={()=>{setHypeIn(!hypeIn);setInput('');}}>↓</button>
     <div className="tokenBox"><label>You receive · estimated</label><div className="amountRow"><output>{output>0n?display(output,hypeIn?6:18):'0.00'}</output><span className="token"><TokenIcon symbol={outputSymbol}/>{outputSymbol}</span></div><small>Balance: {display(hypeIn?p?.usdcBalance:p?.hypeBalance,hypeIn?6:18)}</small></div>
     <dl><div><dt>Minimum received</dt><dd>{display(minOut,hypeIn?6:18)} {outputSymbol}</dd></div><div><dt>Price impact <small>(excludes fee)</small></dt><dd className={impact>300?'warning':''}>{(impact/100).toFixed(2)}%</dd></div><div><dt>Liquidity provider fee</dt><dd>0.30%</dd></div></dl>
     {impact>500&&<p className="notice">This trade moves the pool price too far. Try a smaller amount (maximum 5% impact).</p>}
     {p&&p.supply===0n&&<p className="notice">This pool is empty. Add the first liquidity to enable swaps.</p>}
    </>:tab==='add'?<>
     <div className="tokenBox"><label htmlFor="hypeAmount">Maximum HYPE</label><div className="amountRow"><input id="hypeAmount" inputMode="decimal" placeholder="0.00" value={hype} disabled={busy} onChange={e=>{setBootstrap(false);setLiquidityInput({side:'hype',text:e.target.value});}}/><span className="token"><TokenIcon symbol="HYPE"/>HYPE</span></div><div className="balanceFooter"><small>Balance: {display(p?.hypeBalance)}</small><BalanceButtons balance={p?.hypeBalance} decimals={18} symbol="HYPE" reserve={gasReserve} disabled={fillsDisabled} onFill={text=>{setBootstrap(false);setLiquidityInput({side:'hype',text});}}/></div></div>
     <div className="tokenBox separated"><label htmlFor="usdcAmount">Maximum USDC</label><div className="amountRow"><input id="usdcAmount" inputMode="decimal" placeholder="0.00" value={usdc} disabled={busy} onChange={e=>{setBootstrap(false);setLiquidityInput({side:'usdc',text:e.target.value});}}/><span className="token"><TokenIcon symbol="USDC"/>USDC</span></div><div className="balanceFooter"><small>Balance: {display(p?.usdcBalance,6)}</small><BalanceButtons balance={p?.usdcBalance} decimals={6} symbol="USDC" disabled={fillsDisabled} onFill={text=>{setBootstrap(false);setLiquidityInput({side:'usdc',text});}}/></div></div>
     <p className="hint">{empty?(reference?'Suggested starting amounts use the live mainnet reference. Your first deposit sets the testnet pool price; it will not stay pegged to mainnet.':'A fresh market reference is needed to suggest the first deposit. Please wait for the feed to reconnect.'):'Amounts automatically match this testnet pool’s reserve ratio, which can differ from the mainnet reference.'}</p>
     <dl><div><dt>Expected deposit</dt><dd>{display(usedH)} HYPE + {display(usedU,6)} USDC</dd></div><div><dt>Minimum accepted</dt><dd>{display(minimum(usedH,bps))} HYPE + {display(minimum(usedU,bps),6)} USDC</dd></div></dl>
     <p className="hint">The router matches the pool ratio, refunds unused HYPE and only transfers the USDC needed. Keep HYPE for gas.</p>
     {empty&&<label className="notice check"><input type="checkbox" checked={bootstrap} onChange={e=>setBootstrap(e.target.checked)}/>I understand this first deposit sets the price at {h>0n?Number(formatUnits(u*10n**18n/h,6)).toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:4}):'—'} USDC per HYPE.</label>}
    </>:<>
     <div className="position"><small>Your liquidity tokens</small><h2>{display(p?.lpBalance,18,8)} <span>LP</span></h2><label htmlFor="removePercent">Remove {percent}%</label><input id="removePercent" type="range" min="1" max="100" value={percent} disabled={busy} onChange={e=>setPercent(Number(e.target.value))}/><div className="percent">{[25,50,75,100].map(v=><button key={v} disabled={busy} className={percent===v?'selected':''} onClick={()=>setPercent(v)}>{v}%</button>)}</div></div>
     <dl><div><dt>Estimated HYPE</dt><dd>{display(removeH)}</dd></div><div><dt>Estimated USDC</dt><dd>{display(removeU,6)}</dd></div><div><dt>Minimum HYPE</dt><dd>{display(minimum(removeH,bps))}</dd></div><div><dt>Minimum USDC</dt><dd>{display(minimum(removeU,bps),6)}</dd></div></dl>
    </>}
    <div className="slippage"><span>Slippage tolerance</span><div>{[10,50,100].map(s=><button key={s} disabled={busy} aria-pressed={bps===s} className={bps===s?'selected':''} onClick={()=>setBps(s)}>{s/100}%</button>)}</div></div>
    <button className="primary" disabled={disabled} onClick={submit}>{busy?'Transaction in progress…':!mounted||!isConnected?'Connect a wallet to continue':insufficient?'Insufficient balance':action}<span>↗</span></button>
    <p className="hint centered">{tab==='swap'&&hypeIn||tab==='add'?'0.001 HYPE reserved for gas. ':''}Transactions expire after 20 minutes.</p>
    {approvalAmount>0n&&allowance.isError&&<p role="alert" className="error">Could not read your allowance. Please retry.</p>}
    {(error||pool.error||switchError)&&<p role="alert" className="error">{error||errorText(pool.error||switchError)}</p>}
    {status&&<p role="status" className="status">{status}</p>}
    {hash&&!localDemo&&<a className="transaction" href={`${explorer}/transaction/${hash}`} target="_blank" rel="noreferrer">View transaction ↗</a>}
    {hash&&localDemo&&<p className="hint">Transaction: {short(hash)}</p>}
   </section>
  </div>
  <section className="poolBar" id="pool" aria-label="Pool details">
   <div className="poolHeading"><span className="eyebrow">SHARED LIQUIDITY</span><h2>HYPE <span>/</span> USDC</h2><span className="poolStatus"><i/>{p?'POOL CONNECTED':'AWAITING DEPLOYMENT'}</span></div>
   <dl className="poolStats"><div><dt>HYPE in pool</dt><dd>{display(p?.hypeReserve)}<small>HYPE</small></dd></div><div><dt>USDC in pool</dt><dd>{display(p?.usdcReserve,6)}<small>USDC</small></dd></div><div><dt>Your pool share</dt><dd>{p?.supply&&p.lpBalance!==undefined?`${(Number(p.lpBalance*1000000n/p.supply)/10000).toFixed(4)}%`:'—'}</dd></div><div><dt>LP trading fee</dt><dd>0.30<small>%</small></dd></div></dl>
  </section>
  <section className="belowFold"><div className="testnetNote"><span aria-hidden="true">⊕</span><div><strong>A proving ground. Not a promise.</strong><p>Experimental software, built for Elysium testnet. Test tokens have no monetary value. Liquidity provision can change the mix of tokens you hold.</p></div></div><div className="links"><a href="https://elysium.kinetiq.xyz/testnet-faucet" target="_blank" rel="noreferrer">Get test HYPE <span>↗</span></a><a href="https://elysium.kinetiq.xyz/testnet-bridge" target="_blank" rel="noreferrer">Official bridge <span>↗</span></a><a href="https://elysium.kinetiq.xyz/docs/building-on-elysium" target="_blank" rel="noreferrer">Explore Elysium <span>↗</span></a></div></section>
  <footer><span>DEX DA COSTA <i> / </i> An independent personal project</span><span>{p?`Block ${p.blockNumber.toString()} · Pool ${short(p.pair)}`:'Built for the way in.'}</span></footer>
 </main>;
}
