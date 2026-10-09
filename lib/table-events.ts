import {tileName} from './game';
export type TableEvent={seq:number,at:number,seat:number,from:number|null,kind:'peng'|'ming'|'an'|'bu',tile:number|null};
export const WINNER_MS=1600,FLIP_MS=2600;
export type EndStage='winner'|'flip'|'summary';
export function endStage(result:any,elapsed:number):EndStage{if(!result||result.winner<0)return 'summary';if(elapsed<WINNER_MS)return 'winner';if(result.flip!==null&&elapsed<WINNER_MS+FLIP_MS)return 'flip';return 'summary'}
export function winnerText(room:any){const r=room.result,name=room.players[r.winner]?.name??'牌友';return {title:name+'胡了！',detail:r.from<0?name+' · '+r.kind:r.kind==='抢杠胡'?`${name}抢杠胡 · ${room.players[r.from]?.name}补杠被胡`:`${room.players[r.from]?.name}放炮 · ${r.kind}`,pattern:r.pattern}}
export function tableEventText(e:TableEvent,players:{name:string}[]){const who=players[e.seat]?.name??'牌友',source=e.from===null?'':players[e.from]?.name??'牌友';if(e.kind==='an')return who+'暗杠';if(e.kind==='bu')return who+'补杠了'+tileName(e.tile!);return `${who}${e.kind==='peng'?'碰':'杠'}了${source}的${tileName(e.tile!)}`}
export class TableEventTracker{
 private code:string|null=null;private seq=0;
 observe(room:any,now:number,active=true){if(!room){this.code=null;this.seq=0;return []}const events:TableEvent[]=room.tableEvents??[],latest=Math.max(0,...events.map(e=>e.seq));if(this.code!==room.code){this.code=room.code;this.seq=latest;return []}
  const fresh=events.filter(e=>e.seq>this.seq);this.seq=Math.max(this.seq,latest);return active?fresh.filter(e=>now-e.at<=5000&&e.at<=now+1000).map(e=>({...e,text:tableEventText(e,room.players)})):[];
 }
}
