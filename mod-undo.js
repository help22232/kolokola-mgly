/* mod-undo.js — «Отменить» для Мастера: ↶ на карте и Ctrl+Z.
   Оборачивает VTT.store.set/update/del: для tokens/*, chars/*, maps/*, gm/mon_*, game/state запоминает прежний документ.
   Записи в пределах 400 мс — один шаг (урон = gm/mon + tokens + log). log/ не отменяется. Стек — 30 шагов. */
(function boot(){if(!window.VTT||!window.VTT.store)return setTimeout(boot,50);
const V=window.VTT,h=V.h,store=V.store;
if(!V.isOwner||store.__undo)return;store.__undo=true;

const MAX=30,GAP=400;
const tracked=p=>/^(tokens|chars|maps)\/[^/]+$/.test(p)||/^gm\/mon_[^/]+$/.test(p)||p==='game/state';
const J=o=>o==null?null:JSON.parse(JSON.stringify(o));

/* ---------- кэш текущих документов ---------- */
const cache=new Map();
const strip=d=>{const o={...d};delete o.id;return o};
function watchC(col,filter){store.watchCol(col,a=>{for(const k of [...cache.keys()])if(k.startsWith(col+'/'))cache.delete(k);
  for(const d of a){if(filter&&!filter(d.id))continue;cache.set(col+'/'+d.id,strip(d))}})}
watchC('tokens');watchC('chars');watchC('maps');watchC('gm',id=>id.startsWith('mon_'));
store.watchDoc('game/state',d=>{if(d)cache.set('game/state',J(d));else cache.delete('game/state')});

/* ---------- описание шага ---------- */
const idOf=p=>{const s=p.split('/').pop();return s.startsWith('mon_')?s.slice(4):s};
const nameOf=(p,prev,d)=>{const id=idOf(p),t=V.S.tokens&&V.S.tokens[id];return(t&&t.name)||(prev&&prev.name)||(d&&d.name)||'фишка'};
function describe(p,op,d,prev){// → [ранг, текст]
  const col=p.split('/')[0],n=nameOf(p,prev,d),after=op==='update'&&prev?{...prev,...d}:d;
  const ch=k=>op!=='del'&&after&&k in after&&JSON.stringify(after[k])!==JSON.stringify(prev?prev[k]:undefined);
  const hpTxt=()=>((after.hp||0)<((prev&&prev.hp)||0)?'урон ':'лечение ')+n;
  if(p==='game/state'){const a=after||{},b=prev||{},ca=a.combat||{},cb=b.combat||{};
    if(a.map!==b.map)return[3,'смена карты'];
    if(!!ca.on!==!!cb.on)return[3,ca.on?'начало боя':'конец боя'];
    if(ca.turn!==cb.turn||ca.round!==cb.round)return[2,'переход хода'];
    if(a.mist!==b.mist)return[2,'шкала Мглы'];
    return[1,'состояние игры']}
  if(col==='maps'){const mn=(prev&&prev.name)||(d&&d.name)||'';return[op==='del'?4:1,(op==='del'?'удаление карты ':prev?'изменение карты ':'добавление карты ')+mn]}
  if(op==='del')return[4,'удаление '+n];
  if(!prev)return[4,'добавление '+n];
  if(ch('hp'))return[5,hpTxt()];
  if(col==='tokens'&&(ch('x')||ch('y')))return[3,'перемещение '+n];
  if(ch('cond'))return[3,'состояния '+n];
  if(ch('init')||ch('inCombat'))return[2,'инициатива '+n];
  if(col==='chars')return[2,'лист героя '+n];
  if(col==='gm')return[2,'параметры '+n];
  return[1,'изменение '+n]}

/* ---------- стек ---------- */
const stack=[];let cur=null,lastAt=0;
const t0=Date.now();// первые 2 с после загрузки — служебные записи стола (подготовка листов и т.п.), их не отменяем
function record(p,op,d){if(!tracked(p)||Date.now()-t0<2000)return;
  try{const now=Date.now();
    if(!cur||now-lastAt>GAP){cur={items:new Map(),desc:[0,'изменение'],ents:new Set()};stack.push(cur);if(stack.length>MAX)stack.shift()}
    lastAt=now;const prev=cache.has(p)?J(cache.get(p)):null;
    if(!cur.items.has(p))cur.items.set(p,prev);
    cur.ents.add(p==='game/state'?p:p.startsWith('maps/')?p:idOf(p));
    const ds=describe(p,op,d,prev);if(ds[0]>cur.desc[0])cur.desc=ds;
    renderBtn()}catch(e){console.error(e)}}
const label=g=>g.desc[1]+(g.ents.size>1?` и ещё ${g.ents.size-1}`:'');

const orig={set:store.set,update:store.update,del:store.del};
let paused=false;
store.set=function(p,d){if(!paused)record(p,'set',d);return orig.set.call(this,p,d)};
store.update=function(p,d){if(!paused)record(p,'update',d);return orig.update.call(this,p,d)};
store.del=function(p){if(!paused)record(p,'del',null);return orig.del.call(this,p)};
// для других модулей (например резервной копии): пауза записи и очистка стека
V.undo={pause(b){paused=!!b;if(b)cur=null},clear(){stack.length=0;cur=null;renderBtn()},get size(){return stack.length}};

async function undo(){if(V.readOnly)return;const g=stack.pop();if(!g)return;if(g===cur)cur=null;renderBtn();
  // сначала документы, потом состояние игры; прямые вызовы — не попадают в стек
  const items=[...g.items].sort((a,b)=>(a[0]==='game/state')-(b[0]==='game/state'));
  try{for(const [p,prev] of items){if(prev==null)await orig.del.call(store,p);else await orig.set.call(store,p,prev)}
    V.toast('↶ Отменено: '+label(g))}catch(e){console.error(e);V.toast('Не удалось отменить: '+label(g))}
  V.requestDraw()}

/* ---------- кнопка ---------- */
if(!document.getElementById('mundo-css')){const s=document.createElement('style');s.id='mundo-css';s.textContent=`
.mundo-fab{position:absolute;z-index:3;width:38px;height:38px;border-radius:50%;border:1px solid var(--line,#243235);background:rgba(17,24,25,.9);color:var(--ink,#e3ebe8);
  font-size:20px;line-height:1;display:flex;align-items:center;justify-content:center;cursor:pointer;padding:0;box-shadow:0 3px 10px rgba(0,0,0,.45)}
.mundo-fab:not(:disabled):hover{border-color:var(--brass,#d9b36c);color:var(--brass,#d9b36c)}
.mundo-fab:disabled{opacity:.38;cursor:default;box-shadow:none}
.mundo-fab:focus-visible{outline:2px solid var(--sea,#8fd1c4)}
@media (max-width:820px){.mundo-fab{width:40px;height:40px}}
`;document.head.append(s)}
const board=document.getElementById('board');
const btn=h('button',{type:'button',class:'mundo-fab','aria-label':'Отменить',title:'Отменить: нечего',disabled:true},'↶');
btn.onclick=()=>undo();
if(board)board.append(btn);
function place(){if(!board)return;const w=board.clientWidth||innerWidth;
  if((window.innerWidth||800)<600){// телефон: правая колонка — 🔊 (верх+10), 📜 (верх+58), ↶ под ними
    btn.style.top='106px';btn.style.right='10px';btn.style.bottom='';}
  else{// слева от ряда кнопок масштаба внизу справа
    const z=board.querySelector('.zoom'),zw=z?z.getBoundingClientRect().width:170;
    btn.style.top='';btn.style.bottom='10px';btn.style.right=Math.round(10+zw+8)+'px'}
  btn.hidden=w<120}
function renderBtn(){const g=stack[stack.length-1];btn.disabled=!g;btn.title=g?'Отменить: '+label(g)+' (Ctrl+Z)':'Отменить: нечего';btn.setAttribute('aria-label',btn.title)}
addEventListener('resize',place);setTimeout(place,0);setTimeout(place,800);place();renderBtn();

/* ---------- Ctrl+Z ---------- */
addEventListener('keydown',e=>{if(!(e.ctrlKey||e.metaKey)||e.shiftKey||e.altKey)return;if(e.code!=='KeyZ'&&!/^[zя]$/i.test(e.key))return;
  const a=document.activeElement;if(a&&(/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName)||a.isContentEditable))return;
  e.preventDefault();undo()});
})();
