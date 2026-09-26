import { formatUnits, parseUnits } from 'viem';
export function amount(text:string,decimals:number):bigint {
  if(text.startsWith('.'))text=`0${text}`;
  // viem parseUnits rounds excess precision. Reject it instead for transaction inputs.
  if(!new RegExp(`^\\d+(?:\\.\\d{0,${decimals}})?$`).test(text))return 0n;
  try {const n=parseUnits(text,decimals);return n>0n&&n<(1n<<112n)?n:0n;}catch{return 0n;}
}
export function quote(input:bigint,reserveIn:bigint,reserveOut:bigint):bigint {
  if(input<=0n||reserveIn<=0n||reserveOut<=0n)return 0n;
  return input*997n*reserveOut/(reserveIn*1000n+input*997n);
}
export function minimum(value:bigint,bps:number):bigint {
  if(!Number.isInteger(bps)||bps<0||bps>100)throw Error('Slippage must be between 0 and 1%');
  return value*BigInt(10000-bps)/10000n;
}
export function impactBps(input:bigint,out:bigint,rin:bigint,rout:bigint):number {
  if(input<=0n||rin<=0n||rout<=0n)return 0;
  const numerator=input*997n*rout;const actual=out*1000n*rin;
  return Number((numerator>actual?numerator-actual:0n)*10000n/numerator);
}
export function liquidityAmounts(h:bigint,u:bigint,rh:bigint,ru:bigint):[bigint,bigint] {
  if(rh===0n&&ru===0n)return [h,u];
  if(rh===0n||ru===0n)return [0n,0n];
  const optimalU=h*ru/rh;return optimalU<=u?[h,optimalU]:[u*rh/ru,u];
}
export function display(value:bigint|undefined,decimals=18,places=6):string {
  if(value===undefined)return '—';
  const [whole,fraction='']=formatUnits(value,decimals).split('.');
  const trimmed=fraction.slice(0,places).replace(/0+$/,'');
  if(value>0n&&whole==='0'&&!trimmed)return `<0.${'0'.repeat(places-1)}1`;
  return `${whole}${trimmed?'.'+trimmed:''}`;
}
