/* mod-voices.js — «Голоса NPC»: Мастер нажимает реплику, и она звучит у всех за столом с субтитром внизу карты.
   Данные: voice-npc/voices.js (window.NPC_VOICES = [{id,name,role,img?,lines:[{file,text,dur}]}]).
   Синхронизация: тема комнаты 'sfx' (её шлёт только Мастер; в GitHub-версии игрокам она закрыта) с {voice:{npc,i}} или {voiceStop:true}.
   mod-sound.js такие сообщения пропускает (у них нет поля id). Громкость/«без звука» — из localStorage 'smgla-sound' (настройка кнопки 🔊).
   Во время реплики фон стола приглушается событиями cs-open/cs-close (их слушает mod-sound.js). */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
"use strict";
const V=window.VTT,h=V.h;

/* ---------- манифест ---------- */
let NPCS=[];
function loadManifest(){if(Array.isArray(window.NPC_VOICES)){NPCS=window.NPC_VOICES;return}
  const s=document.createElement('script');s.src='voice-npc/voices.js';s.onload=()=>{NPCS=Array.isArray(window.NPC_VOICES)?window.NPC_VOICES:[];if(V.isOwner)V.renderPane()};s.onerror=()=>{};document.head.append(s)}
loadManifest();
const findLine=(npc,i)=>{const n=NPCS.find(x=>x.id===npc);const l=n&&n.lines[i];return l?{n,l}:null};

/* ---------- настройки звука игрока (формат mod-sound.js) ---------- */
function pref(){try{const p=JSON.parse(localStorage.getItem('smgla-sound')||'null');if(p&&typeof p==='object')return{vol:Math.min(1,Math.max(0,Number(p.vol)||0)),mute:!!p.mute}}catch(e){}return{vol:.8,mute:false}}

/* ---------- проигрывание ---------- */
// Один и тот же <audio> на всё время: iOS разрешает ему играть позже без жеста, если он однажды запущен из жеста.
const el=new Audio();el.preload='auto';el.setAttribute('playsinline','');
const SILENT='data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';
let primed=false,playing=null,ducked=false,pending=null;
function prime(){if(primed||playing)return;primed=true;try{el.src=SILENT;el.volume=0;const p=el.play();if(p)p.then(()=>{if(!playing&&el.src.startsWith('data:'))el.pause()}).catch(()=>{primed=false})}catch(e){primed=false}}
['pointerdown','touchend','keydown'].forEach(ev=>document.addEventListener(ev,prime,{passive:true,capture:true}));
const csOpen=()=>{const c=document.getElementById('csov');return !!(c&&!c.hidden)};
function duck(on){if(on===ducked)return;if(on&&csOpen())return;ducked=on;if(!on&&csOpen())return;window.dispatchEvent(new Event(on?'cs-open':'cs-close'))}
function play(npc,i){const f=findLine(npc,i);if(!f)return;const {n,l}=f;stop(true);playing={npc,i};
  showSub(n,l);markBtns();const p=pref();
  if(p.mute||p.vol<=0){subTimer=setTimeout(()=>finish(),Math.max(2500,(l.dur||4)*1000+600));return} // без звука: только субтитр
  el.src=l.file;el.volume=p.vol;el.currentTime=0;duck(true);
  const pr=el.play();if(pr)pr.catch(err=>{if(err&&err.name==='NotAllowedError'){duck(false);pending={npc,i};showTap()}else finish()})}
function finish(){clearTimeout(subTimer);playing=null;duck(false);hideSub();markBtns()}
function stop(quiet){clearTimeout(subTimer);try{el.pause()}catch(e){}if(!quiet)finish();else{playing=null;duck(false)}hideTap()}
el.addEventListener('ended',()=>{if(playing)finish()});
el.addEventListener('error',()=>{if(playing&&el.src&&!el.src.startsWith('data:'))finish()});

/* ---------- синхронизация ---------- */
let hooked=false;
function hookRoom(){const r=V.room;if(r&&!hooked){hooked=true;r.on('sfx',m=>{const d=m&&m.data;if(!d)return;
  if(d.voiceStop)return stop();const v=d.voice;if(v&&typeof v.npc==='string'&&Number.isInteger(v.i))play(v.npc,v.i)})}}
hookRoom();setTimeout(hookRoom,1500);setTimeout(hookRoom,5000);
function send(data){const r=V.room;hookRoom();if(r)r.emit('sfx',data).catch(()=>local(data));else local(data)}
function local(d){if(d.voiceStop)stop();else play(d.voice.npc,d.voice.i)}
const gmPlay=(npc,i)=>{prime();send({voice:{npc,i}})},gmStop=()=>send({voiceStop:true});

/* ---------- интерфейс: субтитр и плашка ---------- */
const css=document.createElement('style');css.textContent=`
.mvo-sub{position:fixed;z-index:19;display:flex;gap:10px;align-items:flex-start;padding:9px 14px;border-radius:12px;border:1px solid rgba(217,179,108,.45);
  background:rgba(10,14,15,.9);color:var(--ink,#e3ebe8);font:16px/1.35 var(--f-body,system-ui,sans-serif);box-shadow:0 8px 24px rgba(0,0,0,.55);pointer-events:none;
  max-height:40vh;overflow:hidden}
.mvo-sub.hide{opacity:0;transition:opacity .25s}
.mvo-sub img{width:38px;height:38px;border-radius:50%;background:#1d2a2c;border:1px solid var(--line,#243235);flex:none}
.mvo-sub b{font-family:var(--f-display,Georgia,serif);font-weight:500;color:var(--brass,#d9b36c)}
@media (max-width:599px){.mvo-sub{font-size:13.5px;line-height:1.3;padding:7px 10px;gap:8px;border-radius:10px}.mvo-sub img{width:28px;height:28px}}
.mvo-tap{position:fixed;z-index:22;padding:9px 14px;border-radius:10px;border:1px solid rgba(232,196,106,.7);background:rgba(17,24,25,.96);color:#e8c46a;
  font:500 14px var(--f-body,system-ui,sans-serif);cursor:pointer;box-shadow:0 6px 18px rgba(0,0,0,.5);min-height:40px}
.mvo-tap:focus-visible,.mvo-grid button:focus-visible,.mvo-npc summary:focus-visible{outline:2px solid var(--sea,#8fd1c4);outline-offset:1px}
.mvo-npc{border:1px solid var(--line,#243235);border-radius:10px;background:var(--panel2,#162022);margin:6px 0}
.mvo-npc summary{display:flex;align-items:center;gap:9px;padding:7px 9px;cursor:pointer;list-style:none;min-height:40px}
.mvo-npc summary::-webkit-details-marker{display:none}
.mvo-npc summary::after{content:'▾';margin-left:auto;color:var(--muted,#8e9e9b);transition:transform .15s}
.mvo-npc[open] summary::after{transform:rotate(180deg)}
.mvo-npc summary img,.mvo-npc summary .ph{width:30px;height:30px;border-radius:50%;background:#1d2a2c;border:1px solid var(--line,#243235);flex:none;display:grid;place-items:center;font-size:15px}
.mvo-npc .nm{font-family:var(--f-display,Georgia,serif);font-size:16px;line-height:1.1}
.mvo-npc .rl{display:block;font-size:12px;color:var(--muted,#8e9e9b)}
.mvo-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:6px;padding:0 9px 9px}
.mvo-grid button{display:flex;gap:6px;align-items:flex-start;text-align:left;padding:7px 9px;border-radius:9px;border:1px solid var(--line,#243235);background:var(--panel,#111819);
  color:var(--ink,#e3ebe8);cursor:pointer;font:13px/1.25 var(--f-body,system-ui,sans-serif);min-height:40px}
.mvo-grid button span.t{display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.mvo-grid button[aria-pressed="true"]{border-color:var(--brass,#d9b36c);background:#231d10}
.mvo-grid button .ic{color:var(--sea,#8fd1c4);flex:none}
.mvo-bar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin:4px 0 6px}`;
document.head.append(css);
const sub=h('div',{class:'mvo-sub hide',role:'status','aria-live':'polite'});sub.hidden=true;
const tap=h('button',{type:'button',class:'mvo-tap'},'🔊 Нажмите, чтобы услышать');tap.hidden=true;
(V.overlay()||document.body).append(sub,tap);
let subTimer=0,hideT=0;
function boardRect(){const b=document.getElementById('board');return b?b.getBoundingClientRect():{left:0,top:0,right:innerWidth,bottom:innerHeight,width:innerWidth}}
function place(){const r=boardRect(),narrow=(window.innerWidth||800)<600,pad=narrow?8:16,w=Math.min(r.width-pad*2,640);
  if(!sub.hidden){sub.style.width=Math.round(w)+'px';sub.style.left=Math.round(r.left+(r.width-w)/2)+'px';
    // над нижними кнопками карты (звук/инструменты): на ПК ~56px, на телефоне ~64px
    let y=r.bottom-(narrow?64:58);document.querySelectorAll('#board .banner').forEach(b=>{if(b.hidden||!b.offsetParent)return;const q=b.getBoundingClientRect();if(q.height&&q.bottom>y-4)y=Math.min(y,q.top-8)});
    sub.style.top='';sub.style.bottom=Math.round(innerHeight-y)+'px'}
  if(!tap.hidden){tap.style.left=Math.round(r.left+(r.width-(tap.offsetWidth||230))/2)+'px';tap.style.top=Math.round(r.top+(narrow?60:16))+'px'}}
addEventListener('resize',place);
function showSub(n,l){clearTimeout(hideT);sub.replaceChildren(...(n.img?[h('img',{src:n.img,alt:''})]:[]),h('div',{},h('b',{},n.name+': '),l.text));
  sub.hidden=false;place();sub.classList.remove('hide')}
function hideSub(){sub.classList.add('hide');clearTimeout(hideT);hideT=setTimeout(()=>{sub.hidden=true},300)}
function showTap(){tap.hidden=false;place();clearTimeout(tapT);tapT=setTimeout(()=>{hideTap();if(playing)finish()},20000)}
let tapT=0;function hideTap(){tap.hidden=true;clearTimeout(tapT)}
tap.onclick=()=>{hideTap();const p=pending;pending=null;if(!p)return;primed=true;const pr=el.play();duck(true);if(pr)pr.catch(()=>finish())};

/* ---------- раздел Мастера ---------- */
const openSet=new Set();
function markBtns(){document.querySelectorAll('[data-mvo]').forEach(b=>b.setAttribute('aria-pressed',String(!!playing&&b.dataset.mvo===playing.npc+':'+playing.i)))}
const short=t=>t.length>60?t.slice(0,58).replace(/[\s,.—…]+\S*$/,'')+'…':t;
V.addGmSection(()=>{if(!NPCS.length)return[h('h3',{},'Голоса NPC'),h('p',{class:'small muted'},'Реплики не загружены (нет voice-npc/voices.js).')];
  return[h('h3',{},'Голоса NPC'),
    h('div',{class:'mvo-bar'},h('span',{class:'small muted',style:'flex:1;min-width:180px'},'Реплика звучит у всех за столом, внизу карты — субтитр. Громкость у каждого своя (кнопка 🔊).'),
      h('button',{type:'button',class:'btn sm',onclick:gmStop},'■ Стоп')),
    ...NPCS.map(n=>{const d=h('details',{class:'mvo-npc',open:openSet.has(n.id)||null},
        h('summary',{},n.img?h('img',{src:n.img,alt:''}):h('span',{class:'ph','aria-hidden':'true'},'🗣'),
          h('span',{},h('span',{class:'nm'},n.name),h('span',{class:'rl'},(n.role?n.role+' · ':'')+n.lines.length+' репл.'))),
        h('div',{class:'mvo-grid'},...n.lines.map((l,i)=>h('button',{type:'button','data-mvo':n.id+':'+i,title:l.text,'aria-label':n.name+': '+l.text,
          'aria-pressed':String(!!playing&&playing.npc===n.id&&playing.i===i),onclick:()=>gmPlay(n.id,i)},h('span',{class:'ic','aria-hidden':'true'},'▶'),h('span',{class:'t'},short(l.text))))));
      d.addEventListener('toggle',()=>{d.open?openSet.add(n.id):openSet.delete(n.id)});return d})]});
V.renderPane();
window.__voices={play,stop,gmPlay,gmStop,get playing(){return playing}};
})();
