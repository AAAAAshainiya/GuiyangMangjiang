import {db} from '@/db';
import {AVATARS} from '@/lib/game';
import {defaultRules,validateRules} from '@/lib/rules';
import {validTheme} from '@/lib/themes';
import {getAccount,requireAccount,passwordHash,verifyHash,randomToken,digest,issueSession,accountCookie,publicAccount,AccountError,jsonBody,rateLimit,accountReply,accountFailure} from '@/lib/account-server';
export const dynamic='force-dynamic';
export async function GET(req:Request){try{return accountReply({user:await getAccount(req)})}catch(e){return accountFailure(e)}}
export async function POST(req:Request){try{
 const b=await jsonBody(req);
 if(b.action==='register'||b.action==='login'){
  const username=typeof b.username==='string'?b.username.trim().toLowerCase():'';
  if(!/^[a-z0-9_]{4,24}$/.test(username))throw new AccountError('账号需为4—24位字母、数字或下划线');
  if(typeof b.password!=='string'||b.password.length<8||b.password.length>128)throw new AccountError('密码需为8—128位');
  await rateLimit(req,'auth-ip',30);await rateLimit(req,'auth:'+username,8);
  let row=await db().prepare('SELECT * FROM mahjong_users WHERE username = ?').bind(username).first<any>();
  if(b.action==='register'){
   const nickname=typeof b.nickname==='string'?b.nickname.trim():'';if(!nickname||Array.from(nickname).length>12)throw new AccountError('昵称需为1—12个字');
   if(row)throw new AccountError('这个账号已注册，请换一个账号或直接登录',409);
   await rateLimit(req,'register',6,3600000);
   const id=crypto.randomUUID(),salt=randomToken(),hash=await passwordHash(b.password,salt);
   try{await db().prepare('INSERT INTO mahjong_users (id,username,password_hash,salt,nickname,avatar,theme,rules,revision,created_at) VALUES (?,?,?,?,?,?,?,?,1,?)').bind(id,username,hash,salt,nickname,AVATARS.includes(b.avatar)?b.avatar:AVATARS[0],'jade',JSON.stringify(defaultRules()),Date.now()).run()}catch(e){if((await db().prepare('SELECT id FROM mahjong_users WHERE username = ?').bind(username).first()))throw new AccountError('这个账号已注册',409);throw e}
   row=await db().prepare('SELECT * FROM mahjong_users WHERE id = ?').bind(id).first();
  }else{
   const hash=await passwordHash(b.password,row?.salt??'mahjong-dummy-salt-for-unknown-account');
   if(!row||!verifyHash(hash,row.password_hash))throw new AccountError('账号或密码不正确',401);
  }
  return accountReply({user:publicAccount(row)},200,accountCookie(await issueSession(row.id)));
 }
 if(b.action==='logout'){
  const token=req.headers.get('cookie')?.match(/(?:^|;\s*)mj_account=([a-f0-9]{64})(?:;|$)/)?.[1];if(token)await db().prepare('DELETE FROM mahjong_sessions WHERE token_hash = ?').bind(await digest(token)).run();return accountReply({user:null},200,accountCookie('',0));
 }
 const user=await requireAccount(req);await rateLimit(req,'settings:'+user.id,100);
 if(b.revision!==user.revision)throw new AccountError('账号设置已在另一处更新，请刷新后重试',409);
 let sql:string,args:unknown[];
 if(b.action==='profile'){
  const nickname=typeof b.nickname==='string'?b.nickname.trim():'';if(!nickname||Array.from(nickname).length>12||!AVATARS.includes(b.avatar)&&b.avatar!==user.avatar)throw new AccountError('请填写昵称并选择头像');
  sql='UPDATE mahjong_users SET nickname=?, avatar=?, revision=revision+1 WHERE id=? AND revision=?';args=[nickname,b.avatar,user.id,user.revision];
 }else if(b.action==='theme'){
  if(!validTheme(b.theme))throw new AccountError('请选择已有配色');sql='UPDATE mahjong_users SET theme=?, revision=revision+1 WHERE id=? AND revision=?';args=[b.theme,user.id,user.revision];
 }else if(b.action==='rules'||b.action==='resetRules'){
  let rules;try{rules=b.action==='resetRules'?defaultRules():validateRules(b.rules)}catch{throw new AccountError('积分规则内容或分值不正确')}
  sql='UPDATE mahjong_users SET rules=?, revision=revision+1 WHERE id=? AND revision=?';args=[JSON.stringify(rules),user.id,user.revision];
 }else throw new AccountError('不支持此操作');
 const saved=await db().prepare(sql).bind(...args).run();if(!saved.meta.changes)throw new AccountError('账号设置已在另一处更新，请刷新后重试',409);
 return accountReply({user:publicAccount(await db().prepare('SELECT * FROM mahjong_users WHERE id=?').bind(user.id).first())});
 }catch(e){return accountFailure(e)}}
