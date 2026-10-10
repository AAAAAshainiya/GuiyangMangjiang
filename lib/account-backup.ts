import {db} from '@/db';
import {env} from 'cloudflare:workers';
// Private, non-credential snapshots. Replays are deliberately excluded from backups.
export async function queueBackup(userId:string,key:string,data:unknown){
 await db().prepare('INSERT INTO mahjong_backup_jobs (key,user_id,data,updated) VALUES (?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated=excluded.updated').bind(key,userId,JSON.stringify({format:1,userId,data}),Date.now()).run();
}
export async function backupSettings(userId:string){const row=await db().prepare('SELECT id,nickname,avatar,theme,rules,revision FROM mahjong_users WHERE id=?').bind(userId).first<any>();if(row)await queueBackup(userId,'backups/'+userId+'/settings/'+row.revision+'.json',{kind:'settings',...row})}
export async function flushBackups(userId:string){
 const jobs=await db().prepare('SELECT key,data,updated FROM mahjong_backup_jobs WHERE user_id=? ORDER BY updated LIMIT 10').bind(userId).all<any>();
 let saved=0;for(const job of jobs.results){try{await env.BUCKET!.put(job.key,job.data,{httpMetadata:{contentType:'application/json'}});await db().prepare('DELETE FROM mahjong_backup_jobs WHERE key=? AND data=?').bind(job.key,job.data).run();saved++}catch{break}}
 return{saved,pending:(await db().prepare('SELECT count(*) AS n FROM mahjong_backup_jobs WHERE user_id=?').bind(userId).first<{n:number}>())?.n??0};
}
export async function listBackups(userId:string,cursor?:string){return await env.BUCKET!.list({prefix:'backups/'+userId+'/',limit:50,...(cursor?{cursor}:{})})}
