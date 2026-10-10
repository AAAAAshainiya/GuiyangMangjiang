'use client';
import {useEffect,useRef,useState} from 'react';
import {TableEventTracker,endStage,WINNER_MS,FLIP_MS,type EndStage} from '@/lib/table-events';
import {Button} from '@/components/ui/button';
import {Switch} from '@/components/ui/switch';

export function useRoundPresentation(room:any):EndStage{
 const [state,setState]=useState({key:'',elapsed:0});
 const key=room?.phase==='done'?room.code+':'+room.round:'';
 useEffect(()=>{if(!key){setState({key:'',elapsed:0});return}setState({key,elapsed:0});const first=setTimeout(()=>setState({key,elapsed:WINNER_MS}),WINNER_MS),last=setTimeout(()=>setState({key,elapsed:WINNER_MS+FLIP_MS}),WINNER_MS+FLIP_MS);return()=>{clearTimeout(first);clearTimeout(last)}},[key]);
 return endStage(room?.result,state.key===key?state.elapsed:0);
}
export function TableEventNotice({room,now}:{room:any,now:number}){
 const tracker=useRef(new TableEventTracker()),[queue,setQueue]=useState<{seq:number,text:string}[]>([]);
 useEffect(()=>{setQueue([])},[room?.code,room?.round,room?.roundId]);
 useEffect(()=>{const fresh=tracker.current.observe(room,now,!document.hidden);if(fresh.length)setQueue(current=>[...current,...fresh].slice(-40))},[room,now]);
 const event=queue[0];
 useEffect(()=>{if(!event)return;const timer=setTimeout(()=>setQueue(current=>current.filter(x=>x.seq!==event.seq)),2300);return()=>clearTimeout(timer)},[event?.seq]);
 useEffect(()=>{const hidden=()=>{if(document.hidden)setQueue([])};document.addEventListener('visibilitychange',hidden);return()=>document.removeEventListener('visibilitychange',hidden)},[]);
 return event?<div className="table-event-notice" role="status" aria-live="polite">{event.text}</div>:null;
}
export function useImmersive(){
 const [immersive,setImmersive]=useState(false),native=useRef(false);
 useEffect(()=>{if(!immersive)return;const old=document.body.style.overflow;document.body.style.overflow='hidden';const changed=()=>{if(native.current&&!document.fullscreenElement){native.current=false;setImmersive(false)}};const key=(event:KeyboardEvent)=>{if(event.key==='Escape'){setImmersive(false);if(document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{})}};document.addEventListener('fullscreenchange',changed);window.addEventListener('keydown',key);return()=>{document.body.style.overflow=old;document.removeEventListener('fullscreenchange',changed);window.removeEventListener('keydown',key)}},[immersive]);
 useEffect(()=>()=>{if(native.current&&document.fullscreenElement===document.documentElement)void document.exitFullscreen().catch(()=>{})},[]);
 async function toggle(){if(immersive){setImmersive(false);if(document.fullscreenElement===document.documentElement)try{await document.exitFullscreen()}catch{}native.current=false;return}
  setImmersive(true);try{if(document.documentElement.requestFullscreen){await document.documentElement.requestFullscreen();native.current=true}}catch{native.current=false}
 }
 return {immersive,toggle};
}
export function SoloPanel({room,onAction,onRules}:{room:any,onAction:(action:string,tile?:number)=>void,onRules:()=>void}){
 return <section className="room-panel solo-panel"><div className="panel-title"><h2>单人牌桌</h2><span>离线 · 三个人机</span></div><p className="solo-description">{room.phase==='lobby'?'点击开始游戏后发牌。可先设置人机节奏和录制回放。':'你的座位始终由你操作。60 秒无操作会自动暂停整局，点击继续后恢复。可随时切换快速模式；点击牌桌上方重开，未完成的本局不记录。'}</p><label className="speed-control"><span>快速模式<small>开启后人机迅速出牌</small></span><Switch checked={!!room.fast} onCheckedChange={v=>onAction('speed',v?1:0)} aria-label="单人快速模式"/></label>{['play','claim'].includes(room.phase)&&<Button className="primary-button full" onClick={()=>onAction(room.paused?'continue':'pause')}>{room.paused?'继续牌局':'暂停牌局'}</Button>}<label className="speed-control"><span>录制回放<small>{room.nextReplayEnabled?(room.phase==='lobby'?'已开启，开始游戏后录制':'已开启，下一局录制'):room.phase==='lobby'?'默认关闭，开启后可录制首局':'默认关闭，主动开启后下一局录制'}</small><small>{room.phase==='lobby'?'本局尚未开始':room.replayEnabled?'本局正在录制':'本局未录制回放'}</small></span><Switch checked={!!room.nextReplayEnabled} onCheckedChange={v=>onAction('recordReplay',v?1:0)} aria-label="单人录制回放"/></label><button className="text-button" onClick={onRules}>查看规则</button><a href="/" className="learn-exit">退出单人模式</a></section>;
}
