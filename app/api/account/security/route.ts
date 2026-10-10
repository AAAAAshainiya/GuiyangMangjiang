import {db} from '@/db';
import {requireAccount,getAccount,publicAccount,AccountError,jsonBody,rateLimit,accountReply,accountFailure,passwordHash,verifyHash,randomToken,digest,sessionToken,accountCookie,deviceName} from '@/lib/account-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{
 const u=await requireAccount(req),hash=await digest(sessionToken(req)!);
 await db().prepare('UPDATE mahjong_sessions SET last_seen=? WHERE token_hash=? AND last_seen<?').bind(Date.now(),hash,Date.now()-300000).run();
 const sessions=await db().prepare('SELECT token_hash AS id,device,created_at,last_seen,expires FROM mahjong_sessions WHERE user_id=? AND expires>? ORDER BY last_seen DESC').bind(u.id,Date.now()).all<any>();
 const row=await db().prepare('SELECT recovery_hash FROM mahjong_users WHERE id=?').bind(u.id).first<any>();
 return accountReply({recoveryReady:!!row?.recovery_hash,sessions:sessions.results.map(s=>({...s,current:s.id===hash}))});
 }catch(e){return accountFailure(e)}}
export async function POST(req:Request){try{
 const b=await jsonBody(req),recover=b.action==='recover';
 await rateLimit(req,'security-ip',40);let row:any;
 if(recover){
  const name=typeof b.username==='string'?b.username.trim().toLowerCase():'';
  if(!/^[a-z0-9_]{4,24}$/.test(name))throw new AccountError('账号或恢复码不正确',401);
  await rateLimit(req,'recovery:'+name,6);
  row=await db().prepare('SELECT * FROM mahjong_users WHERE username=?').bind(name).first();
  const code=typeof b.recoveryCode==='string'?b.recoveryCode.replace(/[\s-]/g,'').toLowerCase():'';
  const codeHash=await digest(code);
  if(!row?.recovery_hash||!verifyHash(codeHash,row.recovery_hash))throw new AccountError('账号或恢复码不正确',401);
 }else{
  const u=await requireAccount(req);row=await db().prepare('SELECT * FROM mahjong_users WHERE id=?').bind(u.id).first();await rateLimit(req,'security:'+u.id,30);
 }
 if(b.action==='revoke'||b.action==='revokeOthers'){
  const current=await digest(sessionToken(req)!);
  if(b.action==='revokeOthers')await db().prepare('DELETE FROM mahjong_sessions WHERE user_id=? AND token_hash<>?').bind(row.id,current).run();
  else{if(typeof b.id!=='string'||b.id===current)throw new AccountError('当前设备请使用退出账号');await db().prepare('DELETE FROM mahjong_sessions WHERE user_id=? AND token_hash=?').bind(row.id,b.id).run()}
  return accountReply({saved:true});
 }
 if(!['changePassword','recoveryCode','recover'].includes(b.action))throw new AccountError('不支持此操作');
 if(!recover){if(typeof b.oldPassword!=='string'||b.oldPassword.length>128||!verifyHash(await passwordHash(b.oldPassword,row.salt),row.password_hash))throw new AccountError('当前密码不正确',401)}
 const code=randomToken(),recoveryHash=await digest(code);
 if(b.action==='recoveryCode'){
  const saved=await db().prepare('UPDATE mahjong_users SET recovery_hash=? WHERE id=? AND salt=? AND recovery_hash IS ?').bind(recoveryHash,row.id,row.salt,row.recovery_hash??null).run();
  if(!saved.meta.changes)throw new AccountError('账号安全设置已更新，请重试',409);
  return accountReply({recoveryCode:code.match(/.{1,8}/g)!.join('-')});
 }
 if(typeof b.newPassword!=='string'||b.newPassword.length<8||b.newPassword.length>128)throw new AccountError('新密码需为8—128位');
 const salt=randomToken(),hash=await passwordHash(b.newPassword,salt),token=randomToken(),tokenHash=await digest(token),now=Date.now();
 const result=await db().batch([
  db().prepare('UPDATE mahjong_users SET password_hash=?,salt=?,recovery_hash=? WHERE id=? AND salt=? AND recovery_hash IS ?').bind(hash,salt,recover?recoveryHash:row.recovery_hash??null,row.id,row.salt,row.recovery_hash??null),
  db().prepare('INSERT INTO mahjong_sessions (token_hash,user_id,expires,created_at,last_seen,device) SELECT ?,id,?,?,?,? FROM mahjong_users WHERE id=? AND salt=?').bind(tokenHash,now+2592000000,now,now,deviceName(req),row.id,salt),
  db().prepare('DELETE FROM mahjong_sessions WHERE user_id=? AND token_hash<>? AND EXISTS (SELECT 1 FROM mahjong_sessions WHERE token_hash=?)').bind(row.id,tokenHash,tokenHash),
 ]);
 if(!result[0].meta.changes)throw new AccountError('安全设置已变化，请重新操作',409);
 return accountReply({user:publicAccount(row),...(recover?{recoveryCode:code.match(/.{1,8}/g)!.join('-')}:{})},200,accountCookie(token));
 }catch(e){return accountFailure(e)}}
