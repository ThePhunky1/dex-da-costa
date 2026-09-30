import {getAddress, type Address} from 'viem';
import {localDemo,usdcAddress} from './config';
export type Token={symbol:string;decimals:number;address?:Address;native?:boolean;unavailable?:string};
const token=(symbol:string,address:string,unavailable?:string):Token=>({symbol,decimals:18,address:getAddress(address),unavailable});
export const tokens:Token[]=[
 {symbol:'HYPE',decimals:18,native:true},
 {symbol:'USDC',decimals:6,address:usdcAddress},
 token('PURR',localDemo?(process.env.NEXT_PUBLIC_LOCAL_PURR_ADDRESS||'0x0000000000000000000000000000000000000001'):'0x5688c9Ca58435Ee982c16cCBE05eAC6993e32Bdd',localDemo&&!process.env.NEXT_PUBLIC_LOCAL_PURR_ADDRESS?'Local token not configured':undefined),
 token('kHYPE','0xd63d373D3a529fA935C2e3B470dbB394B0EDb56f','Awaiting verified token deployment'),
 token('kmHYPE','0x5218bE476C6197934A0aA89c39698d12058fe230',localDemo?'Local token not configured':undefined),
 token('KNTQ','0xDb3d47D1C7aB037e1250d0b70EF077996af6f2ff','Awaiting team confirmation: contract reports MTWOZ'),
 token('sKNTQ','0xE51A294DD40D5887678A694F70C5C547788A8Add','Awaiting verified token deployment'),
];
export const markets=[{id:'HYPE-USDC',a:tokens[0],b:tokens[1]},...tokens.slice(2).flatMap(t=>[tokens[0],tokens[1]].map(base=>({id:`${base.symbol}-${t.symbol}`,a:base,b:t})))];
