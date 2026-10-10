'use client';
import {useEffect,useRef,useState} from 'react';
import {Volume2,VolumeX} from 'lucide-react';
import {Button} from '@/components/ui/button';
import {GameSoundTracker,MahjongAudio} from '@/lib/game-sound';

export function SoundToggle({enabled,onToggle}:{enabled:boolean,onToggle:()=>void}){
 return <Button variant="ghost" aria-label={enabled?'关闭音效':'开启音效'} title={enabled?'关闭音效':'开启音效'} aria-pressed={enabled} className="header-button sound-toggle" onClick={onToggle}>{enabled?<Volume2 size={19}/>:<VolumeX size={19}/>}<span>音效{enabled?'开':'关'}</span></Button>;
}
export function useTableSound(room:any,now:number,onError:(message:string)=>void){
 const [enabled,setEnabled]=useState(false);
 const tracker=useRef(new GameSoundTracker()),audio=useRef<MahjongAudio|null>(null),busy=useRef(false),latestRoom=useRef(room),enabledRef=useRef(false),since=useRef(0);
 latestRoom.current=room;
 const getAudio=()=>audio.current??(audio.current=new MahjongAudio(()=>{
  const Context=window.AudioContext||(window as any).webkitAudioContext;if(!Context)throw new Error('当前浏览器暂不支持音效');return new Context();
 }));
 useEffect(()=>{audio.current?.stop()},[room?.code,room?.round,room?.roundId,room?.paused]);
 useEffect(()=>{
  const cues=tracker.current.observe(room,now,enabledRef.current&&!room?.paused&&document.visibilityState==='visible',since.current);
  for(const cue of cues){try{audio.current?.play(cue.kind,cue.delayMs)}catch{}}
 },[room,now,enabled]);
 useEffect(()=>{
  const hidden=()=>{since.current=Date.now();tracker.current.observe(latestRoom.current,Date.now(),false);if(document.visibilityState!=='visible')audio.current?.stop()};document.addEventListener('visibilitychange',hidden);
  const interaction=(event:Event)=>{if(enabledRef.current&&document.visibilityState==='visible'&&!latestRoom.current?.paused){try{audio.current?.interact((event as CustomEvent).detail?.effect)}catch{}}};
  window.addEventListener?.('mahjong-interaction',interaction);
  return()=>{window.removeEventListener?.('mahjong-interaction',interaction);document.removeEventListener('visibilitychange',hidden);audio.current?.dispose()};
 },[]);
 async function toggle(){
  if(busy.current)return;
  if(enabledRef.current){enabledRef.current=false;setEnabled(false);audio.current?.mute();return}
  busy.current=true;
  try{await getAudio().enable();since.current=Date.now();tracker.current.observe(latestRoom.current,Date.now(),false);enabledRef.current=true;setEnabled(true);audio.current?.play('turn')}
  catch(e){enabledRef.current=false;setEnabled(false);audio.current?.mute();onError(e instanceof Error?e.message:'音效暂时无法开启，请重试')}
  finally{busy.current=false}
 }
 return {enabled,toggle};
}
