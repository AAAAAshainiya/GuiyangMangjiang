'use client';
import {useEffect,useRef,useState} from 'react';
import {Button} from '@/components/ui/button';
import {tileName} from '@/lib/game';
import {LESSON_STEPS,handGroups} from '@/lib/training';
type Note={title:string,lines:string[],targets:string[]};
export function coachNote(room:any,preview:any,selection:number|null,prompt:string[]):Note{
 const lesson=room.lesson,step=LESSON_STEPS[lesson.intro],hand=room.players[room.me].hand;
 if(step){
  const targets=step.target==='hand'?(lesson.intro===1?handGroups(hand).slice(0,2).map(g=>g.indices.map(i=>`[data-hand-index="${i}"]`).join(',')):['.hand-tiles']):step.target==='river'?['.latest-discard','.discard-0']:step.target==='melds'?['.my-meld','.hand-tiles']:['.table-actions','.action-bar'];
  const lines=lesson.intro===1?handGroups(hand).slice(0,2).map(g=>`${g.tiles.map(tileName).join('、')}：${g.kind}。`):[step.text];
  return {title:`${lesson.intro+1}/${LESSON_STEPS.length} · ${step.title}`,lines:lines.length?lines:[step.text],targets};
 }
 if(lesson.gate){const last=lesson.lastAction,offset=last?(last.seat-room.me+4)%4:0,meld=offset===0?'.my-meld':`.seat-${offset} .open-melds`,targets=last&&['gang','bu','peng'].includes(last.action)?[room.phase==='claim'?'.claim-banner':meld]:['.latest-discard'];if(room.waits.length)targets.push('.hand-caption b');return {title:lesson.explanation.title,lines:lesson.explanation.lines,targets};}
 if(room.phase==='claim'&&room.options.length)return {title:'选择碰、杠、胡或过牌',lines:prompt,targets:['.table-actions',`.hand-tiles [data-tile="${room.claim.t}"]`]};
 if(room.phase==='play'&&room.turn===room.me){
  const index=selection??hand.indexOf(room.suggestion),lines=preview?[preview.reason,preview.after,...(preview.chicken?[preview.chicken]:[])]:prompt;
  return {title:selection===null?'先查看建议牌，再自己选择':'准备打 '+tileName(hand[selection]),lines,targets:[`[data-hand-index="${index}"]`,...(room.waits.length?['.hand-caption b']:['.action-bar'])]};
 }
 if(room.phase==='claim')return {title:'等待其他牌友的响应',lines:['点击继续，逐步查看其余响应。胡牌优先于碰和杠。'],targets:['.claim-banner']};
 return {title:'下一位牌友的行动',lines:[`现在由${room.players[room.turn]?.name??'人机'}行动，点击继续只推进一个步骤。`],targets:[`.seat-${(room.turn-room.me+4)%4}`]};
}
export function TableCoach({room,preview,selection,prompt,onNext,onTour,onFull}:{room:any,preview:any,selection:number|null,prompt:string[],onNext:()=>void,onTour:(index:number)=>void,onFull:()=>void}){
 const rail=useRef<HTMLElement>(null),[rects,setRects]=useState<{x:number,y:number,w:number,h:number}[]>([]),note=coachNote(room,preview,selection,prompt),intro=room.lesson.intro<LESSON_STEPS.length;
 const next=intro||room.lesson.gate||!room.options.length;
 useEffect(()=>{
  const root=rail.current?.closest<HTMLElement>('.table-shell');if(!root)return;
  const measure=()=>{const bounds=root.getBoundingClientRect(),felt=root.querySelector<HTMLElement>('.felt'),clip=felt?.getBoundingClientRect();
   const boxes=note.targets.map(s=>Array.from(root.querySelectorAll<HTMLElement>(s))).filter(list=>list.length).slice(0,2).map(elements=>{
    const raw=elements.map(e=>e.getBoundingClientRect()),inside=elements.every(e=>felt?.contains(e));
    const left=Math.max(Math.min(...raw.map(b=>b.left)),bounds.left,inside&&clip?clip.left:bounds.left),top=Math.max(Math.min(...raw.map(b=>b.top)),bounds.top,inside&&clip?clip.top:bounds.top),right=Math.min(Math.max(...raw.map(b=>b.right)),bounds.right,inside&&clip?clip.right:bounds.right),bottom=Math.min(Math.max(...raw.map(b=>b.bottom)),bounds.bottom,inside&&clip?clip.bottom:bounds.bottom);
    return right>left&&bottom>top?{x:left-bounds.left,y:top-bounds.top,w:right-left,h:bottom-top}:null;
   });setRects(boxes.filter((b):b is {x:number,y:number,w:number,h:number}=>b!==null));
  };
  measure();const observer=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);observer?.observe(root);root.addEventListener('scroll',measure,true);window.addEventListener('resize',measure);
  return()=>{observer?.disconnect();root.removeEventListener('scroll',measure,true);window.removeEventListener('resize',measure)};
 },[room.code,room.round,room.version,room.lesson.intro,room.lesson.gate,selection,note.targets.join('|')]);
 return <><svg className="coach-markers" aria-hidden="true">{rects.map((b,i)=><g key={i}><rect x={b.x+1} y={b.y+1} width={Math.max(0,b.w-2)} height={Math.max(0,b.h-2)} rx="5"/><path d={`M ${b.x+Math.min(12,b.w/2)} ${Math.max(4,b.y-9)} v 6 l -3 -3 m 3 3 l 3 -3`}/></g>)}</svg><section className="coach-rail" ref={rail} aria-label="牌桌教学批注" aria-live="polite"><div className="coach-copy"><h2>{note.title}</h2>{note.lines.slice(0,2).map((line,i)=><p key={i}>{line}</p>)}{note.lines.length>2&&<details><summary>展开本步解释</summary>{note.lines.slice(2).map((line,i)=><p key={i}>{line}</p>)}</details>}</div><div className="coach-controls">{intro&&room.lesson.intro>0&&<Button variant="outline" onClick={()=>onTour(room.lesson.intro-1)}>上一步</Button>}{next?<Button onClick={onNext}>{intro?'下一步':'继续'}</Button>:<span>请在牌桌上操作</span>}<button onClick={onFull}>完整教程</button></div></section></>;
}
