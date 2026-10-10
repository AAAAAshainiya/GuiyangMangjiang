import assert from 'node:assert/strict';
import {create,player,start,act,view,tick} from '../lib/game.ts';
import {GameSoundTracker,MahjongAudio} from '../lib/game-sound.ts';
function table(){const r=create('ABCDEFGH','0','我');r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));r.phase='play';r.turn=0;r.drawn=25;r.wall=[8];return r}
let r=table();r.players[0].hand=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];act(r,0,'hu',undefined,1000);
assert.deepEqual(r.soundEvents.map(e=>[e.kind,e.delayMs]),[['zimo',0],['flip',2100],['settle',4200]]);
assert(view(r,'1').soundEvents.every(e=>Object.keys(e).every(k=>['seq','kind','seat','at','delayMs'].includes(k))),'sound payload never exposes tiles');
r=table();r.wall=[];r.players[0].hand=[0,0,0,3,3,3,9,9,9,18,18,18,22];r.turn=1;r.players[1].hand=[22];act(r,1,'discard',22,1000);act(r,0,'hu',undefined,1100);
assert.deepEqual(r.soundEvents.map(e=>e.kind),['discard','hu','settle']);assert.equal(r.soundEvents.at(-1).delayMs,1600);
r=table();r.players[0].hand=[0];r.players[1].hand=[0,0,2];act(r,0,'discard',0,1000);act(r,1,'peng',undefined,1100);assert.deepEqual(r.soundEvents.map(e=>e.kind),['discard','peng','turn']);
r=table();r.canKong=true;r.players[0].hand=[4,4,4,4,1,2,3,10,11,12,21,22,23,25];act(r,0,'gang',4,1000);assert.deepEqual(r.soundEvents.map(e=>e.kind),['gang','draw','turn']);assert.equal(view(r,'1').players[0].melds[0].t,4,'v28 concealed kongs are public face-up melds');
// A robbed attempt does not play a completed-kong sound.
r=table();r.canKong=true;r.players[0].melds=[{t:6,k:'peng'}];r.players[0].hand=[6,1,2,3,10,11,12,21,22,23,25];r.players[1].hand=[0,1,2,3,4,5,9,10,11,18,18,18,6];act(r,0,'bu',6,1000);assert.equal(r.soundEvents.length,0);act(r,1,'hu',undefined,1100);assert.equal(r.soundEvents[0].kind,'hu');assert(!r.soundEvents.some(e=>e.kind==='gang'));
r=table();r.wall=[];r.players[0].hand=[26];act(r,0,'discard',26,1000);assert.deepEqual(r.soundEvents.map(e=>e.kind),['discard','settle']);
// Public events are bounded; counters keep increasing across rounds.
r=create('ABCDEFGH','0','我');r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i,true));start(r,1000);
for(let i=0;i<400&&r.phase!=='done';i++)tick(r,r.deadline+1);
assert(r.soundEvents.length<=40);const lastSeq=r.soundSeq;r.players.forEach(p=>p.ready=true);start(r,100000);assert(r.soundSeq>lastSeq);
const tracker=new GameSoundTracker();let snapshot={code:'ABCDEFGH',round:1,me:0,phase:'play',turn:1,options:[],deadline:50000,soundEvents:[{seq:1,kind:'discard',seat:1,at:1000}]};
assert.deepEqual(tracker.observe(snapshot,1000,true),[],'joining never replays the current history');
snapshot={...snapshot,soundEvents:[...snapshot.soundEvents,{seq:2,kind:'draw',seat:1,at:1200},{seq:3,kind:'turn',seat:1,at:1200},{seq:4,kind:'peng',seat:2,at:1300}]};
assert.deepEqual(tracker.observe(snapshot,1400,true).map(c=>c.kind),['draw','peng']);assert.deepEqual(tracker.observe(snapshot,1500,true),[],'polls and retries do not replay');
snapshot={...snapshot,soundEvents:[...snapshot.soundEvents,{seq:5,kind:'gang',seat:1,at:1600}]};assert.deepEqual(tracker.observe(snapshot,1700,false),[]);assert.deepEqual(tracker.observe(snapshot,1800,true),[],'muted actions are not queued for unmute');
snapshot={...snapshot,soundEvents:[...snapshot.soundEvents,{seq:6,kind:'discard',seat:1,at:2000},{seq:7,kind:'hu',seat:1,at:8500},{seq:8,kind:'settle',seat:1,at:8500,delayMs:2600}]};
assert.deepEqual(tracker.observe(snapshot,9000,true).map(c=>c.kind),['hu','settle'],'stale reconnect actions are discarded');
snapshot={...snapshot,turn:0,options:['discard'],deadline:13000};assert.deepEqual(tracker.observe(snapshot,9000,true).map(c=>c.kind),['warning']);assert.deepEqual(tracker.observe(snapshot,10000,true),[],'five-second warning fires once');
snapshot={...snapshot,soundEvents:[...snapshot.soundEvents,{seq:9,kind:'discard',seat:1,at:10100}]};assert.deepEqual(tracker.observe(snapshot,10500,true,10400),[],'background actions are not replayed on return');
assert.deepEqual(tracker.observe({...snapshot,code:'NEWROOM2'},10600,true),[],'room changes reset the history baseline');
// Exercise the actual synthesis lifecycle with a minimal Web Audio implementation.
class Param{value=0;setValueAtTime(v){this.value=v}exponentialRampToValueAtTime(v){this.value=v}}
class Node{gain=new Param();frequency=new Param();Q=new Param();connect(){}disconnect(){this.disconnected=true}start(t){this.startAt=t}stop(t){this.stopAt=t;this.stops=(this.stops??0)+1}}
const sources=[],ac={state:'suspended',currentTime:2,sampleRate:8000,destination:new Node(),createGain:()=>new Node(),createOscillator(){const n=new Node();sources.push(n);return n},createBufferSource(){const n=new Node();sources.push(n);return n},createBiquadFilter:()=>new Node(),createBuffer:(_,n)=>({getChannelData:()=>new Float32Array(n)}),async resume(){this.state='running'},async close(){this.state='closed'}};
const audio=new MahjongAudio(()=>ac);audio.play('draw');assert.equal(sources.length,0,'default is silent before enabling');await audio.enable();
for(const kind of ['draw','discard','peng','gang','hu','zimo','flip','settle','turn','warning']){const n=sources.length;audio.play(kind);assert(sources.length>n,kind+' creates a sound');assert(sources.slice(n).every(s=>s.stopAt-s.startAt<1),'all sounds end within one second')}
const beforeRemoved=sources.length;audio.interact('clap');assert.equal(sources.length,beforeRemoved,'removed applause has no sound');audio.interact('tomato');assert(sources.length>beforeRemoved,'remaining targeted interactions keep their sound');
audio.play('settle',2600);assert(sources.at(-1).startAt>=4.6);const n=sources.length;audio.mute();assert(sources.every(s=>s.stops>=2),'mute cancels active and future sounds');audio.play('hu');assert.equal(sources.length,n);audio.dispose();assert.equal(ac.state,'closed');
console.log('PASS: engine action sounds, bots and privacy, bounded monotonic events, no false robbed-kong sound, deduplication, mute/background/history handling, one timeout cue and Web Audio synthesis/cleanup.');
