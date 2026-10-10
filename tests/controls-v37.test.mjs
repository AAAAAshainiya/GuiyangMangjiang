// Source-level cascade/contrast checks, not a browser rendering test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {createRequire} from 'node:module';
import {loader} from './account-v32-loader.mjs';
const require=createRequire(import.meta.url),postcss=createRequire(require.resolve('vite'))('postcss');
const load=loader(),{THEMES,themeStyle}=await load('lib/themes.ts'),{Button}=await load('components/ui/button.tsx');
const rules=[];postcss.parse(fs.readFileSync('app/globals.css','utf8')).walkRules(rule=>{
 for(let p=rule.parent;p;p=p.parent)if(p.type==='atrule'&&p.name==='media')return;
 const declarations=rule.nodes.filter(n=>n.type==='decl'&&['color','background','background-color','filter'].includes(n.prop));
 if(declarations.length)rules.push({selector:rule.selector,declarations});
});
function split(s,delimiter=','){
 const parts=[];let depth=0,start=0,quote='';for(let i=0;i<s.length;i++){const c=s[i];if(quote){if(c===quote)quote='';continue}if(c==='"'||c==="'"){quote=c;continue}if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;if(depth===0&&c===delimiter){parts.push(s.slice(start,i).trim());start=i+1}}parts.push(s.slice(start).trim());return parts.filter(Boolean);
}
function chain(s){
 const parts=[];let depth=0,start=0,quote='';for(let i=0;i<s.length;i++){const c=s[i];if(quote){if(c===quote)quote='';continue}if(c==='"'||c==="'"){quote=c;continue}if(c==='('||c==='[')depth++;if(c===')'||c===']')depth--;if(depth===0&&(c===' '||c==='>')){if(s.slice(start,i).trim())parts.push(s.slice(start,i).trim());if(c==='>')parts.push('>');start=i+1}}if(s.slice(start).trim())parts.push(s.slice(start).trim());return parts;
}
function max(a,b){for(let i=0;i<3;i++){if(a[i]!==b[i])return a[i]>b[i]?a:b}return a}
function simple(s,n){
 let specificity=[0,0,0],matched=true;const tag=s.match(/^[\w-]+|^\*/);if(tag){specificity[2]+=tag[0]==='*'?0:1;matched&&=tag[0]==='*'||tag[0]===n.tag;s=s.slice(tag[0].length)}
 while(s){let m;
  if((m=s.match(/^\.([\w-]+)/))){specificity[1]++;matched&&=(n.attrs.className??'').split(/\s+/).includes(m[1]);s=s.slice(m[0].length)}
  else if((m=s.match(/^\[([^\]]+)\]/))){specificity[1]++;const [key,value]=m[1].split('=');matched&&=value===undefined?key in n.attrs:String(n.attrs[key])===value.replace(/^['"]|['"]$/g,'');s=s.slice(m[0].length)}
  else if((m=s.match(/^:(is|not)\(/))){let depth=1,i=m[0].length;for(;i<s.length&&depth;i++){if(s[i]==='(')depth++;if(s[i]===')')depth--}const items=split(s.slice(m[0].length,i-1)).map(x=>complex(x,n)),best=items.reduce((a,x)=>max(a,x.specificity),[0,0,0]);specificity=specificity.map((x,j)=>x+best[j]);matched&&=m[1]==='is'?items.some(x=>x.matched):!items.some(x=>x.matched);s=s.slice(i)}
  else if((m=s.match(/^:([\w-]+)/))){specificity[1]++;const first=n.parent?.children[0]===n,last=n.parent?.children.at(-1)===n;matched&&=({hover:!!n.hover,disabled:!!n.attrs.disabled,root:n.tag==='html','first-child':first,'last-child':last,'only-child':first&&last,'focus-visible':false,active:false})[m[1]]??false;s=s.slice(m[0].length)}
  else return {matched:false,specificity};
 }
 return {matched,specificity};
}
function complex(s,n){
 const parts=chain(s);let specificity=[0,0,0];for(const part of parts)if(part!=='>')specificity=specificity.map((v,i)=>v+simple(part,n).specificity[i]);
 function match(i,node){if(!node||!simple(parts[i],node).matched)return false;if(i===0)return true;if(parts[i-1]==='>')return match(i-2,node.parent);for(let p=node.parent;p;p=p.parent)if(match(i-1,p))return true;return false}
 return {matched:match(parts.length-1,n),specificity};
}
function element(tag,attrs={},parent=null){const n={tag,attrs,parent,children:[]};parent?.children.push(n);return n}
function button(parent,props={}){const actual=Button(props);return element('button',actual.props,parent)}
function style(n,prop){
 let winner=null;rules.forEach((rule,index)=>split(rule.selector).forEach(s=>{const m=complex(s,n);if(!m.matched)return;for(const d of rule.declarations){if(d.prop!==prop&&!(prop==='background'&&d.prop==='background-color'))continue;const priority=[d.important?1:0,...m.specificity,index];if(!winner||priority.some((v,i)=>v!==winner.priority[i]&&v>winner.priority[i]&&priority.slice(0,i).every((x,j)=>x===winner.priority[j])))winner={value:d.value,priority}}}));return winner?.value;
}
function color(s,vars){
 if(!s||s==='transparent'||s==='none')return null;
 s=s.replace(/var\((--[\w-]+)\)/g,(_,name)=>vars[name]);if(s==='white')s='#ffffff';if(s==='black')s='#000000';
 if(/^#[a-f0-9]{3}$/i.test(s))s='#'+[...s.slice(1)].map(x=>x+x).join('');
 if(/^#[a-f0-9]{6}$/i.test(s))return s.slice(1).match(/../g).map(x=>parseInt(x,16));
 if(/^#[a-f0-9]{8}$/i.test(s)){const rgba=s.slice(1).match(/../g).map(x=>parseInt(x,16));rgba[3]/=255;return rgba}
 const mix=s.match(/^color-mix\(in srgb,(.*)\)$/);if(mix){const [a,b]=split(mix[1]),weight=a.match(/ ([\d.]+)%$/),first=color(a.replace(/ [\d.]+%$/,''),vars),second=color(b.replace(/ [\d.]+%$/,''),vars);if(first&&second){const w=weight?Number(weight[1])/100:.5;return first.map((x,i)=>x*w+second[i]*(1-w))}}
 throw new Error('Unsupported color in fixture: '+s);
}
function paint(n,t,vars){
 const foreground=style(n,'color')??(n.attrs['data-variant']==='default'?'var(--mj-button-text)':null),background=style(n,'background')??(n.attrs['data-variant']==='default'?'var(--mj-accent)':n.attrs['data-variant']==='outline'?'var(--mj-page)':null);
 const inherited=n.parent?paint(n.parent,t,vars):{fg:color(t.ink,vars),bg:color(t.page,vars)};
 let fg=foreground?color(foreground,vars):inherited.fg,bg=background?color(background,vars)??inherited.bg:inherited.bg;
 if(bg.length===4)bg=bg.slice(0,3).map((x,i)=>x*bg[3]+inherited.bg[i]*(1-bg[3]));if(fg.length===4)fg=fg.slice(0,3).map((x,i)=>x*fg[3]+bg[i]*(1-fg[3]));
 const filter=style(n,'filter')?.match(/brightness\(([\d.]+)\)/);if(filter){fg=fg.map(x=>x*Number(filter[1]));bg=bg.map(x=>x*Number(filter[1]))}return {fg,bg};
}
function luminance(rgb){const v=rgb.map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return v[0]*.2126+v[1]*.7152+v[2]*.0722}
function contrast({fg,bg}){const a=luminance(fg),b=luminance(bg);return(Math.max(a,b)+.05)/(Math.min(a,b)+.05)}
let checks=0;
for(const t of THEMES){
 const vars=themeStyle(t.id),root=element('html',{'data-mj-theme':t.id}),body=element('body',{},root),card=element('section',{className:'entry-card'},body),table=element('section',{className:'table-shell'},body),top=element('div',{className:'table-top'},table),chat=element('div',{className:'chat-panel'},table);
 const cases={primary:button(card,{className:'primary-button'}),discard:button(card,{className:'primary-button discard'}),outline:button(card,{variant:'outline'}),header:button(card,{variant:'ghost',className:'header-button'}),replay:button(top,{variant:'outline',className:'replay-fullscreen'}),soundOff:button(top,{variant:'ghost',className:'header-button sound-toggle','aria-pressed':false}),soundOn:button(top,{variant:'ghost',className:'header-button sound-toggle','aria-pressed':true})};
 // Actual toolbar ancestor gives the on/off sound controls their original surfaces.
 const toolbar=element('div',{className:'table-toolbar'},top);for(const key of ['soundOff','soundOn']){cases[key].parent=toolbar;toolbar.children.push(cases[key])}
 const quick=element('div',{className:'chat-quick'},chat);cases.chatQuick=element('button',{},quick);
 cases.version=element('button',{},element('div',{className:'version-footer'},body));
 cases.accountTab=element('button',{'aria-pressed':false},element('nav',{className:'account-tabs'},card));
 const actions=element('div',{className:'table-action-buttons'},element('div',{className:'table-actions'},table));
 for(const name of ['action-button','action-button hu-button','action-button pass-button'])cases[name]=button(actions,{className:name});
 cases.next=button(element('div',{className:'next-round'},element('div',{className:'round-next-panel'},table)));
 cases.mode=element('button',{className:'mode-choice selected'},card);
 cases.modePlain=element('button',{className:'mode-choice'},card);
 const routes=element('div',{className:'entry-route-picker'},card);cases.route=element('button',{'aria-pressed':false},routes);cases.routeSelected=element('button',{'aria-pressed':true},routes);
 const target=element('div',{className:'target-effects'},chat);cases.interaction=element('button',{},target);
 cases.ruleLabel=element('span',{},element('button',{'aria-pressed':true},element('div',{className:'rule-tile-picker'},card)));
 cases.pause=button(element('div',{className:'paused-overlay'},table));
 cases.reopen=element('button',{className:'reopen-summary'},table);
 cases.close=element('button',{'data-slot':'dialog-close'},card);

 for(const [name,n]of Object.entries(cases))for(const hover of [false,true]){n.hover=hover;const pair=paint(n,t,vars),ratio=contrast(pair);if(ratio<4.5)console.log('contrast failure',name,pair,[n,n.parent,n.parent?.parent].map(x=>({tag:x.tag,attrs:x.attrs,color:style(x,'color'),bg:style(x,'background')})));assert(ratio>=4.5,`${t.name} ${name} ${hover?'hover':'normal'}: ${ratio.toFixed(2)}`);checks++}
}
console.log(`PASS v37: ${checks} actual-source CSS cascade contrast checks across seven themes, normal/hover primary/discard/actions/next/outline/header/replay/sound/chat/version/account/selected-mode controls. Browser rendering not simulated.`);
