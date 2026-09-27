import {test,expect} from '@playwright/test';
// A local-only injected wallet forwards requests to Anvil's unlocked TEST accounts.
// No signatures/keys from the user's wallet are involved.
test.beforeEach(async({page})=>{
 await page.addInitScript(()=>{
  if(location.hostname!=='127.0.0.1')return;
  const listeners:Record<string,((...args:unknown[])=>void)[]>={};
  const ethereum={isMetaMask:true,on:(event:string,fn:(...args:unknown[])=>void)=>{(listeners[event]??=[]).push(fn);},removeListener:()=>{},request:async({method,params}:{method:string,params?:unknown[]})=>{
   if(method==='wallet_switchEthereumChain')return null;
   if(method==='wallet_requestPermissions')return [{parentCapability:'eth_accounts'}];
   const result=await fetch('http://127.0.0.1:8545',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method:method==='eth_requestAccounts'?'eth_accounts':method,params:params??[]})}).then(r=>r.json());
   if(result.error)throw result.error;return result.result;
  }};
  Object.defineProperty(window,'ethereum',{value:ethereum});
 });
});
test('local wallet swaps both ways and adds/removes liquidity',async({page})=>{
 await page.goto('/');await expect(page.getByText('Local development',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Browser wallet Detected'}).click();
 await expect(page.getByRole('dialog')).not.toBeVisible();
 await expect(page.locator('.walletTrigger')).toContainText('0x');
 await page.getByLabel('You pay').fill('0.1');
 await page.getByRole('button',{name:'Swap ↗',exact:true}).click();
 await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Transaction confirmed',{timeout:20000});
 await page.getByLabel('Reverse swap direction').click();await page.getByLabel('You pay').fill('1');
 await page.getByRole('button',{name:'Approve USDC'}).click();
 await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Approval confirmed',{timeout:20000});
 await page.getByRole('button',{name:'Swap ↗',exact:true}).click();
 await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Transaction confirmed',{timeout:20000});
 await page.getByRole('button',{name:'Add liquidity',exact:true}).click();
 await page.getByLabel('Maximum HYPE').fill('0.1');await page.getByLabel('Maximum USDC').fill('2');
 await page.getByRole('button',{name:'Approve USDC'}).click();await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Approval confirmed',{timeout:20000});
 await page.getByRole('button',{name:'Add liquidity ↗',exact:true}).click();await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Transaction confirmed',{timeout:20000});
 await page.getByRole('button',{name:'Remove',exact:true}).click();
 await page.getByRole('button',{name:'Approve LP tokens'}).click();await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Approval confirmed',{timeout:20000});
 await page.getByRole('button',{name:'Remove liquidity ↗',exact:true}).click();await expect(page.getByRole('status',{name:'Transaction status',exact:true})).toContainText('Transaction confirmed',{timeout:20000});
 await expect(page.locator('.error')).toHaveCount(0);
});
test('mobile layout and invalid input',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 await page.getByRole('button',{name:'Connect wallet',exact:true}).click();
 await page.getByRole('dialog').getByRole('button',{name:'Browser wallet Detected'}).click();
 await page.getByLabel('You pay').fill('-1');await expect(page.getByRole('button',{name:'Swap ↗',exact:true})).toBeDisabled();
 for(const width of [390,360,320]){
  await page.setViewportSize({width,height:844});
  const dimensions=await page.evaluate(()=>({content:document.documentElement.scrollWidth,viewport:innerWidth,overflow:[...document.querySelectorAll('body *')].filter(e=>e.getBoundingClientRect().right>innerWidth).map(e=>({tag:e.tagName,className:e.className,text:e.textContent?.slice(0,100),parent:e.parentElement?.className,right:e.getBoundingClientRect().right}))}));
  expect(dimensions.content,`Page overflows at ${width}px: ${JSON.stringify(dimensions.overflow)}`).toBeLessThanOrEqual(dimensions.viewport);
 }
});
