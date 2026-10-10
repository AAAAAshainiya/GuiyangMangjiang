export const INTERACTIONS=[
 {id:'tomato',emoji:'🍅',name:'扔番茄',impact:'💥'},
 {id:'egg',emoji:'🥚',name:'扔鸡蛋',impact:'🍳'},
 {id:'water',emoji:'💦',name:'泼水',impact:'💦'},
 {id:'hammer',emoji:'🔨',name:'敲一下',impact:'✨'},
 {id:'flower',emoji:'🌹',name:'送花',impact:'🌸'},
 {id:'tea',emoji:'🍵',name:'请喝茶',impact:'♨️'},
 {id:'chicken',emoji:'🐔',name:'放只鸡',impact:'🐥'},
 {id:'redpacket',emoji:'🧧',name:'发红包',impact:'🎊'},
 {id:'lucky',emoji:'📦',name:'欧气快递',impact:'✨'},
 {id:'flock',emoji:'🐥',name:'鸡群突袭',impact:'🐥'},
 {id:'inspect',emoji:'🔎',name:'放大镜观察',impact:'❔'},
] as const;
export type InteractionKind=typeof INTERACTIONS[number]['id'];
// Keep archived applause readable without allowing it as a new interaction.
export type RecordedInteractionKind=InteractionKind|'clap';
export const recordedInteractionKind=(value:unknown)=>value==='clap'||interactionKind(value);
export type InteractionEvent={id:string,seat:number,target:number,effect:InteractionKind,at:number,name:string,targetName?:string};
export type RoomMessage={id:string,seat:number,name:string,kind:string,content:string,at:number,mine:boolean,effect?:RecordedInteractionKind,targetName?:string};
export const INTERACTION_DURATION=2800;
export const QUICK_MESSAGES=['大家好，来打牌啦','稍等，我离开一下','我回来啦','轮到你出牌了','这手牌有点难选','就差一张了','今天手气不错','别急，我再想想','又被你碰走了','给我留点鸡','这张牌有点危险','你这手藏得挺深','打得漂亮！','差一点就胡了','终于轮到我了','运气借我一点','这局打得过瘾','我先打完这一局','再来一局吧','大家准备好了吗','今天先到这里','谢谢大家陪我玩','下次再约'] as const;
export const interactionAction=(effect:RecordedInteractionKind)=>({tomato:'扔了一个番茄',egg:'扔了一颗鸡蛋',water:'泼了一杯水',hammer:'轻轻敲了一下',flower:'送了一束玫瑰',tea:'请喝了一杯茶',clap:'送上了掌声',chicken:'放了一只小鸡',redpacket:'送了一个红包',lucky:'送来一份欧气快递',flock:'发起了鸡群突袭',inspect:'举起了放大镜观察'}[effect]);
export function conversationMessages(room:any):RoomMessage[]{
 const messages=new Map<string,RoomMessage>((room.messages??[]).map((m:RoomMessage)=>[m.id,m]));
 for(const e of room.interactions??[]){if(!messages.has(e.id)&&interactionKind(e.effect))messages.set(e.id,{id:e.id,seat:e.seat,name:e.name,kind:'interaction',content:'',at:e.at,mine:e.seat===room.me,effect:e.effect,targetName:e.targetName??room.players?.[e.target]?.name??'当时的牌友'})}
 return [...messages.values()].sort((a,b)=>a.at-b.at||a.id.localeCompare(b.id)).slice(-100);
}
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
