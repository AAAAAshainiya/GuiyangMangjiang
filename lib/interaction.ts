export const INTERACTIONS=[
 {id:'tomato',emoji:'🍅',name:'扔番茄',impact:'💥'},
 {id:'egg',emoji:'🥚',name:'扔鸡蛋',impact:'🍳'},
 {id:'water',emoji:'💦',name:'泼水',impact:'💦'},
 {id:'hammer',emoji:'🔨',name:'敲一下',impact:'✨'},
 {id:'flower',emoji:'🌹',name:'送花',impact:'🌸'},
 {id:'tea',emoji:'🍵',name:'请喝茶',impact:'♨️'},
 {id:'clap',emoji:'👏',name:'鼓掌',impact:'✨'},
 {id:'chicken',emoji:'🐔',name:'放只鸡',impact:'🐥'},
 {id:'redpacket',emoji:'🧧',name:'发红包',impact:'🎊'},
] as const;
export type InteractionKind=typeof INTERACTIONS[number]['id'];
export type InteractionEvent={id:string,seat:number,target:number,effect:InteractionKind,at:number,name:string};
export function interactionKind(value:unknown){return INTERACTIONS.some(e=>e.id===value)}
// Existing eight-character rooms stay valid; new rooms use four characters.
export const validRoomCode=(code:string)=>/^(?:[A-Z2-9]{4}|[A-Z2-9]{8})$/.test(code);
export const roomCode=()=>Array.from(crypto.getRandomValues(new Uint8Array(4)),n=>'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[n%32]).join('');
export class InteractionTracker{
 private code='';private seen=new Set<string>();private since=0;
 observe(code:string,events:InteractionEvent[],now:number,visible=true){
  if(code!==this.code){this.code=code;this.seen=new Set(events.map(e=>e.id));this.since=now;return []}
  const fresh=events.filter(e=>!this.seen.has(e.id));this.seen=new Set(events.map(e=>e.id));
  if(!visible){this.since=now;return []}
  return fresh.filter(e=>e.at>=this.since&&now-e.at<5000&&e.at<=now+1000&&e.seat>=0&&e.seat<4&&e.target>=0&&e.target<4&&interactionKind(e.effect)).slice(-6);
 }
 resume(now:number){this.since=now}
}
