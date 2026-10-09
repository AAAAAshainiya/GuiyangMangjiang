import {db} from '@/db';
import {view,type Room} from './game';
import {type ReplayData} from './replay';
export async function pruneReplays(userId:string){
 // Prune access per account. A different player's favorite remains independent.
 await db().batch([
  db().prepare('DELETE FROM mahjong_replays WHERE id IN (SELECT game_id FROM mahjong_account_records WHERE user_id=? AND favorite=0 AND has_replay=1 AND id NOT IN (SELECT id FROM mahjong_account_records WHERE user_id=? AND favorite=0 AND has_replay=1 ORDER BY at DESC,id DESC LIMIT 30)) AND NOT EXISTS (SELECT 1 FROM mahjong_account_records r WHERE r.game_id=mahjong_replays.id AND r.has_replay=1 AND (r.user_id<>? OR r.favorite=1))').bind(userId,userId,userId),
  db().prepare('UPDATE mahjong_account_records SET has_replay=0 WHERE user_id=? AND favorite=0 AND has_replay=1 AND id NOT IN (SELECT id FROM mahjong_account_records WHERE user_id=? AND favorite=0 AND has_replay=1 ORDER BY at DESC,id DESC LIMIT 30)').bind(userId,userId),
 ]);
}
export async function storeRecord(userId:string,gameId:string,mode:string,bill:any,at:number,replay?:ReplayData){
 const statements=[];
 if(replay)statements.push(db().prepare('INSERT INTO mahjong_replays (id,data,created_at) VALUES (?,?,?) ON CONFLICT(id) DO NOTHING').bind(gameId,JSON.stringify(replay),at));
 statements.push(db().prepare('INSERT INTO mahjong_account_records (id,user_id,game_id,mode,room_code,round,at,delta,bill,has_replay,favorite) VALUES (?,?,?,?,?,?,?,?,?,?,0) ON CONFLICT(user_id,game_id) DO NOTHING').bind(userId+':'+gameId,userId,gameId,mode,bill.code,bill.round,at,bill.result.delta[bill.me],JSON.stringify(bill),replay?1:0));
 await db().batch(statements);await pruneReplays(userId);
}
export async function persistRoomRecords(r:Room){let trimmed=false;
 for(const h of r.history??[]){if(h.accountArchived)continue;
  const gameId=h.replay?'multi:'+h.replay.id:'legacy:'+r.code+':'+h.round+':'+h.at;
  for(const p of h.players){if(!p.accountId)continue;
   const snapshot=view({...r,...h,phase:'done',claim:null,wall:[],history:[],roundSummaries:[]},p.id),bill={code:r.code,round:h.round,phase:'done',me:snapshot.me,players:snapshot.players,result:snapshot.result};
   await storeRecord(p.accountId,gameId,'multi',bill,h.at,h.replay);
  }
  h.accountArchived=true;delete h.replay;trimmed=true;
 }
 return trimmed;
}
