'use client';
import {useEffect,useRef,useState} from 'react';
import {useConnection,useConnect,useConnectors,useDisconnect} from 'wagmi';

function WalletIcon({icon,id,name}:{icon?:string;id?:string;name?:string}){
 const [failedSource,setFailedSource]=useState<string>();
 const source=id==='app.phantom'||name==='Phantom'?'/wallets/phantom.svg':icon?.startsWith('data:image/')?icon:undefined;
 // EIP-6963 icons are rendered as images, never injected SVG markup.
 return source&&failedSource!==source
  ? <img className="walletProviderIcon" src={source} alt="" width={40} height={40} onError={()=>setFailedSource(source)}/>
  : <span className="walletProviderIcon walletFallback" aria-hidden="true">▣</span>;
}
export function WalletMenu(){
 const {address,isConnected,connector}=useConnection();
 const connectors=useConnectors();
 const {connectAsync,isPending,reset}=useConnect();
 const {disconnect}=useDisconnect();
 const [mounted,setMounted]=useState(false),[open,setOpen]=useState(false);
 const [error,setError]=useState(''),[selected,setSelected]=useState('');
 const [legacyAvailable,setLegacyAvailable]=useState(false);
 const dialog=useRef<HTMLDialogElement>(null);
 const trigger=useRef<HTMLButtonElement>(null);
 const named=connectors.filter(c=>c.id!=='injected');
 const choices=named.length?named:legacyAvailable?connectors:[];
 useEffect(()=>setMounted(true),[]);
 useEffect(()=>{let active=true;const legacy=connectors.find(c=>c.id==='injected');
  if(legacy)void legacy.getProvider().then(p=>{if(active)setLegacyAvailable(!!p);}).catch(()=>{if(active)setLegacyAvailable(false);});
  return()=>{active=false;};
 },[connectors,open]);
 useEffect(()=>{const node=dialog.current;if(open&&!node?.open)node?.showModal();if(!open&&node?.open)node.close();},[open]);
 useEffect(()=>{if(!open)return;const previous=document.body.style.overflow;document.body.style.overflow='hidden';return()=>{document.body.style.overflow=previous;};},[open]);
 function close(){setOpen(false);trigger.current?.focus();}
 async function choose(c:(typeof connectors)[number]){
  if(isPending)return;setError('');setSelected(c.uid);
  try{await connectAsync({connector:c});close();}catch(e){setError((e as {shortMessage?:string}).shortMessage||'Connection was declined or could not be completed. Try again in your wallet.');}
 }
 return <>
  <button ref={trigger} className="secondary walletTrigger" disabled={!mounted} onClick={()=>{setError('');if(!isPending)reset();setOpen(true);}} aria-haspopup="dialog">
   {mounted&&isConnected&&address?`${address.slice(0,6)}…${address.slice(-4)}`:'Connect wallet'}<span aria-hidden="true"> ↗</span>
  </button>
  <dialog ref={dialog} className="walletDialog" aria-labelledby="wallet-dialog-title" aria-describedby="wallet-dialog-description" onCancel={close} onClose={()=>{setOpen(false);trigger.current?.focus();}} onClick={e=>{if(e.target===e.currentTarget){const r=e.currentTarget.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)close();}}}>
   <div className="walletDialogTop"><span className="eyebrow">DEX DA COSTA</span><button className="walletClose" onClick={close} aria-label="Close wallet dialog">×</button></div>
   <h2 id="wallet-dialog-title">{isConnected?'Your wallet':'Connect a wallet'}</h2>
   <p id="wallet-dialog-description">{isConnected?'Connected to Dex Da Costa.':choices.length?'Choose a wallet detected in this browser.':'No compatible wallet detected. Open this site in your wallet’s browser, or enable an Ethereum wallet extension and refresh.'}</p>
   {isConnected?<div className="walletAccount"><WalletIcon icon={connector?.icon} id={connector?.id} name={connector?.name}/><strong>{connector?.name||'Browser wallet'}</strong><code>{address}</code><button className="primary" onClick={()=>{disconnect();close();}}>Disconnect</button></div>:<div className="walletChoices">{choices.map(c=><button key={c.uid} className="walletChoice" disabled={isPending} onClick={()=>void choose(c)}><WalletIcon icon={c.icon} id={c.id} name={c.name}/><span><strong>{c.id==='injected'?'Browser wallet':c.name}</strong><small>{isPending&&selected===c.uid?'Waiting for approval…':'Detected'}</small></span><span className="walletChoiceArrow" aria-hidden="true">↗</span></button>)}</div>}
   {isPending&&<p role="status" className="status">Approve the connection in your wallet. You can close this popup while waiting.</p>}
   {error&&<p role="alert" className="error">{error}</p>}
   {!isConnected&&<p className="walletFootnote">Connecting does not authorize a transaction. You stay in control of every signature.</p>}
  </dialog>
 </>;
}
