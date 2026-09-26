import {test,expect} from '@playwright/test';
test('wallet chooser deduplicates generic injection, renders provider icons and handles rejection',async({page})=>{
 await page.addInitScript(()=>{
  const icon='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="green"/></svg>');
  const provider={on:()=>{},removeListener:()=>{},request:async({method}:{method:string})=>{if(method==='eth_chainId')return '0x7a69';if(method==='eth_accounts')return [];throw Object.assign(new Error('User rejected request'),{code:4001});}};
  Object.defineProperty(window,'ethereum',{value:provider});
  const announce=()=>['Rabby Wallet','MetaMask'].forEach((name,i)=>window.dispatchEvent(new CustomEvent('eip6963:announceProvider',{detail:{info:{uuid:`00000000-0000-4000-8000-00000000000${i}`,name,icon,rdns:`test.wallet${i}`},provider}})));
  window.addEventListener('eip6963:requestProvider',announce);announce();
 });
 await page.setViewportSize({width:390,height:844});await page.goto('/');
 const trigger=page.getByRole('button',{name:'Connect wallet',exact:true});await expect(trigger).toHaveCount(1);await trigger.click();
 const modal=page.getByRole('dialog',{name:'Connect a wallet'});await expect(modal).toBeVisible();
 await expect(modal.locator('.walletChoice')).toHaveCount(2);await expect(modal.locator('img')).toHaveCount(2);
 await expect(modal.getByText('Browser wallet')).toHaveCount(0);
 await modal.getByRole('button',{name:'Rabby Wallet Detected'}).click();await expect(modal.getByRole('alert')).toBeVisible();
 await expect(modal.getByRole('button',{name:'MetaMask Detected'})).toBeEnabled();
 await page.keyboard.press('Escape');await expect(modal).not.toBeVisible();await expect(trigger).toBeFocused();
 await trigger.click();await expect(modal.getByRole('alert')).toHaveCount(0);
 expect(await modal.evaluate(e=>e.getBoundingClientRect().width<=window.innerWidth)).toBe(true);
 await modal.getByRole('button',{name:'Close wallet dialog'}).click();await expect(trigger).toBeFocused();
});
