import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';
import * as jsx from 'react/jsx-runtime';
let slots=[],cursor=0;
const hooks={useState(value){const i=cursor++;if(!(i in slots))slots[i]=value;return [slots[i],v=>slots[i]=typeof v==='function'?v(slots[i]):v]}};
const Button=()=>null,dialog=Object.fromEntries(['Dialog','DialogContent','DialogHeader','DialogTitle','DialogDescription'].map(n=>[n,()=>null]));
const mod=obj=>new vm.SyntheticModule(Object.keys(obj),function(){for(const k of Object.keys(obj))this.setExport(k,obj[k])});
const imports={'lucide-react':{Bot:()=>null},'react':hooks,'react/jsx-runtime':jsx,'@/components/ui/button':{Button},'@/components/ui/dialog':dialog};
const source=ts.transpileModule(fs.readFileSync('app/game-host.tsx','utf8'),{compilerOptions:{target:ts.ScriptTarget.ESNext,module:ts.ModuleKind.ESNext,jsx:ts.JsxEmit.ReactJSX}}).outputText;
const m=new vm.SourceTextModule(source);await m.link(n=>mod(imports[n]));await m.evaluate();
const nodes=t=>!t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];
const text=t=>typeof t==='string'?t:Array.isArray(t)?t.map(text).join(''):t&&typeof t==='object'?text(t.props?.children):'';
const base={isHost:true,phase:'lobby',version:7,round:2,me:0,players:[{name:'房主'},{name:'甲'},{name:'乙'}]};let props,calls=[];
function setup(room=base){slots=[];props={room:structuredClone(room),busy:false,onAction:async(...args)=>{calls.push(args);return {phase:'lobby'}}}}
function render(){cursor=0;return m.namespace.HostControls(props)}
function click(label){const n=nodes(render()).find(n=>n.type===Button&&(text(n)===label||n.props['aria-label']===label));assert(n,label);assert(!n.props.disabled,label);return n.props.onClick()}
for(const room of [{...base,isHost:false},{...base,local:true},{...base,solo:true}]){setup(room);assert.equal(render(),null)}
setup();click('房主管理');assert.equal(nodes(render()).find(n=>n.type===dialog.Dialog).props.open,true);assert(!nodes(render()).some(n=>text(n)==='终止本局'));assert(!nodes(render()).some(n=>n.props?.['aria-label']==='移出房主'));click('移出甲');let tree=render();assert(nodes(tree).some(n=>text(n)==='将甲移出房间？'));assert.deepEqual(calls,[],'selecting a target does not mutate the room');
props.room.version++;tree=render();assert(nodes(tree).find(n=>n.type===Button&&text(n)==='移出房间').props.disabled);props.room.version--;await nodes(render()).find(n=>n.type===Button&&text(n)==='移出房间').props.onClick();assert.deepEqual(calls,[['kick',1,{version:7,round:2}]]);assert.equal(nodes(render()).find(n=>n.type===dialog.Dialog).props.open,false);
for(const phase of ['play','claim']){
 setup({...base,phase});click('房主管理');assert(!nodes(render()).some(n=>n.props?.['aria-label']?.startsWith('移出')));click('终止本局');props.room.version++;assert.equal(nodes(render()).find(n=>n.type===Button&&text(n)==='终止本局').props.disabled,false,'same round can be terminated after another move');props.busy=true;assert(nodes(render()).find(n=>n.type===Button&&text(n)==='正在确认…').props.disabled);props.busy=false;props.room.round++;assert(nodes(render()).find(n=>n.type===Button&&text(n)==='终止本局').props.disabled);props.room.round--;await nodes(render()).find(n=>n.type===Button&&text(n)==='终止本局').props.onClick();assert.equal(calls.at(-1)[0],'terminate');assert.equal(calls.at(-1)[2].round,2);
}
setup({...base,phase:'done'});click('房主管理');assert(nodes(render()).some(n=>n.props?.['aria-label']==='移出甲'));assert(!nodes(render()).some(n=>n.type===Button&&text(n)==='终止本局'));
console.log('PASS: actual host UI authority/local exclusion, lobby/done kick vs play/claim terminate, deliberate confirmation, exact captured seat/version/round, busy locks and new-round/stale-seat safeguards.');
