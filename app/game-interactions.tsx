'use client';
import {useEffect,useRef,useState,type RefObject,type CSSProperties} from 'react';
import {INTERACTIONS,InteractionTracker,type InteractionEvent} from '@/lib/interaction';
type Flight=InteractionEvent&{x:number,y:number,dx:number,dy:number};
export function InteractionLayer({room,table}:{room:any,table:RefObject<HTMLDivElement|null>}){
 const tracker=useRef(new InteractionTracker()),[flights,setFlights]=useState<Flight[]>([]),timers=useRef<Set<ReturnType<typeof setTimeout>>>(new Set());
 useEffect(()=>{setFlights([]);return()=>{for(const timer of timers.current)clearTimeout(timer);timers.current.clear()}},[room.code]);
 useEffect(()=>{
  const fresh=tracker.current.observe(room.code,room.interactions??[],Date.now(),!document.hidden);
  const node=table.current;if(!node||!fresh.length)return;
  const area=node.getBoundingClientRect();const next=fresh.flatMap(event=>{
   const from=node.querySelector<HTMLElement>(`[data-avatar-seat="${event.seat}"]`),to=node.querySelector<HTMLElement>(`[data-avatar-seat="${event.target}"]`);if(!from||!to)return [];
   const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();const x=a.left+a.width/2-area.left,y=a.top+a.height/2-area.top;
   return [{...event,x,y,dx:b.left+b.width/2-area.left-x,dy:b.top+b.height/2-area.top-y}];
  });
  setFlights(previous=>[...previous,...next].slice(-6));
  for(const event of next){const timer=setTimeout(()=>{setFlights(previous=>previous.filter(e=>e.id!==event.id));timers.current.delete(timer)},2500);timers.current.add(timer)}
 },[room.code,room.interactions,table]);
 useEffect(()=>{const visibility=()=>{setFlights([]);tracker.current.resume(Date.now());for(const timer of timers.current)clearTimeout(timer);timers.current.clear()};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility)},[]);
 return <div className="interaction-layer" aria-hidden="true">{flights.map(event=>{
  const effect=INTERACTIONS.find(e=>e.id===event.effect)!;
  const style={'--x':event.x+'px','--y':event.y+'px','--dx':event.dx+'px','--dy':event.dy+'px'} as CSSProperties;
  return <div key={event.id} className={'interaction-flight effect-'+event.effect} style={style}><span className="flying-emoji">{effect.emoji}</span><span className="impact-main">{effect.emoji}</span><span className="impact-emoji">{effect.impact}</span><span className="impact-particles">{effect.impact} {effect.impact} {effect.impact}</span></div>;
 })}</div>;
}
