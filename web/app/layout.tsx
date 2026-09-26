import type { Metadata } from 'next';
import { Providers } from './providers';
import './style.css';
export const metadata:Metadata={title:'Dex Da Costa · The way in',description:'Dex Da Costa. An independent HYPE and USDC exchange on Elysium testnet. Access is for everyone.'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="en"><body><Providers>{children}</Providers></body></html>;}
