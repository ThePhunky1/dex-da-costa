import {createPublicClient, defineChain, http, parseUnits} from 'viem';
import {createMarketPriceLoader} from '../lib/market-price';
import {readPool} from '../lib/pool';
import {simulateRebalance} from '../lib/rebalance';

// Deliberately no wallet client, private key, approvals, or broadcast capability.
const chain = defineChain({id:99801, name:'Elysium testnet', nativeCurrency:{name:'HYPE',symbol:'HYPE',decimals:18}, rpcUrls:{default:{http:['https://testnet-rpc.elysium.kinetiq.xyz']}}});
const router = '0x72D435b8030A5195Bdb7594EDEa1ff315B9994c7';
function value(name: string, fallback: string, decimals: number) {
  const text = process.env[name] ?? fallback;
  if (!new RegExp(`^\\d+(?:\\.\\d{1,${decimals}})?$`).test(text)) throw Error(`Invalid ${name}`);
  return parseUnits(text, decimals);
}
async function main() {
  const client = createPublicClient({chain,transport:http(process.env.ELYSIUM_RPC_URL || chain.rpcUrls.default.http[0],{timeout:10000,retryCount:0})});
  const [pool, reference] = await Promise.all([
    readPool(client,router,{symbol:'HYPE',decimals:18,native:true},{symbol:'USDC',decimals:6,address:'0x7D29d8047B905000459c0E80c34a26CeedcB47b2'}),
    createMarketPriceLoader()(),
  ]);
  if (pool.pair.toLowerCase() !== '0xfb3a6f0b6ec7837eaf298efe0e5dc534bf1d746a' || pool.factory.toLowerCase() !== '0xfa456ad175f0bdb9285960720b4b6e8f25deb3f9' || pool.wrapper.toLowerCase() !== '0xff5681eb95bbacfbb334f80fcdbc31fb59f22332') throw Error('Unexpected deployment');
  const now = Date.now();
  const budget = {
    hypeInventory:value('SIM_HYPE_INVENTORY','10',18), usdcInventory:value('SIM_USDC_INVENTORY','1000',6),
    maxHype:value('SIM_MAX_HYPE','1',18), maxUsdc:value('SIM_MAX_USDC','100',6), gasReserve:parseUnits('0.001',18),
  };
  console.log(JSON.stringify({mode:'simulation-only',observedAt:new Date(now).toISOString(),chainId:99801,router,pair:pool.pair,block:pool.blockNumber.toString(),
    reference, budgetBaseUnits:Object.fromEntries(Object.entries(budget).map(([k,v])=>[k,v.toString()])),
    caveats:['Hypothetical inventory, not wallet balances.','Single price source; independent confirmation required before any future automation.','One observation, not a cumulative budget or backtest.','Excludes gas cost and concurrent trades. No transaction is sent.'],
    result:simulateRebalance({hype:pool.reserveA,usdc:pool.reserveB,blockTimestamp:Number(pool.timestamp)*1000,reference,now,...budget}),
  },null,2));
}
main().catch(()=>{
  // RPC errors can contain credential-bearing URLs: do not print raw exceptions.
  console.error('Simulation stopped: check network availability, fresh reference/pool data, deployment identity and SIM_* inputs. No transaction was sent.');
  process.exitCode=1;
});
