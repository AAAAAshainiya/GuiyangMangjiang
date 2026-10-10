import type { Metadata,Viewport } from 'next';
import type {CSSProperties} from 'react';
import {headers} from 'next/headers';
import {getAccount} from '@/lib/account-server';
import type {Account} from '@/lib/account-shared';
import {themeStyle} from '@/lib/themes';
import './globals.css';
import {AccountProvider} from './account-context';
export const metadata:Metadata={title:'贵阳捉鸡麻将',description:'约朋友开一桌，不足四人电脑补位。贵阳捉鸡麻将在线练习。',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
// Account-specific HTML must never be prerendered or shared between visitors.
export const dynamic='force-dynamic';
export default async function RootLayout({children}:{children:React.ReactNode}){
 let user:Account|null|undefined;
 try{const h=await headers();user=await getAccount(new Request('https://mahjong.internal',{headers:{cookie:h.get('cookie')??''}}))}catch{/* AccountProvider can retry; a database outage must not break the table. */}
 const theme=user?.theme??'jade';
 return <html lang="zh-CN" data-mj-theme={theme} style={themeStyle(theme) as CSSProperties}><body><AccountProvider initialUser={user}>{children}</AccountProvider></body></html>;
}
