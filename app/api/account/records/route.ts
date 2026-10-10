import {db} from '@/db';
import {validateRules} from '@/lib/rules';
import {validateReplay} from '@/lib/replay';
import {storeRecord,pruneReplays} from '@/lib/account-records';
import {requireAccount,AccountError,jsonBody,rateLimit,accountReply,accountFailure} from '@/lib/account-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const user=await requireAccount(req),url=new URL(req.url),id=url.searchParams.get('id'),replay=url.searchParams.get('replay');
 if(id){const row=await db().prepare("SELECT bill,game_id,has_replay FROM mahjong_account_records WHERE id=? AND user_id=? AND mode IN ('multi','solo')").bind(id,user.id).first<any>();if(!row)throw new AccountError('对局记录不存在',404);
  if(replay==='1'){if(!row.has_replay)throw new AccountError('这局回放已清理，账单仍保留',410);const data=await db().prepare('SELECT data FROM mahjong_replays WHERE id=?').bind(row.game_id).first<{data:string}>();if(!data)throw new AccountError('回放暂时不可用',404);return accountReply({replay:JSON.parse(data.data)})}
  return accountReply({bill:JSON.parse(row.bill)});
 }
 const before=Number(url.searchParams.get('before')),cursor=url.searchParams.get('cursor')??'',favorites=url.searchParams.get('favorites')==='1',limit=20;
 const page=Number.isFinite(before)&&before>0,mode=url.searchParams.get('mode'),filter=mode==='multi'||mode==='solo'?mode:null,replaysOnly=url.searchParams.get('replays')==='1';
 const rows=await db().prepare(`SELECT id,game_id,mode,room_code,round,at,delta,has_replay,favorite,json_extract(bill,'$.result.kind') AS kind,json_extract(bill,'$.result.pattern') AS pattern FROM mahjong_account_records WHERE user_id=? AND mode IN ('multi','solo')${filter?' AND mode=?':''}${replaysOnly?' AND has_replay=1':''}${favorites?' AND favorite=1':''}${page?' AND (at < ? OR (at = ? AND id < ?))':''} ORDER BY at DESC,id DESC LIMIT ?`).bind(user.id,...(filter?[filter]:[]),...(page?[before,before,cursor]:[]),limit+1).all<any>();
 const total=await db().prepare("SELECT count(*) AS rounds,coalesce(sum(delta),0) AS points FROM mahjong_account_records WHERE user_id=? AND mode IN ('multi','solo')"+(filter?' AND mode=?':'')).bind(user.id,...(filter?[filter]:[])).first();const records=rows.results.slice(0,limit),last=records.at(-1);
 return accountReply({records,total,next:rows.results.length>limit&&last?{before:last.at,cursor:last.id}:null});
 }catch(e){return accountFailure(e)}}
export async function POST(req:Request){try{
 const b=await jsonBody(req,900000),user=await requireAccount(req);
 if(b.action==='favorite'){
  if(typeof b.id!=='string'||typeof b.favorite!=='boolean')throw new AccountError('收藏操作不正确');
  const row=await db().prepare("SELECT has_replay FROM mahjong_account_records WHERE id=? AND user_id=? AND mode IN ('multi','solo')").bind(b.id,user.id).first<{has_replay:number}>();if(!row)throw new AccountError('对局记录不存在',404);if(!row.has_replay)throw new AccountError('这局回放已清理，无法收藏',410);
  const saved=await db().prepare('UPDATE mahjong_account_records SET favorite=? WHERE id=? AND user_id=? AND has_replay=1').bind(b.favorite?1:0,b.id,user.id).run();if(!saved.meta.changes)throw new AccountError('这局回放已清理，无法收藏',410);await pruneReplays(user.id);return accountReply({saved:true});
 }
 if(b.action!=='localRound')throw new AccountError('不支持此操作');
 await rateLimit(req,'local-round:'+user.id,200,3600000);
 const bill=b.bill;if(!bill||bill.code!=='SOLO'||bill.phase!=='done'||bill.me!==0||!Array.isArray(bill.players)||bill.players.length!==4||!bill.result||!Array.isArray(bill.result.delta)||bill.result.delta.length!==4||bill.result.delta.some((n:any)=>!Number.isInteger(n)||Math.abs(n)>1000000)||bill.result.delta.reduce((a:number,n:number)=>a+n,0)!==0)throw new AccountError('单机账单不完整');
 if(['hu','chicken','beans','values','huValues','beanValues'].some(key=>!Array.isArray(bill.result[key])||bill.result[key].length!==4||bill.result[key].some((n:any)=>!Number.isInteger(n)||Math.abs(n)>1000000))||!Number.isInteger(bill.result.winner)||bill.result.winner< -1||bill.result.winner>3||!Number.isInteger(bill.result.from)||bill.result.from< -1||bill.result.from>3||typeof bill.result.kind!=='string'||bill.result.kind.length>30||bill.players.some((p:any)=>typeof p.name!=='string'||!Array.isArray(p.hand)||p.hand.length>14||!Array.isArray(p.melds)||p.melds.length>4||!Array.isArray(p.river)||p.river.length>108))throw new AccountError('单机账单内容不正确');
 let replay;try{replay=b.replay?validateReplay(b.replay):undefined;validateRules(bill.result.rules)}catch{throw new AccountError('回放或规则内容不正确')}
 if(!Number.isInteger(bill.round)||bill.round<1||!Number.isFinite(b.at)||b.at<0||b.at>Date.now()+60000||replay&&(replay.round!==bill.round||replay.initial.players[0].name!==bill.players[0].name||b.at<replay.startedAt))throw new AccountError('对局时间或身份不正确');
 if(JSON.stringify(bill).length>100000)throw new AccountError('账单过大',413);
 const id=b.id??replay?.id;if(typeof id!=='string'||!/^[a-f0-9-]{36}$/.test(id))throw new AccountError('对局编号不正确');await storeRecord(user.id,'local:'+user.id+':'+id,'solo',bill,b.at,replay);return accountReply({saved:true,billSaved:true,replaySaved:!!replay});
 }catch(e){return accountFailure(e)}}
