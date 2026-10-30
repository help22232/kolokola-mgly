/* mod-gametime.js — «Игровое время»: часы кампании (game/clock), чип в шапке, управление временем у Мастера,
   эффекты с длительностью (effects/<id>), которые сами истекают; автосоздание эффектов из журнала (m.dur).
   Пишет в хранилище только клиент Мастера (VTT.isOwner). Игроки видят чип и раздел «На вас действует». */
(function boot(){if(!window.VTT||!window.VTT.store)return setTimeout(boot,50);if(window.VTT_GAMETIME)return;window.VTT_GAMETIME=true;
const V=window.VTT,h=V.h,store=V.store;
const LOADED=Date.now();
const DAY=1440,ROUND=0.1; // минуты; раунд = 6 секунд
const CONDS=['Отравлен','Испуган','Очарован','Ослеплён','Оглохший','Опутан','Невидим','Очерчен','Парализован','Ошеломлён','Без сознания','Сбит с ног'];
const DURS=[['1 раунд',ROUND],['1 минута',1],['10 минут',10],['1 час',60],['8 часов',480],['24 часа',DAY]];
const TOD_NAME={dawn:'Рассвет',day:'День',dusk:'Сумерки',night:'Ночь',deep:'Глухая ночь'};
const TOD_HOUR={dawn:6,day:12,dusk:20,night:22,deep:3};
const AUTO_KEY='vtt-gametime-auto';
const LS={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:JSON.parse(v)}catch(e){return d}},set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}};

const can=()=>V.isOwner&&!V.readOnly;
const r1=x=>Math.round(x*10)/10;
const pad=n=>String(n).padStart(2,'0');
function parts(min){min=Math.max(0,Math.floor((Number(min)||0)+1e-6));return{day:Math.floor(min/DAY)+1,hh:Math.floor(min%DAY/60),mm:min%60}}
const fmtLong=min=>{const p=parts(min);return`День ${p.day} · ${pad(p.hh)}:${pad(p.mm)}`};
const fmtShort=min=>{const p=parts(min);return`Д${p.day} ${pad(p.hh)}:${pad(p.mm)}`};
function todOf(min){const hr=parts(min).hh;return hr>=5&&hr<7?'dawn':hr>=7&&hr<19?'day':hr>=19&&hr<21?'dusk':hr>=21||hr<2?'night':'deep'}
function fmtLeft(m){if(m<=1e-6)return'истекает';if(m<1)return Math.max(1,Math.round(m/ROUND))+' р.';
  m=Math.ceil(m-1e-6);if(m<60)return m+' мин';const d=Math.floor(m/DAY),hr=Math.floor(m%DAY/60),mm=m%60;
  return[d?d+' д':'',hr?hr+' ч':'',mm&&!d?mm+' мин':''].filter(Boolean).join(' ')}
function fmtDur(m){m=Number(m)||0;if(m<1)return Math.max(1,Math.round(m/ROUND))+' р.';return fmtLeft(m)}

/* ---------- стили ---------- */
const css=document.createElement('style');css.textContent=`
#gtChip{cursor:default}#gtChip .gt-s{display:none}
@media (max-width:820px){#gtChip{padding:3px 6px;letter-spacing:0}#gtChip .gt-l{display:none}#gtChip .gt-s{display:inline}}
.gt-now{font-family:var(--f-mono,monospace);font-size:20px;color:var(--brass);margin:2px 0 6px}
.gt-now small{font-size:12px;color:var(--muted);margin-left:6px}
.gt-btns{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:6px;margin:6px 0}
.gt-btns .btn{min-height:40px;white-space:normal;line-height:1.15}
.gt-btns .gt-w{grid-column:span 2}
.gt-set{display:flex;flex-wrap:wrap;gap:6px;align-items:end;margin:6px 0}
.gt-set label.f{flex:1 1 90px;min-width:0}
.gt-set input{width:100%;box-sizing:border-box;min-height:40px}
.gt-set .btn{min-height:40px}
.gt-eff{border:1px solid var(--line);border-radius:10px;background:var(--panel2);padding:8px 10px;margin:6px 0;display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.gt-eff .gt-n{flex:1 1 160px;min-width:0;overflow-wrap:anywhere}
.gt-eff .gt-t{font-family:var(--f-mono,monospace);color:var(--brass);white-space:nowrap}
.gt-eff .btn{min-height:40px;min-width:40px}
.gt-form{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:6px 0}
.gt-form label.f{min-width:0}.gt-form .gt-full{grid-column:1/-1}
.gt-form input,.gt-form select{width:100%;box-sizing:border-box;min-height:40px;min-width:0}
.gt-form .btn{min-height:40px}
@media (max-width:420px){.gt-form{grid-template-columns:1fr}}
`;document.head.append(css);

/* ---------- состояние модуля ---------- */
let clock=null,clockSeen=false,effects=[],lastRound=null,lastOn=false,busy=false;
const draft={name:'',tid:'',dur:'10',cond:'',light:false,note:'',day:'',time:''};
const nowMin=()=>clock?Number(clock.min)||0:0;
const auto=()=>LS.get(AUTO_KEY,true)!==false;
const tokName=id=>{const t=id&&V.S.tokens[id];return t?t.name:''};

/* ---------- чип в шапке ---------- */
function chip(){let c=document.getElementById('gtChip');if(!c){const after=document.getElementById('mapChip');if(!after)return null;
  c=h('span',{class:'chip',id:'gtChip',title:'Игровое время'},h('span',{class:'gt-l'}),h('span',{class:'gt-s'}));after.after(c)}return c}
function renderChip(){const c=chip();if(!c)return;if(!clock){c.hidden=true;return}c.hidden=false;
  c.querySelector('.gt-l').textContent='🕰 '+fmtLong(nowMin());c.querySelector('.gt-s').textContent=fmtShort(nowMin());
  c.title='Игровое время: '+fmtLong(nowMin())+' ('+TOD_NAME[todOf(nowMin())]+')'}
const refresh=()=>{renderChip();try{V.changed('panel')}catch(e){}};

/* ---------- часы ---------- */
async function setClock(min,why){if(!can())return;const prev=nowMin();min=r1(Math.max(0,min));
  clock={...(clock||{}),min,ts:Date.now()};await store.set('game/clock',clock);renderChip();
  if(auto()&&Math.floor(prev/60+1e-9)!==Math.floor(min/60+1e-9)){const t=todOf(min),s=V.st();if(s.time!==t){await store.set('game/state',{...V.st(),time:t});await V.post({kind:'sys',text:'🕰 '+TOD_NAME[t]})}}
  if(why)await V.post({kind:'sys',text:why+' · '+fmtLong(min)});
  await expire()}
const advance=(d,why)=>setClock(nowMin()+d,why);

store.watchDoc('game/clock',d=>{clockSeen=true;clock=d&&Number.isFinite(Number(d.min))?d:null;refresh();
  if(!clock&&can())setTimeout(()=>{if(!clock&&can()){const t=V.st().time;const hr=TOD_HOUR[t]??20;
    clock={min:hr*60,ts:Date.now()};store.set('game/clock',clock);renderChip()}},1500)});

/* бой: каждый новый раунд — +6 секунд */
store.watchDoc('game/state',d=>{const c=(d&&d.combat)||{};const on=!!c.on,round=Number(c.round)||1;
  if(can()&&clock&&on&&lastOn&&lastRound!=null&&round>lastRound)advance(ROUND*Math.min(10,round-lastRound));
  lastOn=on;lastRound=round});

/* ---------- эффекты ---------- */
V.watch('effects',a=>{effects=a.filter(e=>e&&Number.isFinite(Number(e.until))).sort((x,y)=>x.until-y.until);refresh();expire()});

async function endEffect(e,why){if(!can())return;const t=e.tid&&V.S.tokens[e.tid];
  if(t){const p={};const still=effects.some(o=>o.id!==e.id&&o.tid===e.tid&&o.cond===e.cond&&nowMin()<o.until-1e-6);
    if(e.cond&&!still&&(t.cond||[]).includes(e.cond)){p.cond=(t.cond||[]).filter(c=>c!==e.cond);const L=(t.fxl||[]).filter(x=>x.cond!==e.cond);if(L.length!==(t.fxl||[]).length)Object.assign(p,{fxl:L,glow:Math.max(0,...L.map(x=>x.glow||0))})}
    if(e.light&&t.light)p.light=0;if(Object.keys(p).length)await store.update('tokens/'+t.id,p)}
  if(e.shape)await store.del('shapes/'+e.shape);
  await store.del('effects/'+e.id);
  await V.post({kind:'sys',text:`⌛ ${why||'Истёк эффект'}: ${e.name}${t?' — '+t.name:''}`})}
async function expire(){if(!can()||!clock||busy)return;busy=true;try{const now=nowMin();
  for(const e of effects.filter(e=>now>=Number(e.until)-1e-6))await endEffect(e)}catch(err){console.error(err)}finally{busy=false}}

async function addEffect(o,id){if(!can()||!clock)return;const min=Number(o.min);if(!(min>0)||min>366*DAY)return;
  const e={name:String(o.name||'Эффект').slice(0,60),until:r1(nowMin()+min),by:o.by||V.myId||null};
  if(o.tid&&V.S.tokens[o.tid])e.tid=o.tid;if(o.cond&&CONDS.concat(['Схвачен','Недееспособен','Окаменел','Концентрация']).includes(o.cond))e.cond=o.cond;
  if(o.light)e.light=true;if(o.shape)e.shape=String(o.shape);if(o.note)e.note=String(o.note).slice(0,200);
  await store.set('effects/'+(id||store.newId('effects')),e);
  const t=e.tid&&V.S.tokens[e.tid];if(t&&e.cond&&!(t.cond||[]).includes(e.cond))await store.update('tokens/'+t.id,{cond:[...(t.cond||[]),e.cond]});
  return e}

/* журнал: новая запись с dur {min,name,tid?,cond?,shape?} → эффект (только клиент Мастера) */
const seen=new Set();
V.watch('log',a=>{if(!can())return;for(const m of a){const k=m.id||m.ts+m.text;if(seen.has(k))continue;seen.add(k);
  if(!m.dur||!((m.ts||0)>LOADED-1500))continue;const d=m.dur;
  const go=()=>clock?addEffect({name:d.name||m.text,tid:d.tid,cond:d.cond,shape:d.shape,light:d.light,note:d.note,min:d.min,by:m.by},'l_'+String(m.id||k).replace(/[^\w-]/g,'').slice(0,40)).catch(console.error):setTimeout(go,500);go()}},{order:'ts',dir:'desc',limit:30});

/* ---------- раздел Мастера ---------- */
function tokOptions(sel){const map=V.st().map;const toks=V.tokList().filter(t=>t.name).sort((a,b)=>(a.map===map?0:1)-(b.map===map?0:1)||String(a.name).localeCompare(b.name,'ru'));
  return[h('option',{value:''},'— без цели —'),...toks.map(t=>h('option',{value:t.id,selected:t.id===sel},t.name+(t.map!==map?' (другая карта)':'')+(t.hidden?' · скрыт':'')))]}
const bind=(el,k,prop='value')=>{el.addEventListener(el.tagName==='SELECT'||el.type==='checkbox'?'change':'input',()=>{draft[k]=el[prop]});return el};

V.addGmSection(()=>{const out=[h('h3',{},'🕰 Время и эффекты')];
  if(!clock){out.push(h('p',{class:'small muted'},'Часы кампании запускаются…'));return out}
  const now=nowMin();
  out.push(h('div',{class:'gt-now'},fmtLong(now),h('small',{},TOD_NAME[todOf(now)])));
  const B=(lbl,fn,cls)=>h('button',{class:'btn'+(cls?' '+cls:''),type:'button',disabled:!can(),onclick:fn},lbl);
  out.push(h('div',{class:'gt-btns'},
    B('+1 раунд',()=>advance(ROUND)),B('+1 мин',()=>advance(1)),B('+10 мин',()=>advance(10)),
    B('+1 ч',()=>advance(60,'🕰 Прошёл час')),B('+8 ч',()=>advance(480,'🕰 Прошло 8 часов')),
    B('☕ Короткий отдых (1 ч)',()=>advance(60,'☕ Короткий отдых: прошёл 1 час'),'gt-w'),
    B('🛏 Долгий отдых (8 ч)',()=>advance(480,'🛏 Долгий отдых: прошло 8 часов'),'gt-w')));
  out.push(h('p',{class:'small muted'},'Кнопки отдыха только двигают время; восстановление героев — в их листах («Короткий/Долгий отдых»). В бою каждый новый раунд добавляет 6 секунд.'));
  const p=parts(now);
  const dIn=bind(h('input',{type:'number',min:1,step:1,value:draft.day||p.day,'aria-label':'День'}),'day');
  const tIn=bind(h('input',{type:'time',value:draft.time||`${pad(p.hh)}:${pad(p.mm)}`,'aria-label':'Время'}),'time');
  out.push(h('div',{class:'gt-set'},h('label',{class:'f'},'День',dIn),h('label',{class:'f'},'Время',tIn),
    h('button',{class:'btn',type:'button',disabled:!can(),onclick:()=>{const d=Math.max(1,Math.floor(Number(dIn.value)||1));const [hh,mm]=String(tIn.value||'0:0').split(':').map(Number);
      draft.day='';draft.time='';setClock((d-1)*DAY+(hh||0)*60+(mm||0),'🕰 Время установлено')}},'Установить')));
  out.push(h('label',{class:'row small',style:'margin:4px 0 8px'},h('input',{type:'checkbox',checked:auto(),onchange:e=>{LS.set(AUTO_KEY,e.target.checked);if(e.target.checked&&can()){const t=todOf(nowMin());if(V.st().time!==t)store.set('game/state',{...V.st(),time:t})}}}),'Время суток по часам (темнота уличных карт)'));
  // активные эффекты
  out.push(h('h4',{style:'margin:10px 0 4px'},`Активные эффекты (${effects.length})`));
  if(!effects.length)out.push(h('p',{class:'small muted'},'Нет. Эффекты с длительностью сами истекают, когда часы дойдут до срока.'));
  for(const e of effects){const tn=tokName(e.tid);
    out.push(h('div',{class:'gt-eff'},h('div',{class:'gt-n'},h('b',{},e.name),tn?' — '+tn:'',e.cond?h('span',{class:'tag',style:'cursor:default'},e.cond):null,e.light?h('span',{class:'small muted'},' 💡'):null,e.shape?h('span',{class:'small muted'},' ◎ свет'):null,e.note?h('div',{class:'small muted'},e.note):null),
      h('span',{class:'gt-t',title:'Осталось'},fmtLeft(e.until-now)),
      h('button',{class:'btn sm',type:'button',title:'Продлить на 1 минуту',disabled:!can(),onclick:()=>store.update('effects/'+e.id,{until:r1(Number(e.until)+1)})},'+1 мин'),
      h('button',{class:'btn sm bad',type:'button',title:'Снять эффект сейчас','aria-label':'Снять эффект '+e.name,disabled:!can(),onclick:()=>endEffect(e,'Эффект снят')},'✕')))}
  // новый эффект
  const nIn=bind(h('input',{type:'text',placeholder:'Благословение, Яд…',value:draft.name,maxlength:60}),'name');
  const tSel=bind(h('select',{},...tokOptions(draft.tid)),'tid');
  const dSel=bind(h('select',{},...DURS.map(([l,v])=>h('option',{value:String(v),selected:String(v)===draft.dur},l))),'dur');
  const cSel=bind(h('select',{},h('option',{value:''},'— нет —'),...CONDS.map(c=>h('option',{value:c,selected:c===draft.cond},c))),'cond');
  const noteIn=bind(h('input',{type:'text',placeholder:'Необязательно',value:draft.note,maxlength:200}),'note');
  const lCb=bind(h('input',{type:'checkbox',checked:draft.light}),'light','checked');
  out.push(h('details',{class:'gt-add',open:!!(draft.name||draft.tid||draft.cond)},h('summary',{style:'cursor:pointer;min-height:32px;padding:6px 0;color:var(--brass)'},'+ эффект'),
    h('div',{class:'gt-form'},h('label',{class:'f gt-full'},'Название',nIn),h('label',{class:'f'},'Цель',tSel),h('label',{class:'f'},'Длительность',dSel),
      h('label',{class:'f'},'Состояние',cSel),h('label',{class:'f'},'Заметка',noteIn),
      h('label',{class:'row small gt-full'},lCb,'По окончании погасить свет фишки'),
      h('button',{class:'btn pri gt-full',type:'button',disabled:!can(),onclick:async()=>{const name=nIn.value.trim()||cSel.value;if(!name)return V.toast('Введите название эффекта');
        const e=await addEffect({name,tid:tSel.value,min:Number(dSel.value),cond:cSel.value,light:lCb.checked,note:noteIn.value.trim()});
        if(e){Object.assign(draft,{name:'',tid:'',cond:'',light:false,note:''});V.post({kind:'sys',text:`✨ Эффект: ${e.name}${e.tid?' — '+tokName(e.tid):''} (${fmtDur(Number(dSel.value))})`});V.renderPane()}}},'Добавить эффект'))));
  return out});

/* ---------- лист героя: «На вас действует» ---------- */
V.addHeroSection(t=>{if(!t||!clock)return null;const mine=effects.filter(e=>e.tid===t.id);if(!mine.length)return null;const now=nowMin();
  return[h('h3',{},'На вас действует'),...mine.map(e=>h('div',{class:'gt-eff'},h('div',{class:'gt-n'},h('b',{},e.name),e.cond?h('span',{class:'tag',style:'cursor:default'},e.cond):null,e.note?h('div',{class:'small muted'},e.note):null),h('span',{class:'gt-t',title:'Осталось'},fmtLeft(e.until-now))))]});

window.VTT_GAMETIME_API={now:nowMin,advance,setClock,addEffect,fmtLong};
renderChip();
})();
