'use client';
import {useEffect,useRef,useState,type RefObject,type CSSProperties} from 'react';
import {InteractionTracker,INTERACTION_DURATION,type InteractionEvent} from '@/lib/interaction';
import {InteractionArtwork} from './interaction-artwork';
type Flight=InteractionEvent&{x:number,y:number,dx:number,dy:number};
export function InteractionLayer({room,table,blocked=false}:{room:any,table:RefObject<HTMLDivElement|null>,blocked?:boolean}){
 const tracker=useRef(new InteractionTracker()),[flights,setFlights]=useState<Flight[]>([]),timers=useRef<Set<ReturnType<typeof setTimeout>>>(new Set()),reactions=useRef<Set<Animation>>(new Set());
 const clear=()=>{for(const timer of timers.current)clearTimeout(timer);timers.current.clear();for(const a of reactions.current)a.cancel();reactions.current.clear();setFlights([])};
 useEffect(()=>{clear();return clear},[room.code]);
 useEffect(()=>{
  const fresh=tracker.current.observe(room.code,room.interactions??[],Date.now(),!document.hidden&&!blocked);
  if(blocked){clear();return}
  const node=table.current;if(!node||!fresh.length)return;
  const area=node.getBoundingClientRect(),sx=area.width?node.clientWidth/area.width:1,sy=area.height?node.clientHeight/area.height:1;
  const next=fresh.flatMap(event=>{
   const from=node.querySelector<HTMLElement>(`[data-avatar-seat="${event.seat}"]`),to=node.querySelector<HTMLElement>(`[data-avatar-seat="${event.target}"]`);if(!from||!to)return [];
   const a=from.getBoundingClientRect(),b=to.getBoundingClientRect();const x=(a.left+a.width/2-area.left)*sx+node.scrollLeft,y=(a.top+a.height/2-area.top)*sy+node.scrollTop;
   const reduced=window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
   if(!reduced&&to.animate){const reaction=to.animate([{transform:'rotate(0deg) scale(1)'},{transform:'rotate(-8deg) scale(.94)'},{transform:'rotate(6deg) scale(1.04)'},{transform:'rotate(0deg) scale(1)'}],{duration:400,delay:1000,easing:'ease-out'});reactions.current.add(reaction);reaction.onfinish=()=>reactions.current.delete(reaction)}
   window.dispatchEvent(new CustomEvent('mahjong-interaction',{detail:{effect:event.effect}}));
   return [{...event,x,y,dx:(b.left+b.width/2-area.left)*sx+node.scrollLeft-x,dy:(b.top+b.height/2-area.top)*sy+node.scrollTop-y}];
  });
  setFlights(previous=>[...previous,...next].slice(-6));
  for(const event of next){const timer=setTimeout(()=>{setFlights(previous=>previous.filter(e=>e.id!==event.id));timers.current.delete(timer)},INTERACTION_DURATION);timers.current.add(timer)}
 },[room.code,room.interactions,table,blocked]);
 useEffect(()=>{const visibility=()=>{clear();tracker.current.resume(Date.now())};document.addEventListener('visibilitychange',visibility);return()=>document.removeEventListener('visibilitychange',visibility)},[]);
 return <div className="interaction-layer interaction-stage" aria-hidden="true">{flights.map(event=>{
  const style={'--x':event.x+'px','--y':event.y+'px','--dx':event.dx+'px','--dy':event.dy+'px','--arc':Math.min(65,Math.max(12,Math.min(event.y,event.y+event.dy)-36))+'px'} as CSSProperties;
  return <div key={event.id} className={'interaction-scene scene-'+event.effect} style={style}><div className="scene-travel"><InteractionArtwork kind={event.effect}/><i className="scene-trail"/></div><div className="scene-impact"><span className="scene-halo"/><InteractionArtwork kind={event.effect} impact/><div className="scene-particles">{Array.from({length:6},(_,i)=><i key={i} style={{'--p-angle':i*60+'deg','--p-distance':(i%2?32:43)+'px'} as CSSProperties}/>)}</div></div>{event.effect==='tomato'&&<span className="tomato-last-leaf"/>}{event.effect==='inspect'&&<span className="inspection-caption">嗯？</span>}</div>;
 })}</div>;
}
