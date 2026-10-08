import assert from 'node:assert/strict';
import {create,player,act,options,tick,view} from '../lib/game.ts';
function table(){const r=create('ABCDEFGH','0','我');r.players=[0,1,2,3].map(i=>player(String(i),'玩家'+i));r.phase='play';r.turn=1;r.wall=[4,5,6];return r}
function pengTurn(){
 const r=table();r.players[0].hand=[0,0,1,2,3,9,10,11,18,19,20,22,22];r.players[1].hand=[0];
 act(r,1,'discard',0,1000);assert.deepEqual(options(r,0),['peng','pass']);act(r,0,'peng',undefined,1100);return r;
}
let r=pengTurn();assert.equal(r.drawn,null);assert.deepEqual(options(r,0),['discard']);
assert.throws(()=>act(r,0,'hu',undefined,1200));assert.equal(r.phase,'play');assert.equal(r.result,null);
r.players[0].bot=true;tick(r,r.deadline+1);assert.equal(r.result,null,'bot must discard after peng instead of claiming self-draw');
r=pengTurn();r.canKong=false;r.players[0].hand=[3,3,3,3,10,14,18,18];r.players[0].melds.push({t:15,k:'peng'});assert(!options(r,0).includes('gang:3'),'peng turn preserves the existing no-kong rule');
// A genuine self-draw remains legal, including the last tile in the wall.
r=table();r.turn=0;r.wall=[];r.drawn=25;r.players[0].hand=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
assert(options(r,0).includes('hu'));act(r,0,'hu',undefined,1000);assert.deepEqual(r.result.hu,[9,-3,-3,-3]);
// Concealed kong replacement draw remains eligible for kong flowers.
r=table();r.turn=0;r.drawn=4;r.canKong=true;r.wall=[6,25];r.players[0].hand=[4,4,4,4,1,2,3,10,11,12,21,22,23,25];
act(r,0,'gang',4,1000);assert(options(r,0).includes('hu'));act(r,0,'hu',undefined,1100);
assert.equal(r.result.kind,'杠上开花');assert.deepEqual(r.result.beanTransfers,[{from:1,to:0,points:4},{from:2,to:0,points:4},{from:3,to:0,points:4}]);
assert.deepEqual(r.result.beans,[12,-4,-4,-4]);
// Chicken sources total exactly the displayed personal value, including flip stacking.
r=table();r.turn=0;r.drawn=25;r.wall=[9];r.players[0].hand=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
r.players[0].river=[0,0,16,16,18];r.charges=[{tile:0,player:0,index:0,claimed:false}];
r.players[1].river=[18];r.charges.push({tile:18,player:1,index:0,claimed:false});
act(r,0,'hu',undefined,1000);assert.equal(r.result.values[0],13);assert.equal(r.result.values[1],-4);
for(let i=0;i<4;i++){
 const snapshot=view(r,String(i));assert.equal('chickenDetails' in snapshot.result,false);
 const sum=snapshot.result.myChickenDetails.reduce((n,d)=>n+d.points,0);
 assert.equal(sum*(snapshot.result.revealed[i]?1:-1)||0,r.result.values[i]);
 const chicken=r.players.reduce((n,_,j)=>j===i?n:n+r.result.values[i]-r.result.values[j],0);assert.equal(chicken,r.result.chicken[i]);
}
// Other players' concealed kong tiles are never revealed by the detail payload.
r=table();r.turn=0;r.drawn=25;r.wall=[];r.players[0].hand=[1,2,3,4,5,6,10,11,12,21,21,21,25,25];
r.players[1].melds=[{t:16,k:'gang',hidden:true}];r.players[1].hand=[1,2,3,10,11,12,21,22,23,25];
act(r,0,'hu',undefined,1000);assert(r.result.chickenDetails[1].some(d=>d.source==='an'&&d.tile===16));
assert.equal(view(r,'0').players[1].melds[0].t,-1);assert(!view(r,'0').result.myChickenDetails.some(d=>d.source==='an'));
assert(view(r,'1').result.myChickenDetails.some(d=>d.source==='an'&&d.tile===16));
// Ongoing old rounds never claim to have a complete ledger they did not record.
r=table();delete r.beanTransfers;r.turn=0;r.drawn=4;r.canKong=true;r.wall=[6,25];r.players[0].hand=[4,4,4,4,1,2,3,10,11,12,21,22,23,25];
act(r,0,'gang',4,1000);act(r,0,'hu',undefined,1100);assert.equal(r.result.beanTransfers,null);assert.deepEqual(r.result.beans,[12,-4,-4,-4]);
console.log('PASS: peng cannot become human or bot self-draw; legal draw and kong flowers; exact chicken sources, pairwise settlements, concealed detail privacy and legacy ledger handling.');
