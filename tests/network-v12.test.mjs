import assert from 'node:assert/strict';
import {TableActionCoordinator,TableRequestError,tableRequest} from '../lib/table-client.ts';
const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
const body={action:'discard',code:'ABCD',tile:18,version:3,context:'own visible context'};
let sent=[];
const failed=new TableActionCoordinator(async(url,init)=>{sent.push(JSON.parse(init.body));throw new Error('transport lost')},storage);
await assert.rejects(failed.perform(body),/transport lost/);const pending=failed.pending;assert(pending?.clientId);assert(values.has('mahjong-action:ABCD'));
await assert.rejects(failed.perform(body),/正在确认/);assert.equal(sent.length,1,'new action remains blocked until outcome is known');
const confirmed=await failed.recover({code:'ABCD',version:4,actionAck:{clientId:pending.clientId,status:'applied'}});
assert.equal(confirmed.outcome,'confirmed');assert.equal(failed.pending,null);assert.equal(values.size,0);assert.equal(sent.length,1,'applied receipt never replays an action');
// Refresh restores the exact payload, then checks a snapshot before replay.
await assert.rejects(failed.perform(body));const refreshId=failed.pending.clientId;
const restored=new TableActionCoordinator(async(url,init)=>{const request=JSON.parse(init.body);sent.push(request);return {code:'ABCD',version:4,actionAck:{clientId:request.clientId,status:'applied'}}},storage);
restored.restore('ABCD');assert.equal(restored.pending.clientId,refreshId);assert.match(restored.url('ABCD'),new RegExp(refreshId));
const retried=await restored.recover({code:'ABCD',version:3,actionContext:body.context,actionAck:{clientId:refreshId,status:'not_found'}});
assert.equal(retried.outcome,'confirmed');assert.equal(sent.at(-1).clientId,refreshId);assert.equal(sent.at(-1).tile,18);assert.equal(sent.at(-1).context,body.context);assert.equal(restored.pending,null);
// A changed turn drops an obsolete request, without silently playing a new turn.
await assert.rejects(failed.perform(body));const before=sent.length;
const changed=await failed.recover({code:'ABCD',version:5,actionContext:'different turn',actionAck:{clientId:failed.pending.clientId,status:'not_found'}});
assert.equal(changed.outcome,'changed');assert.equal(failed.pending,null);assert.equal(sent.length,before);
// Lobby toggles also use versioned IDs; direct 409 carries the latest snapshot.
const rejection=new TableActionCoordinator(async()=>{throw new TableRequestError('updated',409,{code:'STATE_CHANGED',state:{code:'ABCD',version:9}})},storage);
await assert.rejects(rejection.perform({...body,action:'ready'}),e=>e.data.state.version===9);assert.equal(rejection.pending,null);
// A failed status check is harmless, and a successful leave has an explicit ack.
await assert.rejects(failed.perform({...body,action:'leave'}));const leaveId=failed.pending.clientId;
assert.equal((await failed.recover({code:'ABCD',version:3})).outcome,'pending');assert(failed.pending);
assert.equal((await failed.recover({left:true,actionAck:{clientId:leaveId,status:'applied'}})).outcome,'confirmed');assert.equal(failed.pending,null);
// Two resume requests cannot cause two simultaneous retries.
await assert.rejects(failed.perform(body));let finish,retries=0;
const racing=new TableActionCoordinator(async(url,init)=>{retries++;return new Promise(resolve=>finish=()=>resolve({code:'ABCD',version:4,actionAck:{clientId:JSON.parse(init.body).clientId,status:'applied'}}))},storage);
racing.restore('ABCD');const snapshot={code:'ABCD',version:3,actionContext:body.context,actionAck:{clientId:racing.pending.clientId,status:'not_found'}};
const first=racing.recover(snapshot);assert.equal((await racing.recover(snapshot)).outcome,'pending');assert.equal(retries,1);finish();assert.equal((await first).outcome,'confirmed');
// Unavailable storage is tolerated. HTTP errors retain machine-readable details.
const blocked={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')},removeItem(){throw new Error('blocked')}};
const noStore=new TableActionCoordinator(async()=>({code:'ABCD',version:4}),blocked);noStore.restore('ABCD');await noStore.perform(body);assert.equal(noStore.pending,null);
const oldFetch=globalThis.fetch;globalThis.fetch=async()=>Response.json({code:'STATE_CHANGED',state:{version:7},error:'updated'},{status:409});
await assert.rejects(tableRequest('/api/table'),e=>e instanceof TableRequestError&&e.status===409&&e.data.state.version===7);globalThis.fetch=oldFetch;
console.log('PASS: v12 client acknowledgments, refresh restoration, identical-ID retries, changed-turn cancellation, duplicate lock, leave recovery, concurrent-resume lock, blocked storage and typed snapshot errors.');
