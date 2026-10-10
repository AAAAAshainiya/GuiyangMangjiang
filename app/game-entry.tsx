'use client';
import {useEffect,useState} from 'react';
import {Users,Bot,GraduationCap} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {PlayerAvatar} from './game-avatar';
import {AvatarPicker} from './game-progress';
import {validRoomCode} from '@/lib/interaction';

type Mode='multi'|'solo'|'learn';
const modes=[
 {id:'multi',name:'多人模式',description:'好友联机 · 人机补位',Icon:Users},
 {id:'solo',name:'单人模式',description:'三个人机 · 随时暂停',Icon:Bot},
 {id:'learn',name:'新手模式',description:'单机教学 · 逐步引导',Icon:GraduationCap},
] as const;
export function GameEntry({accountName,onAccount,name,avatar,code,tab,busy,initialized,profileLoaded,onName,onAvatar,onCode,onTab,onOnline,onLocal}:{
 accountName?:string;onAccount?:()=>void;name:string;avatar:string;code:string;tab:string;busy:boolean;initialized:boolean;profileLoaded:boolean;
 onName:(v:string)=>void;onAvatar:(v:string)=>void;onCode:(v:string)=>void;onTab:(v:string)=>void;
 onOnline:(action:string)=>void;onLocal:(mode:'solo'|'learn',fast:boolean)=>void;
}){
 const [mode,setMode]=useState<Mode|null>(null),[avatarsOpen,setAvatarsOpen]=useState(false);
 // Invitation links open multiplayer joining, while ordinary visits choose a mode first.
 useEffect(()=>{if(tab==='join'&&code)setMode('multi')},[tab,code]);
 const identityReady=profileLoaded&&!!name.trim(),onlineReady=identityReady&&initialized&&!busy;
 return <section className="entry-card mode-entry" aria-label="选择游戏模式">
  <div className="entry-identity">
   <button type="button" className="entry-avatar" aria-label="更换头像" aria-expanded={avatarsOpen} onClick={()=>accountName?onAccount?.():setAvatarsOpen(!avatarsOpen)} disabled={busy}><span aria-hidden="true"><PlayerAvatar avatar={avatar} name={name}/></span><small>换头像</small></button>
   <div className="entry-name"><label className="field-label" htmlFor="nickname">昵称</label><input id="nickname" value={name} onChange={e=>onName(e.target.value)} disabled={busy||!!accountName} maxLength={12} placeholder="输入昵称" autoComplete="nickname"/></div>
  </div>
  {accountName&&<button className="text-button" onClick={onAccount}>在账号中修改昵称与头像</button>}{avatarsOpen&&!accountName&&<div className="entry-avatar-options"><AvatarPicker value={avatar} onChange={v=>{onAvatar(v);setAvatarsOpen(false)}}/></div>}
  <div className="mode-picker" role="group" aria-label="游戏模式">
   {modes.map(({id,name:label,description,Icon})=><button type="button" key={id} className={'mode-choice'+(mode===id?' selected':'')} aria-pressed={mode===id} disabled={busy} onClick={()=>setMode(id)}><Icon size={23} aria-hidden="true"/><strong>{label}</strong><small>{description}</small></button>)}
  </div>
  {mode==='multi'&&<div className="mode-options" aria-label="多人模式操作">
   <div className="entry-route-picker" role="group" aria-label="创建或加入房间"><button type="button" aria-pressed={tab==='create'} disabled={busy} onClick={()=>onTab('create')}>创建房间</button><button type="button" aria-pressed={tab==='join'} disabled={busy} onClick={()=>onTab('join')}>加入房间</button></div>
   {tab==='join'&&<><label className="field-label" htmlFor="roomcode">邀请码</label><input id="roomcode" value={code} onChange={e=>onCode(e.target.value.toUpperCase().replace(/[^A-Z2-9]/g,''))} disabled={busy} placeholder="4 位邀请码" maxLength={8}/></>}
   <Button className="primary-button full" disabled={!onlineReady||tab==='join'&&!validRoomCode(code)} onClick={()=>onOnline(tab==='join'?'join':'create')}>{busy?'正在入座…':tab==='join'?'加入房间':'创建房间'}</Button>
  </div>}
  {mode==='solo'&&<div className="mode-options" aria-label="单人模式操作"><Button className="primary-button full" disabled={!identityReady||busy} onClick={()=>onLocal('solo',false)}>进入单人牌桌</Button></div>}
  {mode==='learn'&&<div className="mode-options" aria-label="新手模式操作"><Button className="primary-button full" disabled={!identityReady||busy} onClick={()=>onLocal('learn',false)}>开始教学</Button></div>}
 </section>
}
