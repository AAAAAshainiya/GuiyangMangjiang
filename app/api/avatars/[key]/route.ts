import {env} from 'cloudflare:workers';
export const dynamic='force-dynamic';
export async function GET(req:Request,{params}:{params:Promise<{key:string}>}){
 const {key}=await params;if(!/^[a-f0-9-]{36}\.(webp|png|jpg)$/.test(key))return new Response('不存在',{status:404});
 try{const obj=await env.BUCKET?.get('avatars/'+key);if(!obj)return new Response('不存在',{status:404});
 const headers=new Headers({'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"});obj.writeHttpMetadata(headers);headers.set('ETag',obj.httpEtag);return new Response(obj.body,{headers})}catch{return new Response('暂时不可用',{status:503})}
}
