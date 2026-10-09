type Pending={id:string,userId:string,body:any};
const DB_NAME='mahjong-account-sync-v32';
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>req.result.createObjectStore('rounds',{keyPath:'id'});req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error)})}
async function transaction<T>(mode:IDBTransactionMode,perform:(s:IDBObjectStore)=>IDBRequest<T>){const db=await database();try{return await new Promise<T>((resolve,reject)=>{const tx=db.transaction('rounds',mode),request=perform(tx.objectStore('rounds'));tx.oncomplete=()=>resolve(request.result);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}finally{db.close()}}
export const queueLocalRound=(userId:string,body:any)=>transaction('readwrite',s=>s.put({id:userId+':'+body.replay.id,userId,body} as Pending));
export const pendingLocalRounds=async(userId:string)=>(await transaction<Pending[]>('readonly',s=>s.getAll())).filter(r=>r.userId===userId);
export const completeLocalRound=(id:string)=>transaction('readwrite',s=>s.delete(id));
