// Run ONLY after Sites reports deployment succeeded. Read metadata and the
// ephemeral signing key from stdin; never write credentials to source or disk.
import {webcrypto} from 'node:crypto';
import {CURRENT_VERSION,RELEASE_PUBLIC_KEY} from '../lib/release-config.ts';
let input='';for await(const chunk of process.stdin)input+=chunk;
const {privateKey,record,baseUrl}=JSON.parse(input);
if(baseUrl!=='https://guiyang-mahjong-table.ashainidwq.chatgpt.site'||record.version!==CURRENT_VERSION)throw new Error('Release target does not match the checkout');
const data=new TextEncoder().encode(JSON.stringify([record.version,record.deployedAt,record.commit]));
const key=await webcrypto.subtle.importKey('jwk',privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);
const signature=Buffer.from(await webcrypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,data));
const verifier=await webcrypto.subtle.importKey('jwk',RELEASE_PUBLIC_KEY,{name:'ECDSA',namedCurve:'P-256'},false,['verify']);
if(!await webcrypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},verifier,signature,data))throw new Error('Signing key does not match this release');
const response=await fetch(baseUrl+'/api/releases',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({...record,signature:signature.toString('base64')})});
const result=await response.json();if(!response.ok||!result.saved)throw new Error(JSON.stringify(result));
process.stdout.write(JSON.stringify(result));
