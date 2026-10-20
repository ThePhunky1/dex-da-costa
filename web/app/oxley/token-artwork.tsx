'use client';
import Image from 'next/image';
import {useState} from 'react';
export function TokenArtwork({src,symbol}:{src?:string;symbol:string}){
 const [failed,setFailed]=useState(false);
 return <span className="oxleyArtwork" aria-hidden="true">{src&&!failed?<Image unoptimized src={src} alt="" width={48} height={48} loading="lazy" referrerPolicy="no-referrer" onError={()=>setFailed(true)}/>:<span>{symbol.slice(0,2).toUpperCase()}</span>}</span>;
}
