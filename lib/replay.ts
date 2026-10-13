import type {Room} from './game';
export type ReplayPlayer={name:string,heavenlyReady?:boolean,avatar?:string,bot:boolean,hand:number[],melds:any[],river:number[],charges:number[]};
export type ReplayState={players:ReplayPlayer[],turn:number,dealer:number,phase:string,remaining:number,drawn:number|null,lastDiscard:any,claim:any,winner:number|null,flip:number|null,rooster:number|null,kind:string|null};
export type ReplayFrame={at:number,label:string,patch:Partial<Omit<ReplayState,'players'>> & {players?:Record<string,ReplayPlayer>}};
export type ReplayData={id:string,format:1,round:number,startedAt:number,initial:ReplayState,frames:ReplayFrame[],rules:any,complete:boolean};
const copy=<T>(v:T):T=>JSON.parse(JSON.stringify(v));
const cache=new WeakMap<ReplayData,ReplayState>();
function capture(r:Room):ReplayState{return {players:r.players.map((p,i)=>({name:p.name,heavenlyReady:!!r.heavenlyReady?.[i],avatar:p.bot?undefined:p.avatar,bot:p.bot,hand:[...p.hand],melds:copy(p.melds),river:[...p.river],charges:(r.charges??[]).filter(c=>c.player===i&&!c.claimed).map(c=>c.index)})),turn:r.turn,dealer:r.dealer,phase:r.phase,remaining:r.wall.length,drawn:r.drawn,lastDiscard:r.lastDiscard&&r.players[r.lastDiscard.seat]?.river[r.lastDiscard.index]===r.lastDiscard.tile?r.lastDiscard:null,claim:r.claim?{from:r.claim.from,t:r.claim.t,rob:r.claim.rob,stage:r.claim.stage}:null,winner:r.result?.winner??null,flip:r.result?.flip??null,rooster:r.result?.rooster??null,kind:r.result?.kind??null}}
export function beginReplay(r:Room,now:number){if(r.replayEnabled===false)return;const initial=capture(r),data:ReplayData={id:crypto.randomUUID(),format:1,round:r.round,startedAt:now,initial,frames:[],rules:copy(r.roundRules),complete:false};r.replay=data;cache.set(data,copy(initial))}
export function applyReplayFrame(state:ReplayState,frame:ReplayFrame):ReplayState{const {players,...rest}=frame.patch;return {...state,...copy(rest),players:state.players.map((p,i)=>players?.[i]?copy(players[i]):p)}}
export function replayStates(data:ReplayData){const out=[copy(data.initial)];for(const frame of data.frames)out.push(applyReplayFrame(out.at(-1)!,frame));return out}
export function recordReplay(r:Room,now:number,label:string,force=false){const d=r.replay;if(!d||d.complete)return;
 const before=cache.get(d)??replayStates(d).at(-1)!,after=capture(r),patch:ReplayFrame['patch']={};
 for(const key of Object.keys(after) as (keyof ReplayState)[]){if(key==='players'){const changes:Record<string,ReplayPlayer>={};after.players.forEach((p,i)=>{if(JSON.stringify(p)!==JSON.stringify(before.players[i]))changes[i]=p});if(Object.keys(changes).length)patch.players=changes}else if(JSON.stringify(before[key])!==JSON.stringify(after[key]))(patch as any)[key]=after[key]}
 if(!force&&!Object.keys(patch).length)return;
 d.frames.push({at:Math.max(0,now-d.startedAt),label,patch});cache.set(d,after);
 if(r.phase==='done')d.complete=true;
}
export function validateReplay(value:any):ReplayData{
 if(!value||value.format!==1||!value.complete||typeof value.id!=='string'||!/^[a-f0-9-]{36}$/.test(value.id)||!Number.isInteger(value.round)||value.round<1||!Number.isFinite(value.startedAt)||!Array.isArray(value.frames)||value.frames.length<1||value.frames.length>700)throw new Error('回放记录不完整');
 const states=replayStates(value);
 for(const s of states){if(!Array.isArray(s.players)||s.players.length!==4||!['play','claim','done'].includes(s.phase)||!Number.isInteger(s.remaining)||s.remaining<0||s.remaining>108||!Number.isInteger(s.turn)||s.turn<0||s.turn>3)throw new Error('回放状态不正确');for(const p of s.players){if(typeof p.name!=='string'||Array.from(p.name).length>20||!Array.isArray(p.hand)||p.hand.length>14||!Array.isArray(p.river)||p.river.length>108||!Array.isArray(p.melds)||p.melds.length>4||p.melds.some(m=>!['gang','peng'].includes(m.k))||!Array.isArray(p.charges)||p.charges.some(n=>!Number.isInteger(n)||n<0||n>=p.river.length)||[...p.hand,...p.river,...p.melds.map(m=>m.t)].some(t=>!Number.isInteger(t)||t<0||t>26))throw new Error('回放牌面不正确')}}
 if(states.at(-1)!.phase!=='done'||value.frames.some((f:any)=>!Number.isFinite(f.at)||f.at<0||typeof f.label!=='string'||f.label.length>120))throw new Error('回放记录不正确');return value;
}
