/* mod-backup.js — «Резервная копия партии» для Мастера (вкладка «Материалы»).
   Файл: {format:'smgla-backup',v:1,ts,data:{'tokens/<id>':{...},...,'game/state':{...}}}.
   Автокопия раз в 10 минут — в localStorage 'smgla-autobak-<комната|art>', 3 последних. Работает только через VTT.store. */
(function boot(){if(!window.VTT||!window.VTT.store)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
if(!V.isOwner||window.__mbak)return;window.__mbak=true;

const COLS=['tokens','chars','maps','notes','shapes','drawings','handouts','gm','log'];// ready не сохраняем
const DOCS=['game/state','game/audio'];
const LOG_N=300,AUTO_MS=10*60*1000,AUTO_KEEP=3,AUTO_MAX=1000000,AUTO_TOTAL=2000000;// размеры — в символах JSON
const OKKEY=/^(tokens|chars|maps|notes|shapes|drawings|handouts|gm|log)\/[A-Za-z0-9_\-]{1,60}$|^game\/(state|audio)$/;
const roomKey=(()=>{try{const r=new URLSearchParams(location.search).get('room');const s=String(r||'').toUpperCase().replace(/[^A-Z0-9]/g,'').slice(0,12);if(s)return s}catch(e){}
  return typeof V.room==='string'&&V.room?V.room:'art'})();
const AKEY='smgla-autobak-'+roomKey;

/* ---------- чтение: первый снимок подписки ---------- */
function snapCol(col,q){return new Promise((res,rej)=>{let done=false,un=null;
  const tm=setTimeout(()=>{if(done)return;done=true;try{un&&un()}catch(e){}rej(new Error('нет ответа: '+col))},15000);
  un=V.store.watchCol(col,a=>{if(done)return;done=true;clearTimeout(tm);res(a);setTimeout(()=>{try{un&&un()}catch(e){}},0)},q)})}
function snapDoc(p){return new Promise((res,rej)=>{let done=false,un=null;
  const tm=setTimeout(()=>{if(done)return;done=true;try{un&&un()}catch(e){}rej(new Error('нет ответа: '+p))},15000);
  un=V.store.watchDoc(p,d=>{if(done)return;done=true;clearTimeout(tm);res(d);setTimeout(()=>{try{un&&un()}catch(e){}},0)})})}
const strip=(d,id)=>{const o={...d};if(o.id===id)delete o.id;return o};
async function collect(opt={}){const data={};
  for(const c of COLS){const a=await snapCol(c,c==='log'?{order:'ts',dir:'desc',limit:opt.logN==null?LOG_N:opt.logN}:undefined);
    for(const d of a)data[c+'/'+d.id]=strip(d,d.id)}
  for(const p of DOCS){const d=await snapDoc(p);if(d)data[p]=JSON.parse(JSON.stringify(d))}
  return{format:'smgla-backup',v:1,ts:Date.now(),room:roomKey,data}}

/* ---------- файл ---------- */
const pad=n=>String(n).padStart(2,'0');
const stamp=t=>{const d=new Date(t);return`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}`};
const human=t=>{const d=new Date(t);return`${pad(d.getDate())}.${pad(d.getMonth()+1)} ${pad(d.getHours())}:${pad(d.getMinutes())}`};
function download(obj){const blob=new Blob([JSON.stringify(obj)],{type:'application/json'});const url=URL.createObjectURL(blob);
  const a=h('a',{href:url,download:`smgla-партия-${stamp(obj.ts)}.json`,style:'display:none'});document.body.append(a);a.click();
  setTimeout(()=>{a.remove();URL.revokeObjectURL(url)},1500)}
const count=o=>Object.keys(o.data).length;
let busy=false;
async function saveFile(){if(busy)return;busy=true;try{V.toast('Собираю партию…');const b=await collect();download(b);V.toast(`💾 Партия сохранена в файл: ${count(b)} записей`)}
  catch(e){console.error(e);V.toast('Не удалось сохранить партию: '+e.message)}finally{busy=false}}

/* ---------- проверка и восстановление ---------- */
function validate(o){if(!o||typeof o!=='object'||o.format!=='smgla-backup'||o.v!==1||!o.data||typeof o.data!=='object'||Array.isArray(o.data))return null;
  const data={};for(const [k,v] of Object.entries(o.data))if(OKKEY.test(k)&&v&&typeof v==='object'&&!Array.isArray(v))data[k]=v;
  return{...o,data}}
async function restore(b,what){if(busy)return;
  if(!confirm(`Заменить текущую партию${what?' копией '+what:''}? Сначала будет скачана копия текущей.`))return;
  busy=true;const U=V.undo;
  try{V.toast('Сохраняю копию текущей партии…');const curB=await collect({logN:100000});download(curB);
    if(U)U.pause(true);
    const hasLog=Object.keys(b.data).some(k=>k.startsWith('log/'));
    const extra=Object.keys(curB.data).filter(k=>!(k in b.data)&&!DOCS.includes(k)&&(hasLog||!k.startsWith('log/')));
    const order=k=>k.startsWith('maps/')?0:k.startsWith('tokens/')?1:k.startsWith('gm/')?2:k.startsWith('chars/')?3:k.startsWith('game/')?5:4;
    const keys=Object.keys(b.data).sort((x,y)=>order(x)-order(y));
    const total=extra.length+keys.length;let n=0;const tick=()=>{n++;if(n%25===0||n===total)V.toast(`📂 Загрузка партии: ${n} из ${total}`)};
    for(const k of extra){await V.store.del(k);tick()}
    for(const k of keys){await V.store.set(k,b.data[k]);tick()}
    if(U){U.pause(false);U.clear()}
    V.toast(`📂 Партия загружена: ${keys.length} записей${extra.length?`, удалено лишних ${extra.length}`:''}`);V.renderPane()}
  catch(e){console.error(e);V.toast('Ошибка загрузки партии: '+e.message)}
  finally{if(U)U.pause(false);busy=false}}
function pickFile(){const inp=h('input',{type:'file',accept:'.json,application/json',style:'display:none'});document.body.append(inp);
  inp.onchange=async()=>{const f=inp.files&&inp.files[0];inp.remove();if(!f)return;
    let o=null;try{o=validate(JSON.parse(await f.text()))}catch(e){o=null}
    if(!o){V.toast('Это не файл партии «Колоколов Солёной Мглы» (нужен smgla-backup, версия 1).');return}
    if(!count(o)){V.toast('В файле нет записей.');return}
    restore(o,`от ${human(o.ts||Date.now())} (${count(o)} записей)`)};
  inp.click()}

/* ---------- автокопия ---------- */
const readAuto=()=>{try{const a=JSON.parse(localStorage.getItem(AKEY)||'[]');return Array.isArray(a)?a:[]}catch(e){return[]}};
let lastSig='';
async function autoSave(){if(!V.isOwner||busy)return;
  try{const b=await collect({logN:50});const s=JSON.stringify(b.data);if(s===lastSig)return;
    if(s.length>AUTO_MAX)return;// слишком большая (картинки карт) — пропускаем молча
    let list=readAuto().filter(x=>x&&x.ts);list.push({ts:b.ts,n:count(b),s});list=list.slice(-AUTO_KEEP);
    while(list.length>1&&list.reduce((t,x)=>t+(x.s?x.s.length:0),0)>AUTO_TOTAL)list.shift();
    localStorage.setItem(AKEY,JSON.stringify(list));lastSig=s;refresh()}catch(e){/* нет места или хранилище закрыто — пропускаем */}}
setInterval(autoSave,AUTO_MS);
function restoreAuto(ts){const x=readAuto().find(a=>a.ts===ts);if(!x)return V.toast('Автокопия не найдена');
  let data=null;try{data=JSON.parse(x.s)}catch(e){}const o=validate({format:'smgla-backup',v:1,ts:x.ts,data});
  if(!o)return V.toast('Автокопия повреждена');restore(o,`от ${human(x.ts)}`)}

/* ---------- раздел Мастера ---------- */
const refresh=()=>{const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;try{if(document.querySelector('.mbak'))V.renderPane()}catch(e){}};
if(!document.getElementById('mbak-css')){const s=document.createElement('style');s.id='mbak-css';s.textContent=`
.mbak .row{display:flex;flex-wrap:wrap;gap:6px}
.mbak-list{margin:6px 0 0;padding:0;list-style:none}
.mbak-list li{display:flex;align-items:center;justify-content:space-between;gap:8px;border-bottom:1px solid var(--line,#243235);padding:5px 0;font-size:14px}
.mbak-list li span{color:var(--muted,#8e9e9b)}
@media (max-width:600px){.mbak button{min-height:40px}}
`;document.head.append(s)}
V.addGmSection(()=>{if(!V.isOwner)return null;const list=readAuto().slice().reverse();
  return[h('h3',{},'Резервная копия партии'),
    h('div',{class:'mbak'},
      h('p',{class:'small muted'},'Всё, что на столе: фишки, листы героев, карты, заметки, рисунки, записки, тайное Мастера и последние 300 записей журнала.'),
      h('div',{class:'row'},
        h('button',{class:'btn sm pri',type:'button',onclick:saveFile},'💾 Сохранить партию в файл'),
        h('button',{class:'btn sm',type:'button',onclick:pickFile},'📂 Загрузить из файла')),
      h('p',{class:'small muted',style:'margin:10px 0 0'},'Автокопии (раз в 10 минут, в этом браузере):'),
      list.length?h('ul',{class:'mbak-list'},...list.map(x=>h('li',{},h('b',{},human(x.ts),h('span',{},` · ${x.n} записей`)),
        h('button',{class:'btn sm',type:'button',onclick:()=>restoreAuto(x.ts)},'Восстановить')))):
        h('p',{class:'small muted',style:'margin:4px 0 0'},'Пока нет — первая появится через 10 минут.'))]});
})();
