import {env} from 'cloudflare:workers';
import {db} from '@/db';
import {requireAccount,checkOrigin,rateLimit,AccountError,accountReply,accountFailure,publicAccount} from '@/lib/account-server';
export const dynamic='force-dynamic';
export async function POST(req:Request){try{
 checkOrigin(req);const user=await requireAccount(req);await rateLimit(req,'avatar:'+user.id,15,3600000);
 if(!env.BUCKET)throw new AccountError('头像上传暂时不可用',503);
 if(Number(req.headers.get('content-length')||0)>350000)throw new AccountError('头像过大，请缩小后再上传',413);
 const bytes=new Uint8Array(await req.arrayBuffer());if(bytes.length>350000||bytes.length<16)throw new AccountError('头像大小不正确',413);
 let ext='',mime='';
 if(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff){ext='jpg';mime='image/jpeg'}
 else if([137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)){ext='png';mime='image/png'}
 else if(String.fromCharCode(...bytes.slice(0,4))==='RIFF'&&String.fromCharCode(...bytes.slice(8,12))==='WEBP'){ext='webp';mime='image/webp'}
 if(!ext||req.headers.get('content-type')!==mime)throw new AccountError('仅支持JPG、PNG或WebP照片');
 const key=crypto.randomUUID()+'.'+ext,path='/api/avatars/'+key;
 await env.BUCKET.put('avatars/'+key,bytes,{httpMetadata:{contentType:mime}});
 try{await db().batch([db().prepare('INSERT INTO mahjong_avatars (key,user_id,created_at) VALUES (?,?,?)').bind(key,user.id,Date.now()),db().prepare('UPDATE mahjong_users SET avatar=?, revision=revision+1 WHERE id=?').bind(path,user.id)])}catch(e){await env.BUCKET.delete('avatars/'+key);throw e}
 return accountReply({user:publicAccount(await db().prepare('SELECT * FROM mahjong_users WHERE id=?').bind(user.id).first())});
 }catch(e){return accountFailure(e)}}
