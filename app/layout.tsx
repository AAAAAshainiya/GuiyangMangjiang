import type { Metadata,Viewport } from 'next';
import './globals.css';
export const metadata:Metadata={title:'贵阳捉鸡麻将',description:'约朋友开一桌，不足四人电脑补位。贵阳捉鸡麻将在线练习。',icons:{icon:'/favicon.svg',shortcut:'/favicon.svg'}};
export const viewport:Viewport={width:'device-width',initialScale:1,viewportFit:'cover'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-CN"><body>{children}</body></html>}
