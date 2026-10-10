import {db} from '@/db';
import {env} from 'cloudflare:workers';
import {backupSettings,flushBackups,listBackups} from '@/lib/account-backup';
import {requireAccount,publicAccount,jsonBody,rateLimit,AccountError,accountReply,accountFailure} from '@/lib/account-server';
import {validateRules} from '@/lib/rules';
import {validTheme} from '@/lib/themes';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const user=await requireAccount(req),url=new URL(req.url);
 if(url.searchParams.get('export')==='1'){
  const offset=Number(url.searchParams.get('offset'))||0;if(!Number.isInteger(offset)||offset<0||offset>10000000)throw new AccountError('分页参数不正确');
  const rows=await db().prepare("SELECT mode,game_id,round,at,delta,bill FROM mahjong_account_records WHERE user_id=? AND mode IN ('multi','solo') ORDER BY at DESC,id DESC LIMIT 51 OFFSET ?").bind(user.id,offset).all<any>();
  return accountReply({format:1,exportedAt:Date.now(),profile:{username:user.username,nickname:user.nickname,avatar:user.avatar,theme:user.theme,rules:user.rules},records:rows.results.slice(0,50).map(r=>({...r,bill:JSON.parse(r.bill)})),next:rows.results.length>50?offset+50:null});
 }
 const backup=await flushBackups(user.id),listed=await listBackups(user.id,url.searchParams.get('cursor')||undefined);
 return accountReply({backup,items:listed.objects.map(o=>({key:o.key,at:o.uploaded.getTime(),kind:o.key.includes('/settings/')?'settings':'record'})),cursor:listed.truncated?listed.cursor:null});
 }catch(e){return accountFailure(e)}}
export async function POST(req:Request){try{
 const b=await jsonBody(req),user=await requireAccount(req);await rateLimit(req,'backup:'+user.id,40);
 if(b.action==='retry'){await backupSettings(user.id);return accountReply({backup:await flushBackups(user.id)})}
 if(b.action!=='restore'||typeof b.key!=='string'||!b.key.startsWith('backups/'+user.id+'/')||! /^(settings\/\d+|records\/[a-zA-Z0-9.%_-]+)\.json$/.test(b.key.slice(('backups/'+user.id+'/').length)))throw new AccountError('备份不存在',404);
 const object=await env.BUCKET!.get(b.key);if(!object)throw new AccountError('备份不存在',404);const saved=await object.json<any>();
 if(saved.format!==1||saved.userId!==user.id)throw new AccountError('备份归属不正确',403);const data=saved.data;
 if(data.kind==='settings'){
  if(b.revision!==user.revision)throw new AccountError('账号设置已更新，请重新读取备份',409);
  const rules=validateRules(JSON.parse(data.rules));if(!validTheme(data.theme))throw new AccountError('备份配色不正确');
  await backupSettings(user.id);
  const r=await db().prepare('UPDATE mahjong_users SET nickname=?,avatar=?,theme=?,rules=?,revision=revision+1 WHERE id=? AND revision=?').bind(data.nickname,data.avatar,data.theme,JSON.stringify(rules),user.id,user.revision).run();if(!r.meta.changes)throw new AccountError('账号已更新，请重试',409);
  await backupSettings(user.id);const backup=await flushBackups(user.id);
  return accountReply({restored:'settings',backup,user:publicAccount(await db().prepare('SELECT * FROM mahjong_users WHERE id=?').bind(user.id).first())});
 }
 if(data.kind!=='record'||data.user_id!==user.id||!['multi','solo'].includes(data.mode))throw new AccountError('账单备份不正确');
 const r=await db().prepare('INSERT INTO mahjong_account_records (id,user_id,game_id,mode,room_code,round,at,delta,bill,has_replay,favorite) VALUES (?,?,?,?,?,?,?,?,?,0,0) ON CONFLICT(user_id,game_id) DO NOTHING').bind(data.id,user.id,data.game_id,data.mode,data.room_code,data.round,data.at,data.delta,data.bill).run();
 return accountReply({restored:r.meta.changes?'record':'alreadyExists'});
 }catch(e){return accountFailure(e)}}
