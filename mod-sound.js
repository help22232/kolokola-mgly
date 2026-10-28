/* mod-sound.js — музыкальный автомат стола «Колокола Солёной Мглы».
   Весь звук синтезирован в WebAudio: атмосферы (Мастер выбирает, слышат все) и звуковые эффекты.
   Данные: документ game/audio {track, vol, ts} (пишет Мастер), тема комнаты 'sfx' {id} (шлёт Мастер).
   У каждого игрока своя громкость и «без звука» (localStorage). */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
"use strict";
const V=window.VTT,h=V.h;

/* ---------- справочник ---------- */
const TRACKS=[['sea','🌊','Море и туман'],['tavern','🍺','Таверна «Пьяный Баклан»'],['cave','🕳','Пещера'],['storm','⛈','Шторм'],
  ['underwater','🫧','Под водой'],['monastery','⛪','Монастырь'],['battle','⚔','Бой'],['ismerin','🔔','Ис-Мерин'],['silence','🤫','Тишина']];
const SFX=[['bell','🔔','Колокол'],['thunder','⚡','Гром'],['door','🚪','Скрип двери'],['swords','⚔','Звон мечей'],['splash','💦','Всплеск'],
  ['gull','🕊','Чайка'],['roar','👹','Рёв чудовища'],['chant','🎶','Пение певчих'],['dice','🎲','Бросок кубиков']];
const trackName=id=>(TRACKS.find(t=>t[0]===id)||[,'',''])[2];

/* ---------- настройки игрока ---------- */
const PREF_KEY='smgla-sound';
let pref={vol:.8,mute:false};
try{const p=JSON.parse(localStorage.getItem(PREF_KEY)||'null');if(p&&typeof p==='object')pref={vol:Math.min(1,Math.max(0,Number(p.vol)||0)),mute:!!p.mute}}catch(e){}
const savePref=()=>{try{localStorage.setItem(PREF_KEY,JSON.stringify(pref))}catch(e){}};

/* ---------- аудио-движок ---------- */
let ctx=null,master=null,trackBus=null,sfxBus=null,reverb=null,whiteBuf=null,brownBuf=null;
let want={track:'silence',vol:.7},cur=null;const fading=new Set();
const rand=(a,b)=>a+Math.random()*(b-a),pick=a=>a[Math.floor(Math.random()*a.length)];
const LOOK=1.2; // насколько вперёд планируем события, с: переживает притормаживание фоновой вкладки

function makeNoise(kind,sec){const len=Math.floor(ctx.sampleRate*sec),b=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=b.getChannelData(c);let l=0;for(let i=0;i<len;i++){const w=Math.random()*2-1;if(kind==='brown'){l=(l+.02*w)/1.02;d[i]=l*3.4}else d[i]=w}
    const f=Math.floor(ctx.sampleRate*.05);for(let i=0;i<f;i++){const k=i/f;d[i]=d[i]*k+d[len-f+i]*(1-k)}} // мягкая склейка петли
  return b}
function initAudio(){if(ctx)return;const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;ctx=new AC();
  master=ctx.createGain();const comp=ctx.createDynamicsCompressor();comp.threshold.value=-16;comp.ratio.value=3;master.connect(comp);comp.connect(ctx.destination);
  trackBus=ctx.createGain();trackBus.connect(master);sfxBus=ctx.createGain();sfxBus.gain.value=.9;sfxBus.connect(master);
  reverb=ctx.createConvolver();const len=ctx.sampleRate*3.2,ir=ctx.createBuffer(2,len,ctx.sampleRate);
  for(let c=0;c<2;c++){const d=ir.getChannelData(c);for(let i=0;i<len;i++)d[i]=(Math.random()*2-1)*Math.pow(1-i/len,3.2)}reverb.buffer=ir;
  const rv=ctx.createGain();rv.gain.value=.55;reverb.connect(rv);rv.connect(master);
  whiteBuf=makeNoise('white',3);brownBuf=makeNoise('brown',5);applyPref();
  setInterval(tick,120);ctx.onstatechange=renderBtn}
function applyPref(){if(master)master.gain.setTargetAtTime(pref.mute?0:pref.vol,ctx.currentTime,.08)}
function running(){return ctx&&ctx.state==='running'}
async function unlock(){initAudio();if(!ctx)return;try{if(ctx.state!=='running')await ctx.resume()}catch(e){}if(running())applyWant();renderBtn()}
['pointerdown','keydown','touchstart'].forEach(ev=>document.addEventListener(ev,()=>{if(!running())unlock()},{passive:true,capture:true}));

/* ---------- кирпичики звука ---------- */
function gainNode(v,dest){const g=ctx.createGain();g.gain.value=v;if(dest)g.connect(dest);return g}
function filt(type,f,Q,dest){const b=ctx.createBiquadFilter();b.type=type;b.frequency.value=f;if(Q!=null)b.Q.value=Q;if(dest)b.connect(dest);return b}
function noiseLoop(T,buf,dest,rate=1){const s=ctx.createBufferSource();s.buffer=buf;s.loop=true;s.playbackRate.value=rate;s.loopStart=0;s.connect(dest);s.start(ctx.currentTime+.01,Math.random()*buf.duration);T.srcs.push(s);return s}
function lfo(T,param,rate,depth){const o=ctx.createOscillator();o.frequency.value=rate;const g=gainNode(depth);o.connect(g);g.connect(param);o.start();T.srcs.push(o);return o}
function oscLoop(T,type,f,dest,detune=0){const o=ctx.createOscillator();o.type=type;o.frequency.value=f;o.detune.value=detune;o.connect(dest);o.start();T.srcs.push(o);return o}
function shot(t,dur,fn){const g=ctx.createGain();g.gain.value=0;fn(g);return g}
function noiseBurst(t,dur,dest,{type='bandpass',f=2000,Q=1,vol=.3,attack=.003,rate=1}={}){const s=ctx.createBufferSource();s.buffer=whiteBuf;s.playbackRate.value=rate;
  const b=filt(type,f,Q),g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);
  s.connect(b);b.connect(g);g.connect(dest);s.start(t,Math.random()*2);s.stop(t+dur+.05);return{b,g,s}}
function tone(t,f,dur,dest,{type='sine',vol=.2,attack=.005,f2=null,glide=dur}={}){const o=ctx.createOscillator();o.type=type;o.frequency.setValueAtTime(f,t);if(f2)o.frequency.exponentialRampToValueAtTime(f2,t+glide);
  const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+attack);g.gain.exponentialRampToValueAtTime(.0001,t+dur);o.connect(g);g.connect(dest);o.start(t);o.stop(t+dur+.05);return{o,g}}
function bell(t,f,vol,dest,muffled){const bus=filt('lowpass',muffled?700:7000,null,dest),bg=gainNode(vol,null);bg.connect(bus);
  const R=[.5,1,1.19,1.5,2,2.52,2.66,3.01,4.17],A=[.6,1,.55,.45,.35,.22,.18,.12,.08];
  R.forEach((r,i)=>{const dec=7*Math.pow(110/f,.35)/(1+i*.35);tone(t,f*r,dec,bg,{vol:A[i]*.25,attack:.008})})}
function pluck(t,f,vol,dest){const lp=filt('lowpass',3200,1.2,dest);lp.frequency.setValueAtTime(3200,t);lp.frequency.exponentialRampToValueAtTime(500,t+.9);
  tone(t,f,1.3,lp,{type:'triangle',vol,attack:.002});tone(t,f*2.003,.6,lp,{type:'sawtooth',vol:vol*.18,attack:.002})}
function drop(t,vol,dest){const f=rand(900,2600);tone(t,f,.18,dest,{vol,attack:.002,f2:f*.55,glide:.07})}
function bubble(t,vol,dest){const f=rand(250,600);tone(t,f,.09,dest,{vol,attack:.004,f2:f*rand(2,3.2),glide:.07})}
function kick(t,vol,dest,f=110){tone(t,f,.42,dest,{vol,attack:.002,f2:40,glide:.22})}
function tom(t,f,vol,dest){tone(t,f,.5,dest,{vol,attack:.002,f2:f*.62,glide:.35});noiseBurst(t,.12,dest,{f:900,Q:.7,vol:vol*.35})}
function clink(t,vol,dest){const f=rand(2800,4600);tone(t,f,.35,dest,{vol,attack:.001});tone(t,f*1.47,.22,dest,{vol:vol*.5,attack:.001})}
function thunder(t,vol,dest){const s=ctx.createBufferSource();s.buffer=brownBuf;const lp=filt('lowpass',700,.5,null),g=ctx.createGain(),d=rand(4,6.5);
  lp.frequency.setValueAtTime(900,t);lp.frequency.exponentialRampToValueAtTime(90,t+d);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+.08);
  for(let k=1;k<5;k++)g.gain.setTargetAtTime(vol*rand(.4,.9),t+k*rand(.3,.7),.15);g.gain.setTargetAtTime(.0001,t+1.8,d/4);
  s.connect(lp);lp.connect(g);g.connect(dest);s.start(t,Math.random()*3);s.stop(t+d+2);noiseBurst(t,.6,dest,{type:'highpass',f:1500,Q:.3,vol:vol*.5,attack:.01})}
function gull(t,vol,dest){for(let k=0;k<rand(2,4);k++){const t0=t+k*rand(.32,.45),f=rand(1300,1600);const o=ctx.createOscillator();o.type='triangle';
  o.frequency.setValueAtTime(f,t0);o.frequency.linearRampToValueAtTime(f*1.5,t0+.08);o.frequency.exponentialRampToValueAtTime(f*.8,t0+.3);
  const bp=filt('bandpass',2200,1.5,null),g=ctx.createGain();g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(vol,t0+.03);g.gain.exponentialRampToValueAtTime(.0001,t0+.32);
  o.connect(bp);bp.connect(g);g.connect(dest);o.start(t0);o.stop(t0+.4)}}

/* ---------- дорожки ---------- */
// Дорожка = узлы + расписание событий. ev(name,min,max,fn) — случайные события; pattern(bpm,fn) — ритм по шагам.
function makeTrack(id){const T={id,srcs:[],evs:[],pats:[],dead:false};
  T.out=ctx.createGain();T.out.gain.value=0;T.out.connect(trackBus);T.wet=gainNode(.3,reverb);T.out.connect(T.wet);
  T.ev=(min,max,fn,first)=>T.evs.push({min,max,fn,next:ctx.currentTime+(first!=null?first:rand(min,max))});
  T.pattern=(bpm,steps,fn)=>T.pats.push({dt:60/bpm/2,steps,fn,step:0,next:ctx.currentTime+.2});
  (BUILD[id]||(()=>{}))(T,T.out);return T}
function tick(){if(!running())return;const lim=ctx.currentTime+LOOK;
  for(const T of [cur,...fading]){if(!T||T.dead)continue;
    for(const e of T.evs){while(e.next<lim){try{e.fn(Math.max(e.next,ctx.currentTime+.02))}catch(err){console.error(err)}e.next+=rand(e.min,e.max)}}
    for(const p of T.pats){while(p.next<lim){try{p.fn(Math.max(p.next,ctx.currentTime+.02),p.step)}catch(err){console.error(err)}p.step=(p.step+1)%p.steps;p.next+=p.dt}}}}
function killTrack(T,fade){T.out.gain.cancelScheduledValues(ctx.currentTime);T.out.gain.setTargetAtTime(0,ctx.currentTime,fade/3);fading.add(T);
  setTimeout(()=>{T.dead=true;for(const s of T.srcs)try{s.stop()}catch(e){}try{T.out.disconnect();T.wet.disconnect()}catch(e){}fading.delete(T)},fade*1000+600)}
function applyWant(){if(!running())return;const vol=Math.max(0,Math.min(1,Number(want.vol)));
  if(!cur||cur.id!==want.track){if(cur)killTrack(cur,2.5);cur=want.track==='silence'?null:makeTrack(want.track);
    if(cur){cur.out.gain.setValueAtTime(0,ctx.currentTime);cur.out.gain.linearRampToValueAtTime(vol,ctx.currentTime+2.5)}}
  else cur.out.gain.setTargetAtTime(vol,ctx.currentTime,.25);renderBtn()}

const BUILD={
  sea(T,out){// волны: бурый шум с медленным дыханием; пена; изредка чайка и далёкий колокол
    const lp=filt('lowpass',480,.6,null),g=gainNode(.42,out);lp.connect(g);noiseLoop(T,brownBuf,lp);lfo(T,g.gain,.085,.24);lfo(T,lp.frequency,.05,160);
    const foam=filt('bandpass',1700,.5,null),fg=gainNode(.03,out);foam.connect(fg);noiseLoop(T,whiteBuf,foam);lfo(T,fg.gain,.13,.025);
    const wind=filt('bandpass',520,2,null),wg=gainNode(.05,out);wind.connect(wg);noiseLoop(T,whiteBuf,wind,.8);lfo(T,wind.frequency,.07,220);
    T.ev(14,34,t=>gull(t,.05,out));T.ev(30,70,t=>bell(t,pick([98,110,130.8]),.16,out,true),18)},
  tavern(T,out){// гомон: три полосы голосов с «болтовнёй», кружки, огонь, лютня по кругу Dm–C–B♭–A
    for(const [f,v] of [[320,.07],[720,.06],[1350,.03]]){const bp=filt('bandpass',f,1.6,null),g=gainNode(v,out);bp.connect(g);noiseLoop(T,brownBuf,bp,rand(.9,1.2));
      T.ev(.15,.6,t=>g.gain.setTargetAtTime(v*rand(.3,1.4),t,.12),0)}
    T.ev(.7,3,t=>clink(t,rand(.03,.07),out));T.ev(5,14,t=>kick(t,.12,out,90));
    const fire=filt('bandpass',3000,.8,null);fire.connect(gainNode(1,out));T.ev(.04,.35,t=>noiseBurst(t,rand(.01,.04),fire,{f:rand(1800,4200),Q:2,vol:rand(.02,.06)}));
    const CH=[[146.8,174.6,220,293.7],[130.8,164.8,196,261.6],[116.5,146.8,174.6,233.1],[110,138.6,164.8,220]];const ARP=[0,1,2,3,2,1,2,3];
    const lute=filt('lowpass',2600,null,out);T.pattern(98,32,(t,s)=>{const ch=CH[Math.floor(s/8)%4],n=ARP[s%8];if(Math.random()<.12)return;
      pluck(t,ch[n]*(Math.random()<.08?2:1),.085,lute);if(s%8===0)pluck(t,ch[0]/2,.06,lute);if(s%8===5&&Math.random()<.35)pluck(t+.08,ch[3]*1.5,.05,lute)})},
  cave(T,out){// гул, капли с эхом, редкий обвал
    oscLoop(T,'sine',55,gainNode(.05,out));oscLoop(T,'sine',82.4,gainNode(.025,out),4);
    const lp=filt('lowpass',150,.7,null);lp.connect(gainNode(.3,out));noiseLoop(T,brownBuf,lp,.7);
    const drip=gainNode(.6,out);T.wet.gain.value=.7;T.ev(.5,3,t=>{drop(t,rand(.05,.14),drip);if(Math.random()<.25)drop(t+rand(.08,.2),.04,drip)});
    T.ev(30,75,t=>thunder(t,.12,filt('lowpass',140,null,out)),25)},
  storm(T,out){// ветер, ливень, волны, гром
    const wind=filt('bandpass',600,1.4,null),wg=gainNode(.16,out);wind.connect(wg);noiseLoop(T,whiteBuf,wind);lfo(T,wind.frequency,.11,380);lfo(T,wg.gain,.17,.08);
    const rain=filt('highpass',1800,.4,null),rl=filt('lowpass',7500,null,null);rain.connect(rl);rl.connect(gainNode(.07,out));noiseLoop(T,whiteBuf,rain,1.1);
    const waves=filt('lowpass',380,.6,null),gw=gainNode(.35,out);waves.connect(gw);noiseLoop(T,brownBuf,waves);lfo(T,gw.gain,.12,.2);
    T.ev(8,22,t=>thunder(t,rand(.35,.6),out),4)},
  underwater(T,out){// глухая толща, пузыри, далёкий низкий стон
    const lp=filt('lowpass',230,.8,null),g=gainNode(.55,out);lp.connect(g);noiseLoop(T,brownBuf,lp,.6);lfo(T,g.gain,.06,.2);lfo(T,lp.frequency,.04,60);
    T.wet.gain.value=.6;const bb=filt('lowpass',1400,null,out);T.ev(.3,2.5,t=>{const n=Math.random()<.3?Math.floor(rand(3,7)):1;for(let k=0;k<n;k++)bubble(t+k*rand(.04,.11),rand(.03,.08),bb)});
    T.ev(20,45,t=>{const o=ctx.createOscillator();o.type='sine';o.frequency.setValueAtTime(rand(150,200),t);o.frequency.linearRampToValueAtTime(rand(110,130),t+1.4);o.frequency.linearRampToValueAtTime(rand(150,175),t+3);
      const v=ctx.createOscillator(),vg=gainNode(4,null);v.frequency.value=5;v.connect(vg);vg.connect(o.frequency);const e=ctx.createGain();e.gain.setValueAtTime(0,t);e.gain.linearRampToValueAtTime(.06,t+.8);e.gain.linearRampToValueAtTime(0,t+3.2);
      o.connect(e);e.connect(filt('lowpass',600,null,out));o.start(t);v.start(t);o.stop(t+3.4);v.stop(t+3.4)},12)},
  monastery(T,out){// ветер в руинах, далёкий хор (смена аккордов), колокольчики
    const wind=filt('bandpass',450,1.8,null),wg=gainNode(.08,out);wind.connect(wg);noiseLoop(T,whiteBuf,wind,.9);lfo(T,wind.frequency,.06,200);lfo(T,wg.gain,.09,.04);
    choir(T,out,[[110,164.8,220,261.6],[87.3,174.6,220,261.6],[130.8,164.8,196,261.6],[98,146.8,196,246.9]],.035,12);
    T.ev(6,16,t=>bell(t,pick([880,987.8,1174.7,1318.5]),.035,out,false));T.ev(25,60,t=>gull(t,.025,out))},
  battle(T,out){// барабаны 120 уд/мин с переходами и низкое остинато струнных
    const dr=gainNode(1,out),bs=filt('lowpass',650,1.4,out);const BASS=[73.4,73.4,87.3,73.4,82.4,73.4,65.4,73.4];let bar=0;
    T.pattern(120,16,(t,s)=>{if(s===0)bar++;const fill=bar%4===0&&s>=12;
      if(s%8===0||s===6||(s===14&&!fill))kick(t,.32,dr,95);if(s%8===4)noiseBurst(t,.18,dr,{f:1800,Q:.6,vol:.12});
      if(fill)tom(t,[196,174.6,146.8,130.8][s-12],.2,dr);else if(s%4===2&&Math.random()<.5)tom(t,pick([146.8,110]),.12,dr);
      const f=BASS[s%8];tone(t,f,.24,bs,{type:'sawtooth',vol:.07,attack:.01});tone(t,f*1.005,.24,bs,{type:'sawtooth',vol:.05,attack:.01})})},
  ismerin(T,out){// жуткий хор с «гуляющей» гласной, низкий гул, приглушённые колокола, нарастающий «вдох»
    oscLoop(T,'sine',36.7,gainNode(.08,out));oscLoop(T,'triangle',55,gainNode(.025,out),-6);
    choir(T,out,[[146.8,174.6,207.7,261.6],[138.6,174.6,207.7,277.2]],.045,16,true);T.wet.gain.value=.55;
    T.ev(9,20,t=>bell(t,pick([65.4,98,110,196]),.22,out,true),3);
    T.ev(24,40,t=>{const s=ctx.createBufferSource();s.buffer=whiteBuf;const bp=filt('bandpass',300,2,null),g=ctx.createGain();bp.frequency.setValueAtTime(200,t);bp.frequency.exponentialRampToValueAtTime(2400,t+4);
      g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.05,t+3.8);g.gain.linearRampToValueAtTime(0,t+4.1);s.connect(bp);bp.connect(g);g.connect(out);s.start(t);s.stop(t+4.3)},14)}
};
// хор: пилообразные с расстройкой через «гласную» полосу; аккорд меняется раз в every секунд
function choir(T,out,chords,vol,every,eerie){const bp=filt('bandpass',800,1.1,null),lp=filt('lowpass',2000,null,null),g=gainNode(vol,out);bp.connect(lp);lp.connect(g);
  lfo(T,g.gain,.07,vol*.5);lfo(T,bp.frequency,eerie?.05:.03,eerie?380:180);const oscs=[];
  chords[0].forEach(f=>{for(const dt of [-7,6]){const o=oscLoop(T,'sawtooth',f,bp,dt);lfo(T,o.detune,4.4+Math.random(),3);oscs.push(o)}});
  let i=0;T.ev(every,every,t=>{i=(i+1)%chords.length;chords[i].forEach((f,k)=>{for(const o of oscs.slice(k*2,k*2+2))o.frequency.setTargetAtTime(f,t,1.2)})})}

/* ---------- звуковые эффекты ---------- */
function playSfx(id){if(!running())return;const t=ctx.currentTime+.03,o=sfxBus,wet=gainNode(.35,reverb);
  ({bell:()=>{bell(t,196,.9,o,false);bell(t,196,.25,wet,false)},
    thunder:()=>thunder(t,.8,o),
    door:()=>{const s=ctx.createOscillator();s.type='sawtooth';s.frequency.setValueAtTime(90,t);for(let k=0;k<12;k++)s.frequency.linearRampToValueAtTime(rand(70,230),t+k*.11);
      const bp=filt('bandpass',900,6,null),g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.18,t+.1);g.gain.setValueAtTime(.18,t+1.1);g.gain.linearRampToValueAtTime(0,t+1.4);
      s.connect(bp);bp.connect(g);g.connect(o);s.start(t);s.stop(t+1.5);kick(t+1.35,.25,o,70)},
    swords:()=>{for(const dt of [0,.17,.42]){[1180,2630,3920,5230].forEach((f,i)=>tone(t+dt,f*rand(.97,1.03),.7-i*.1,o,{vol:.12/(i+1),attack:.001}));noiseBurst(t+dt,.08,o,{type:'highpass',f:3000,vol:.25})}},
    splash:()=>{const n=noiseBurst(t,.9,o,{type:'lowpass',f:3200,Q:.7,vol:.45,attack:.01});n.b.frequency.setValueAtTime(3200,t);n.b.frequency.exponentialRampToValueAtTime(350,t+.8);for(let k=0;k<6;k++)bubble(t+.3+k*rand(.05,.12),.06,o)},
    gull:()=>gull(t,.22,o),
    roar:()=>{const ws=ctx.createWaveShaper(),c=new Float32Array(1024);for(let i=0;i<1024;i++){const x=i/512-1;c[i]=Math.tanh(3*x)}ws.curve=c;
      const s=ctx.createOscillator();s.type='sawtooth';s.frequency.setValueAtTime(70,t);s.frequency.linearRampToValueAtTime(115,t+.4);s.frequency.linearRampToValueAtTime(60,t+1.7);
      const g=ctx.createGain();g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(.35,t+.15);g.gain.linearRampToValueAtTime(0,t+1.9);const lp=filt('lowpass',900,1,null);
      s.connect(ws);ws.connect(lp);lp.connect(g);g.connect(o);g.connect(wet);s.start(t);s.stop(t+2);noiseBurst(t,1.8,o,{type:'lowpass',f:600,vol:.25,attack:.1})},
    chant:()=>{[[220,261.6,329.6],[233.1,293.7,349.2],[207.7,261.6,311.1]].forEach((ch,k)=>{const t0=t+k*1.1;const bp=filt('bandpass',900,1.2,null),g=ctx.createGain();
      g.gain.setValueAtTime(0,t0);g.gain.linearRampToValueAtTime(.07,t0+.3);g.gain.linearRampToValueAtTime(0,t0+1.3);bp.connect(g);g.connect(o);g.connect(wet);
      ch.forEach(f=>{for(const dt of [-8,7]){const s=ctx.createOscillator();s.type='sawtooth';s.frequency.value=f;s.detune.value=dt;s.connect(bp);s.start(t0);s.stop(t0+1.4)}})})},
    dice:()=>{let tt=t;for(let k=0;k<9;k++){noiseBurst(tt,.03,o,{f:rand(2500,5200),Q:3,vol:rand(.12,.25)});tone(tt,rand(1800,3000),.05,o,{vol:.04,attack:.001});tt+=.04+k*.025}}
  }[id]||(()=>{}))()}

/* ---------- синхронизация ---------- */
V.store.watchDoc('game/audio',d=>{if(d&&typeof d.track==='string'&&TRACKS.some(t=>t[0]===d.track)){want={track:d.track,vol:d.vol==null?.7:Number(d.vol)}}else want={track:'silence',vol:.7};
  if(running())applyWant();renderBtn();if(V.isOwner)V.renderPane()});
let sfxOn=false;
function hookRoom(){const r=V.room;if(r&&!sfxOn){sfxOn=true;r.on('sfx',m=>{const d=m&&m.data;if(d&&typeof d.id==='string')playSfx(d.id)})}}
hookRoom();setTimeout(hookRoom,1500);
async function gmSetTrack(track,vol){if(!V.isOwner||V.readOnly)return;if(!running())await unlock();await V.store.set('game/audio',{track,vol:vol==null?want.vol:vol,ts:Date.now()})}
async function gmSfx(id){if(!running())await unlock();const r=V.room;if(r)r.emit('sfx',{id}).catch(()=>playSfx(id));else playSfx(id)}

/* ---------- интерфейс ---------- */
const css=document.createElement('style');css.textContent=`
.msnd-fab{position:fixed;z-index:20;display:flex;align-items:center;gap:6px;min-height:36px;padding:0 12px;border-radius:999px;border:1px solid var(--line,#243235);
  background:rgba(17,24,25,.92);color:var(--ink,#e3ebe8);font:500 13px var(--f-body,system-ui,sans-serif);cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.4)}
.msnd-fab.off{border-color:rgba(232,196,106,.6);color:#e8c46a;animation:msnd-pulse 2.4s ease-in-out infinite}
@keyframes msnd-pulse{50%{box-shadow:0 0 0 4px rgba(232,196,106,.15)}}
@media (prefers-reduced-motion:reduce){.msnd-fab.off{animation:none}}
.msnd-fab:focus-visible{outline:2px solid var(--sea,#8fd1c4)}
.msnd-pop{position:fixed;z-index:21;width:min(270px,calc(100vw - 24px));background:var(--panel,#111819);border:1px solid var(--line,#243235);border-radius:12px;padding:12px;
  color:var(--ink,#e3ebe8);font:14px var(--f-body,system-ui,sans-serif);box-shadow:0 10px 30px rgba(0,0,0,.55)}
.msnd-pop b{display:block;font-family:var(--f-display,Georgia,serif);font-size:17px;margin-bottom:4px}
.msnd-pop .now{color:var(--muted,#8e9e9b);font-size:13px;margin-bottom:10px}
.msnd-pop input[type=range]{width:100%;accent-color:#8fd1c4}
.msnd-pop label{display:flex;align-items:center;gap:8px;margin-top:8px;font-size:13px}
.msnd-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px;margin:6px 0 10px}
.msnd-grid button{display:flex;align-items:center;gap:6px;text-align:left;padding:8px 9px;border-radius:9px;border:1px solid var(--line,#243235);background:var(--panel2,#162022);color:inherit;cursor:pointer;font:inherit;font-size:13px;line-height:1.2}
.msnd-grid button[aria-pressed="true"]{border-color:var(--brass,#d9b36c);background:#231d10}
.msnd-grid button:focus-visible{outline:2px solid var(--sea,#8fd1c4)}
.msnd-vol{display:flex;align-items:center;gap:8px;font-size:13px;color:var(--muted,#8e9e9b)}
.msnd-vol input{flex:1;accent-color:#d9b36c}`;
document.head.append(css);
const fab=h('button',{type:'button',class:'msnd-fab','aria-haspopup':'dialog'}),pop=h('div',{class:'msnd-pop',role:'dialog','aria-label':'Звук'});pop.hidden=true;
(V.overlay()||document.body).append(fab,pop);
function place(){const b=document.getElementById('board');const r=b?b.getBoundingClientRect():{left:0,bottom:innerHeight};
  fab.style.left=Math.round(r.left+10)+'px';fab.style.top=Math.round(r.bottom-46)+'px';
  pop.style.left=Math.round(Math.max(12,r.left+10))+'px';pop.style.top=Math.round(Math.max(12,r.bottom-56-(pop.offsetHeight||190)))+'px'}
const bd=document.getElementById('board');if(bd&&window.ResizeObserver)new ResizeObserver(place).observe(bd);addEventListener('resize',place);addEventListener('scroll',place,true);setInterval(place,2000);
function renderBtn(){const on=running();fab.classList.toggle('off',!on);
  const narrow=(window.innerWidth||800)<600;fab.textContent=!on?(narrow?'🔇 Звук':'🔇 Нажмите, чтобы включить звук'):(pref.mute?'🔇':'🔊')+(!narrow&&want.track!=='silence'?' '+trackName(want.track):'');fab.title=on?'Громкость и звук':'Звук пока выключен браузером';
  if(!pop.hidden)renderPop();place()}
function renderPop(){const vol=h('input',{type:'range',min:0,max:100,value:Math.round(pref.vol*100),'aria-label':'Моя громкость'});
  vol.oninput=()=>{pref.vol=Number(vol.value)/100;applyPref();savePref()};
  const mute=h('input',{type:'checkbox',checked:pref.mute});mute.onchange=()=>{pref.mute=mute.checked;applyPref();savePref();renderBtn()};
  pop.replaceChildren(h('b',{},'Звук'),h('div',{class:'now'},'Сейчас: '+(want.track==='silence'?'тишина':trackName(want.track))+'. Музыку выбирает Мастер.'),
    h('div',{},'Моя громкость'),vol,h('label',{},mute,'Без звука'),
    h('button',{type:'button',class:'btn sm',style:'margin-top:10px',onclick:()=>{pop.hidden=true}},'Закрыть'));place()}
fab.onclick=async()=>{if(!running()){await unlock();return}pop.hidden=!pop.hidden;if(!pop.hidden)renderPop()};
document.addEventListener('pointerdown',e=>{if(!pop.hidden&&!pop.contains(e.target)&&e.target!==fab)pop.hidden=true},true);
renderBtn();

// раздел во вкладке «Мастер»
V.addGmSection(()=>{const vol=h('input',{type:'range',min:0,max:100,value:Math.round(want.vol*100),'aria-label':'Громкость музыки для всех'});
  vol.onchange=()=>gmSetTrack(want.track,Number(vol.value)/100);
  return[h('h3',{},'Музыка и звуки'),h('p',{class:'small muted'},'Атмосфера играет у всех за столом и плавно сменяется. Каждый игрок может убавить звук у себя кнопкой 🔊 на карте.'+(running()?'':' Звук в этой вкладке ещё не включён — нажмите любую кнопку ниже.')),
    h('div',{class:'msnd-grid'},...TRACKS.map(([id,ic,n])=>h('button',{type:'button','aria-pressed':String(want.track===id),onclick:()=>gmSetTrack(id)},h('span',{'aria-hidden':'true'},ic),n))),
    h('div',{class:'msnd-vol'},'Громкость для всех',vol),
    h('div',{class:'small muted',style:'margin-top:10px'},'Звуковые эффекты (слышат все):'),
    h('div',{class:'msnd-grid'},...SFX.map(([id,ic,n])=>h('button',{type:'button',onclick:()=>gmSfx(id)},h('span',{'aria-hidden':'true'},ic),n)))]});
V.renderPane();
})();
