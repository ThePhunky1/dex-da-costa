import { defineChain, getAddress, isAddress, zeroAddress } from 'viem';
import { createConfig, http, injected } from 'wagmi';
export const localDemo = process.env.NEXT_PUBLIC_LOCAL_DEMO === 'true';
export const explorer = 'https://elysium.kinetiq.xyz/testnet-explorer';
export const elysium = defineChain({
  id: (localDemo ? 31337 : 99801) as number, name: localDemo ? 'Local development' : 'Elysium Testnet',
  nativeCurrency: { name: 'HYPE', symbol: 'HYPE', decimals: 18 },
  rpcUrls: { default: { http: [localDemo ? 'http://127.0.0.1:8545' : (process.env.NEXT_PUBLIC_RPC_URL || 'https://testnet-rpc.elysium.kinetiq.xyz')] } },
  ...(localDemo ? {} : {blockExplorers: {default: {name:'Elysium Explorer',url:explorer}}}), testnet: true,
});
function address(value?:string) {return value && isAddress(value) && value !== zeroAddress ? getAddress(value) : undefined;}
export const routerAddress = address(process.env.NEXT_PUBLIC_ROUTER_ADDRESS);
export const usdcAddress = localDemo ? address(process.env.NEXT_PUBLIC_LOCAL_USDC_ADDRESS) : getAddress('0x7D29d8047B905000459c0E80c34a26CeedcB47b2');
export const config = createConfig({ chains:[elysium], connectors:[injected()], ssr:true, transports:{[elysium.id]:http()} });
