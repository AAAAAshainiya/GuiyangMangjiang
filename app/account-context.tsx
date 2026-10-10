'use client';
import {createContext,useContext,useEffect,useState,useCallback,useRef} from 'react';
import {THEMES,type ThemeId} from '@/lib/themes';
import type {Account} from '@/lib/account-shared';
import type {GameRules} from '@/lib/rules';
export async function accountRequest(path:string,body?:unknown){const response=await fetch(path,{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(15000),...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});let data:any;try{data=await response.json()}catch{throw new Error('账号连接暂时不可用，请稍后重试')}if(!response.ok)throw new Error(data.error||'连接失败，请重试');return data}
export function applyTheme(id:ThemeId){const t=THEMES.find(t=>t.id===id)??THEMES[0],el=document.documentElement;el.dataset.mjTheme=t.id;for(const [k,v] of Object.entries(t))if(!['id','name','description'].includes(k))el.style.setProperty('--mj-'+k.replace(/[A-Z]/g,c=>'-'+c.toLowerCase()),v)}
type Context={user:Account|null,ready:boolean,error:string,backupStatus:string,refresh:()=>Promise<Account|null>,accept:(user:Account|null)=>void,save:(action:string,fields:any)=>Promise<Account>,saveRules:(rules:GameRules)=>Promise<Account>};
const AccountContext=createContext<Context|null>(null);
export function AccountProvider({children}:{children:React.ReactNode}){
 const identityEpoch=useRef(0);const [user,setUser]=useState<Account|null>(null),[ready,setReady]=useState(false),[error,setError]=useState(''),[backupStatus,setBackupStatus]=useState('');
 const accept=useCallback((u:Account|null)=>{identityEpoch.current++;setUser(u);setError('');setReady(true);applyTheme(u?.theme??'jade');try{if(u)localStorage.setItem('mahjong-profile',JSON.stringify({name:u.nickname,avatar:u.avatar}))}catch{}},[]);
 const refresh=useCallback(async()=>{const epoch=identityEpoch.current,data=await accountRequest('/api/account');if(epoch!==identityEpoch.current) return null;accept(data.user);return data.user as Account|null},[accept]);
 useEffect(()=>{let active=true;const epoch=identityEpoch.current;accountRequest('/api/account').then(d=>{if(active&&epoch===identityEpoch.current)accept(d.user)}).catch(()=>{if(active){setError('账号连接暂时不可用，可重试登录');setReady(true)}});return()=>{active=false}},[accept]);
 const save=useCallback(async(action:string,fields:any)=>{if(!user)throw new Error('请先登录账号');const epoch=identityEpoch.current;try{const data=await accountRequest('/api/account',{action,revision:user.revision,...fields});if(identityEpoch.current!==epoch)throw new Error('账号状态已变化，请重新操作');accept(data.user);setBackupStatus(data.backup?.pending?'设置已保存，云备份等待重试':'设置已保存，云备份已完成');return data.user as Account}catch(e){try{await refresh()}catch{}throw e}},[user,accept,refresh]);
 const saveRules=useCallback((rules:GameRules)=>save('rules',{rules}),[save]);
 return <AccountContext.Provider value={{user,ready,error,backupStatus,refresh,accept,save,saveRules}}>{children}</AccountContext.Provider>;
}
export function useAccount(){const ctx=useContext(AccountContext);if(!ctx)throw new Error('AccountProvider missing');return ctx}
