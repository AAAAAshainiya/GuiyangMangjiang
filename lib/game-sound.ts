export type SoundKind='draw'|'discard'|'peng'|'gang'|'hu'|'zimo'|'flip'|'settle'|'turn'|'warning'|'interaction-pop'|'interaction-water'|'interaction-chirp'|'interaction-spark'|'interaction-tap';
export type SoundEvent={seq:number,kind:Exclude<SoundKind,'warning'>,seat:number,at:number,delayMs?:number};
export type SoundCue={kind:SoundKind,delayMs:number};

// Only public action names and seat numbers enter this stream, never tile identities.
export class GameSoundTracker{
 private code:string|null=null;
 private seq=0;
 private warning='';
 observe(room:any,now:number,active:boolean,since=0):SoundCue[]{
  if(!room){this.code=null;this.seq=0;this.warning='';return []}
  const events:SoundEvent[]=room.soundEvents??[];
  const latest=Math.max(0,...events.map(e=>e.seq));
  if(this.code!==room.code){this.code=room.code;this.seq=latest;this.warning='';return []}
  const fresh=events.filter(e=>e.seq>this.seq).sort((a,b)=>a.seq-b.seq);this.seq=Math.max(this.seq,latest);
  const cues:SoundCue[]=[];
  for(const event of fresh){
   if(!active||event.at<since||now-event.at>5000||event.at>now+1000||event.kind==='turn'&&event.seat!==room.me)continue;
   cues.push({kind:event.kind,delayMs:event.delayMs??0});
  }
  const canAct=room.phase==='play'&&room.turn===room.me||room.phase==='claim'&&(room.options?.length??0)>0;
  const key=room.code+':'+room.round+':'+room.phase+':'+room.deadline;
  if(canAct&&room.deadline>now&&room.deadline-now<=5000&&this.warning!==key){this.warning=key;if(active)cues.push({kind:'warning',delayMs:0})}
  return cues;
 }
}

// Short, quiet tile clicks and distinct action cues; no music, speech, or looping audio.
export class MahjongAudio{
 private context:AudioContext|null=null;
 private master:GainNode|null=null;
 private sources=new Set<AudioScheduledSourceNode>();
 private enabled=false;
 private makeContext:()=>AudioContext;
 constructor(makeContext:()=>AudioContext){this.makeContext=makeContext}
 async enable(){
  if(!this.context||this.context.state==='closed'){this.context=this.makeContext();this.master=this.context.createGain();this.master.gain.value=0;this.master.connect(this.context.destination)}
  await this.context.resume();
  this.enabled=true;this.master!.gain.setValueAtTime(.55,this.context.currentTime);
 }
 mute(){this.enabled=false;if(this.context&&this.master)this.master.gain.setValueAtTime(0,this.context.currentTime);this.stop()}
 stop(){for(const source of this.sources){try{source.stop()}catch{}}this.sources.clear()}
 dispose(){this.mute();void this.context?.close().catch(()=>{});this.context=null;this.master=null}
 interact(effect:string){
  const cue=({tomato:'interaction-pop',egg:'interaction-pop',water:'interaction-water',hammer:'interaction-tap',flower:'interaction-spark',tea:'interaction-spark',clap:'interaction-tap',chicken:'interaction-chirp',redpacket:'interaction-spark',lucky:'interaction-chirp',flock:'interaction-chirp',inspect:'interaction-pop'} as Record<string,SoundKind>)[effect];
  if(cue)this.play(cue,950);
 }
 play(kind:SoundKind,delayMs=0){
  const ac=this.context,master=this.master;if(!this.enabled||!ac||!master||ac.state!=='running')return;
  const base=ac.currentTime+Math.max(0,delayMs)/1000;
  const track=(source:AudioScheduledSourceNode,nodes:AudioNode[])=>{this.sources.add(source);source.onended=()=>{this.sources.delete(source);source.disconnect();nodes.forEach(node=>node.disconnect())}};
  const tone=(hz:number,offset:number,duration=.1,volume=.055,type:OscillatorType='sine')=>{
   const source=ac.createOscillator(),gain=ac.createGain();source.type=type;source.frequency.setValueAtTime(hz,base+offset);
   gain.gain.setValueAtTime(.0001,base+offset);gain.gain.exponentialRampToValueAtTime(volume,base+offset+.006);gain.gain.exponentialRampToValueAtTime(.0001,base+offset+duration);
   source.connect(gain);gain.connect(master);track(source,[gain]);source.start(base+offset);source.stop(base+offset+duration+.015);
  };
  const click=(offset:number,volume=.12,duration=.065,frequency=1800)=>{
   const buffer=ac.createBuffer(1,Math.ceil(ac.sampleRate*duration),ac.sampleRate),data=buffer.getChannelData(0);
   for(let i=0;i<data.length;i++)data[i]=(Math.random()*2-1)*Math.exp(-i/(ac.sampleRate*.018));
   const source=ac.createBufferSource(),filter=ac.createBiquadFilter(),gain=ac.createGain();source.buffer=buffer;filter.type='bandpass';filter.frequency.value=frequency;filter.Q.value=.8;gain.gain.value=volume;
   source.connect(filter);filter.connect(gain);gain.connect(master);track(source,[filter,gain]);source.start(base+offset);source.stop(base+offset+duration+.01);
  };
  if(kind==='draw'){click(0,.07,.09,1200);tone(440,.025,.045,.018)}
  else if(kind==='discard'){click(0,.16,.055,2400);tone(680,0,.05,.035,'triangle')}
  else if(kind==='peng'){click(0);click(.09);tone(620,.02,.11,.04,'triangle')}
  else if(kind==='gang'){click(0,.16);click(.075,.16);click(.15,.16);tone(420,.02,.2,.055,'triangle')}
  else if(kind==='hu'){[523,659,784].forEach((hz,i)=>tone(hz,i*.09,.24,.055,'triangle'));tone(1047,.29,.28,.04)}
  else if(kind==='zimo'){[659,784,988,1319].forEach((hz,i)=>tone(hz,i*.09,.25,.045,'triangle'))}
  else if(kind==='flip'){click(0,.055,.13,900);click(.13,.07,.06,2200)}
  else if(kind==='settle'){[392,494,587].forEach((hz,i)=>tone(hz,i*.1,.24,.04))}
  else if(kind==='turn'){tone(660,0,.09,.04);tone(880,.12,.12,.035)}
  else if(kind==='interaction-pop'){tone(210,0,.07,.045,'triangle');click(.03,.09,.05,700)}
  else if(kind==='interaction-water'){click(0,.22,.04,1100);click(.12,.15,.025,1800)}
  else if(kind==='interaction-chirp'){[850,1250,1000].forEach((hz,i)=>tone(hz,i*.07,.055,.025,'sine'))}
  else if(kind==='interaction-spark'){[780,1040,1300].forEach((hz,i)=>tone(hz,i*.08,.14,.02))}
  else if(kind==='interaction-tap'){click(0,.055,.04,1400);click(.12,.055,.035,1900);click(.24,.055,.03,1700)}
  else if(kind==='warning'){[0,.13,.26].forEach(offset=>tone(740,offset,.065,.035))}
 }
}
