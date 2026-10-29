/* mod-journal.js — «📖 Журнал приключений» для игроков.
   Открытые записи: journal/<id> {ts,session,kind,title,text,img?,map?,by,src?,done?} — их видят все.
   Черновики Мастера: gm/jdraft_<id> (игроки коллекцию gm не получают). «Показать» = перенос в journal/, «скрыть» = обратно.
   Готовые черновики из сценариев — journal-data.js (window.JOURNAL_DATA), грузится только у Мастера. */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
if(V.isOwner&&!window.JOURNAL_DATA&&!document.querySelector('script[src="journal-data.js"]')){const s=document.createElement('script');s.src='journal-data.js';s.onload=()=>V.changed('panel');s.onerror=()=>{};document.head.append(s)}

const KINDS=[['event','Что произошло','📜'],['npc','Кого встретили','🧑'],['place','Места','🗺'],['clue','Улики и тайны','🔍'],['quest','Задания','⚑']];
const KIND_NAME={event:'событие',npc:'персонаж',place:'место',clue:'улика',quest:'задание'};
const MAP_IDS=['01-region','02-solthaven','03-grot-bochek','04-mayak','05-paluba-tsapli','06-monastyr-otliva','07-sklep-kolokola','08-is-merin','09-kolokolnaya-bashnya','10-baklan','11-dom-marty','12-chasovnya','13-kryuk-i-uzel','14-dom-staresty','15-domik-smotritelya'];
const IMGS=['tamsi','captain','lira','veira','fanatic','thug','bandit','cultist','priestess','sahuagin','merrow','guardian','ghoul','zombie','siren','elemental','shark','crab'];
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
const wide=()=>window.matchMedia('(min-width:821px)').matches;

const css=document.createElement('style');
css.textContent=`
.jr-root{min-width:0;overflow-wrap:anywhere}
.jr-hd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin:4px 0 8px}
.jr-hd h3{margin:0;flex:1;min-width:0;color:#d9b36c}
.jr-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.jr-root .btn{min-height:40px}
.jr-root input[type=text],.jr-root select,.jr-root textarea{width:100%;min-height:40px}
.jr-root textarea{min-height:110px;resize:vertical}
details.jr-sec{border:1px solid var(--line);border-radius:10px;background:var(--panel2);margin:8px 0}
details.jr-sec>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;font-family:var(--f-display);font-size:17px;color:#d9b36c}
details.jr-sec>summary::-webkit-details-marker{display:none}
details.jr-sec>summary::after{content:'▸';margin-left:auto;color:var(--muted);transition:transform .15s}
details.jr-sec[open]>summary::after{transform:rotate(90deg)}
details.jr-sec>summary .jr-n{font-family:var(--f-mono);font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:1px 7px}
details.jr-sec>summary .jr-new{margin-left:0}
.jr-body{padding:0 10px 10px;display:grid;gap:8px}
.jr-ses{font-family:var(--f-mono);font-size:11px;letter-spacing:.08em;color:var(--muted);text-transform:uppercase;border-bottom:1px solid var(--line);padding:6px 0 3px}
.jr-card{border:1px solid var(--line);border-left:3px solid rgba(217,179,108,.55);border-radius:9px;padding:8px 10px;background:#0f1617;display:grid;gap:4px;min-width:0}
.jr-card.draft{border-left-color:var(--muted);border-style:dashed;opacity:.92}
.jr-card.done{opacity:.7}.jr-card.done .jr-t{text-decoration:line-through}
.jr-top{display:flex;gap:10px;align-items:flex-start;min-width:0}
.jr-av{width:46px;height:46px;flex:0 0 46px;border-radius:50%;border:1px solid rgba(217,179,108,.5);background:#1b2628;display:flex;align-items:center;justify-content:center;font-family:var(--f-display);color:#d9b36c;font-size:20px;overflow:hidden}
.jr-av img{width:80%;height:80%;object-fit:contain}
.jr-t{font-weight:600;font-size:16px;line-height:1.25}
.jr-m{font-size:12px;color:var(--muted)}
.jr-x{font-size:14px;white-space:pre-wrap;line-height:1.45}
.jr-new{display:inline-block;font-size:11px;font-weight:600;color:#1a1408;background:#d9b36c;border-radius:999px;padding:1px 7px;margin-left:6px;vertical-align:2px}
.jr-tag{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:999px;padding:1px 7px;margin-left:6px;color:var(--muted)}
.jr-act{display:flex;flex-wrap:wrap;gap:6px;margin-top:2px}
.jr-act .btn{min-width:40px}
.jr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(230px,1fr));gap:8px}
.jr-form{display:grid;gap:8px}
.jr-form .jr-2{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.jr-fill label.jr-ck{display:flex;gap:10px;align-items:flex-start;min-height:40px;padding:6px 4px;border-bottom:1px solid var(--line);cursor:pointer}
.jr-fill label.jr-ck input{width:22px;height:22px;flex:0 0 22px;margin-top:1px}
.jr-fill label.jr-ck.has{opacity:.55}
.jr-fill .jr-sum{font-size:13px;color:var(--muted)}
.jr-empty{font-size:13px;color:var(--muted);padding:4px 2px}
.jr-pop{position:absolute;left:50%;bottom:74px;transform:translate(-50%,8px);z-index:46;max-width:min(420px,calc(100% - 24px));background:#231d10;border:1px solid rgba(217,179,108,.8);color:#ffe6a0;border-radius:12px;padding:9px 16px;box-shadow:0 10px 30px rgba(0,0,0,.6);opacity:0;transition:opacity .25s,transform .25s;pointer-events:none;font-size:15px;text-align:center}
.jr-pop.on{opacity:1;transform:translate(-50%,0)}
@media (max-width:600px){.jr-grid{grid-template-columns:minmax(0,1fr)}.jr-form .jr-2{grid-template-columns:minmax(0,1fr)}.jr-pop{bottom:64px;font-size:14px}}
`;document.head.append(css);

/* ---------- данные ---------- */
let entries={},drafts={},first=true,known=new Set();
const SEEN_KEY='vtt-journal-seen';
let seen=Number(ls.get(SEEN_KEY,0))||0,baseline=seen;
let q='',edit=null,fill=null,fillSel=new Set();
const all=()=>Object.values(entries);
const unread=()=>V.isGM()?0:all().filter(e=>(e.ts||0)>seen).length;
const myTab=()=>{const b=document.querySelector('#tabs button[aria-selected="true"]');return!!b&&b.textContent.startsWith('📖')};

function pop(text){const board=document.getElementById('board');if(!board)return;let el=board.querySelector('.jr-pop');if(!el){el=h('div',{class:'jr-pop',role:'status','aria-live':'polite'});board.append(el)}
  el.textContent=text;el.classList.remove('on');void el.offsetWidth;el.classList.add('on');clearTimeout(pop.t);pop.t=setTimeout(()=>el.classList.remove('on'),4000)}

V.watch('journal',arr=>{entries=Object.fromEntries(arr.map(d=>[d.id,d]));
  const fresh=arr.filter(d=>!known.has(d.id));arr.forEach(d=>known.add(d.id));
  if(!first){const show=fresh.filter(d=>d.by!==V.myId).sort((a,b)=>(a.ts||0)-(b.ts||0));
    if(show.length)pop('📖 В журнале: '+show[show.length-1].title+(show.length>1?` (+${show.length-1})`:''))}
  first=false;if(myTab())markSeen();V.renderTabs();V.changed('panel')});
if(V.isOwner)V.watch('gm',arr=>{drafts=Object.fromEntries(arr.filter(d=>d.id.startsWith('jdraft_')).map(d=>[d.id,d]));V.changed('panel')});

function markSeen(){const mx=Math.max(seen,...all().map(e=>e.ts||0));if(mx>seen){seen=mx;ls.set(SEEN_KEY,String(seen))}}

/* ---------- запись Мастером ---------- */
const clean=d=>{const o={ts:d.ts||Date.now(),session:d.session?Number(d.session):null,kind:KIND_NAME[d.kind]?d.kind:'event',title:String(d.title||'Без названия').slice(0,140),text:String(d.text||'').slice(0,4000),by:V.myId||null};
  if(d.img)o.img=d.img;if(d.map)o.map=d.map;if(d.src)o.src=d.src;if(d.alt)o.alt=true;if(d.kind==='quest')o.done=!!d.done;return o};
async function publish(d,fromDraft){const id=V.store.newId('journal');await V.store.set('journal/'+id,clean(d));if(fromDraft)await V.store.del('gm/'+fromDraft)}
async function hide(e){const id='jdraft_'+e.id;const{id:_,...rest}=e;await V.store.set('gm/'+id,{...rest});await V.store.del('journal/'+e.id)}
async function show(d){const{id,...rest}=d;await V.store.set('journal/'+V.store.newId('journal'),{...clean(rest),ts:Date.now()});await V.store.del('gm/'+id)}
async function remove(e,isDraft){if(!confirm(`Удалить запись «${e.title}»?`))return;await V.store.del((isDraft?'gm/':'journal/')+e.id)}
async function toggleDone(e){await V.store.update('journal/'+e.id,{done:!e.done})}

/* ---------- карточки ---------- */
const handouts=()=>(V.st().handouts||[]);
const openMaps=()=>{const b=document.getElementById('btnMaps');if(b&&!b.hidden)b.click();else V.toast('У отряда пока нет открытых карт')};
function avatar(e){if(e.img)return h('div',{class:'jr-av'},h('img',{src:e.img,alt:''}));return h('div',{class:'jr-av','aria-hidden':'true'},(e.title||'?').replace(/^[«"]/,'').charAt(0).toUpperCase())}
function card(e,isDraft){const isNew=!V.isGM()&&!isDraft&&(e.ts||0)>baseline;
  const meta=[e.session?'Сессия '+e.session:null,isDraft?'черновик · игроки не видят':null].filter(Boolean).join(' · ');
  const title=h('div',{class:'jr-t'},e.title,isNew?h('span',{class:'jr-new'},'новое'):null,e.alt&&V.isGM()?h('span',{class:'jr-tag'},'вариант исхода'):null,e.kind==='quest'&&e.done?h('span',{class:'jr-tag'},'выполнено'):null);
  const top=e.kind==='npc'?h('div',{class:'jr-top'},avatar(e),h('div',{style:'min-width:0;flex:1'},title,meta?h('div',{class:'jr-m'},meta):null)):h('div',{},title,meta?h('div',{class:'jr-m'},meta):null);
  const act=[];
  if(e.map&&handouts().includes(e.map))act.push(h('button',{class:'btn sm',type:'button',onclick:openMaps},'🗺 '+V.mapInfo(e.map).name));
  if(V.isGM()&&!V.readOnly){
    if(e.kind==='quest'&&!isDraft)act.push(h('button',{class:'btn sm',type:'button',onclick:()=>toggleDone(e)},e.done?'↺ Снова активно':'✓ Выполнено'));
    act.push(h('button',{class:'btn sm',type:'button',title:'Изменить',onclick:()=>{edit={...e,where:isDraft?'draft':'journal'};fill=null;V.changed('panel')}},'✎ Изменить'));
    act.push(isDraft?h('button',{class:'btn sm pri',type:'button',onclick:()=>show(e)},'👁 Показать игрокам'):h('button',{class:'btn sm',type:'button',onclick:()=>hide(e)},'🙈 Скрыть'));
    act.push(h('button',{class:'btn sm bad',type:'button',title:'Удалить','aria-label':'Удалить запись',onclick:()=>remove(e,isDraft)},'✕'))}
  const c=h('div',{class:'jr-card'+(isDraft?' draft':'')+(e.done?' done':'')},top,e.text?h('div',{class:'jr-x'},e.text):null,act.length?h('div',{class:'jr-act'},...act):null);
  c.dataset.s=(e.title+' '+(e.text||'')).toLowerCase();return c}

function section(key,title,kids,count,newCount){const open=ls.get('vtt-jr-'+key,null);
  const d=h('details',{class:'jr-sec','data-k':key},h('summary',{},title,h('span',{class:'jr-n'},count),newCount?h('span',{class:'jr-new'},'+'+newCount):null),h('div',{class:'jr-body'},...(kids.length?kids:[h('div',{class:'jr-empty'},'Пока пусто.')])));
  d.open=open==null?(wide()||key==='event'):open==='1';
  d.querySelector('summary').addEventListener('click',()=>setTimeout(()=>ls.set('vtt-jr-'+key,d.open?'1':'0'),0));return d}

const bySes=(a,b)=>(b.session||0)-(a.session||0)||(b.ts||0)-(a.ts||0);
function kindBlock(k,list,isDraft){
  if(k==='event'){const out=[];let cur;for(const e of list.slice().sort(bySes)){const s=e.session||0;if(s!==cur){cur=s;out.push(h('div',{class:'jr-ses'},s?'Сессия '+s:'Без сессии'))}out.push(card(e,isDraft))}return out}
  if(k==='quest'){const act=list.filter(e=>!e.done).sort(bySes),dn=list.filter(e=>e.done).sort(bySes);const out=[];
    if(act.length)out.push(h('div',{class:'jr-ses'},'Активные'),...act.map(e=>card(e,isDraft)));
    if(dn.length)out.push(h('div',{class:'jr-ses'},'Выполненные'),...dn.map(e=>card(e,isDraft)));return out}
  return[h('div',{class:'jr-grid'},...list.slice().sort(bySes).map(e=>card(e,isDraft)))]}

/* ---------- формы Мастера ---------- */
function editor(){const e=edit;const set=k=>ev=>{e[k]=ev.target.value};
  const sel=(k,opts,label)=>h('label',{class:'f'},label,h('select',{onchange:set(k)},...opts.map(([v,n])=>h('option',{value:v,selected:String(e[k]??'')===String(v)},n))));
  const save=async pub=>{if(!String(e.title||'').trim())return V.toast('Нужен заголовок');
    if(e.where==='journal'&&e.id){await V.store.set('journal/'+e.id,{...clean(e),ts:e.ts||Date.now()})}
    else if(pub){await publish({...e,ts:Date.now()},e.where==='draft'&&e.id?e.id:null)}
    else{await V.store.set('gm/'+(e.id||('jdraft_'+V.store.newId('gm'))),clean(e))}
    V.toast(e.where==='journal'&&e.id?'Запись обновлена':pub?'Запись открыта игрокам':'Черновик сохранён — игроки его не видят');edit=null;V.changed('panel')};
  return h('div',{class:'card jr-form'},h('b',{},e.id?'Изменить запись':'Новая запись'),
    h('div',{class:'jr-2'},sel('session',[['','Без сессии'],['1','Сессия 1'],['2','Сессия 2'],['3','Сессия 3']],'Сессия'),sel('kind',KINDS.map(([k,n])=>[k,n]),'Раздел')),
    h('label',{class:'f'},'Заголовок',h('input',{type:'text',value:e.title||'',maxlength:140,oninput:set('title')})),
    h('label',{class:'f'},'Текст (как видят герои)',h('textarea',{oninput:set('text')},e.text||'')),
    h('div',{class:'jr-2'},sel('img',[['','Без портрета'],...IMGS.map(k=>['tokens/'+k+'.svg',k])],'Портрет (для персонажа)'),sel('map',[['','Без карты'],...MAP_IDS.map(id=>[id,V.mapInfo(id).name])],'Карта (кнопка, если она открыта)')),
    h('div',{class:'jr-row'},
      e.where==='journal'&&e.id?h('button',{class:'btn pri',type:'button',onclick:()=>save(true)},'Сохранить'):[
        h('button',{class:'btn pri',type:'button',onclick:()=>save(true)},'Показать игрокам'),
        h('button',{class:'btn',type:'button',onclick:()=>save(false)},'В черновики')],
      h('button',{class:'btn',type:'button',onclick:()=>{edit=null;V.changed('panel')}},'Отмена')))}

function filler(){const D=window.JOURNAL_DATA;if(!D)return h('div',{class:'card'},'Загружаю черновики сценариев…');
  const s=fill.s,list=D[s]||[];const have=new Set([...all(),...Object.values(drafts)].map(e=>e.src).filter(Boolean));
  const cnt=h('span',{}),upd=()=>{cnt.textContent=String(fillSel.size);pubB.disabled=dfB.disabled=!fillSel.size};
  const pick=async pub=>{const items=list.filter(x=>fillSel.has(x.key));const t0=Date.now();
    for(const [i,x] of items.entries()){const d={...x,session:s,src:x.key,ts:t0+i};delete d.key;if(pub)await V.store.set('journal/'+V.store.newId('journal'),clean(d));else await V.store.set('gm/jdraft_'+V.store.newId('gm'),clean(d))}
    V.toast((pub?'Открыто игрокам: ':'В черновики: ')+items.length);fillSel.clear();V.changed('panel')};
  const pubB=h('button',{class:'btn pri',type:'button',onclick:()=>pick(true)},'👁 Открыть отмеченные игрокам (',cnt,')');
  const dfB=h('button',{class:'btn',type:'button',onclick:()=>pick(false)},'В черновики');
  const groups=KINDS.map(([k,n,ic])=>{const its=list.filter(x=>x.kind===k);if(!its.length)return null;
    return[h('div',{class:'jr-ses'},ic+' '+n),...its.map(x=>{const has=have.has(x.key);const cb=h('input',{type:'checkbox',disabled:has,checked:fillSel.has(x.key)});
      cb.onchange=()=>{cb.checked?fillSel.add(x.key):fillSel.delete(x.key);upd()};
      return h('label',{class:'jr-ck'+(has?' has':'')},cb,h('span',{style:'min-width:0'},h('b',{},x.title),has?h('span',{class:'jr-tag'},'уже в журнале'):null,x.alt?h('span',{class:'jr-tag'},'вариант исхода'):null,h('div',{class:'jr-sum'},x.text)))})]}).flat().filter(Boolean);
  upd();
  return h('div',{class:'card jr-fill'},h('b',{},'Заполнить из сессии'),
    h('p',{class:'small muted',style:'margin:4px 0'},'Отметьте, что уже случилось за столом. По умолчанию ничего не отмечено — чтобы не выдать лишнего.'),
    h('div',{class:'jr-row'},...[1,2,3].map(n=>h('button',{class:'btn'+(n===s?' pri':''),type:'button','aria-pressed':String(n===s),onclick:()=>{fill={s:n};fillSel.clear();V.changed('panel')}},'Сессия '+n))),
    h('div',{class:'jr-row'},h('button',{class:'btn sm',type:'button',onclick:()=>{list.forEach(x=>{if(!have.has(x.key))fillSel.add(x.key)});V.changed('panel')}},'Отметить все'),h('button',{class:'btn sm',type:'button',onclick:()=>{fillSel.clear();V.changed('panel')}},'Снять все')),
    ...groups,h('div',{class:'jr-row',style:'position:sticky;bottom:0;background:var(--panel2);padding:6px 0'},pubB,dfB,h('button',{class:'btn',type:'button',onclick:()=>{fill=null;fillSel.clear();V.changed('panel')}},'Закрыть')))}

/* ---------- вкладка ---------- */
function render(){
  if(!document.querySelector('.jr-root'))baseline=seen; // зашли во вкладку — «новое» считаем от прошлого просмотра
  if(!V.isGM()){const before=seen;markSeen();if(seen!==before)setTimeout(()=>V.renderTabs(),0)}
  const gm=V.isGM(),list=all(),dl=Object.values(drafts);
  const search=h('input',{type:'text',placeholder:'Поиск по журналу…','aria-label':'Поиск по журналу',value:q});
  const root=h('div',{class:'jr-root'});
  const hd=h('div',{class:'jr-hd'},h('h3',{},'📖 Журнал приключений'),
    handouts().length?h('button',{class:'btn sm',type:'button',onclick:openMaps},'🗺 Карты отряда ('+handouts().length+')'):null);
  root.append(hd,search);
  if(gm&&!V.readOnly)root.append(h('div',{class:'jr-row'},
    h('button',{class:'btn pri',type:'button',onclick:()=>{edit={where:'new',session:'',kind:'event',title:'',text:''};fill=null;V.changed('panel')}},'+ Запись'),
    h('button',{class:'btn',type:'button',onclick:()=>{fill=fill?null:{s:1};edit=null;fillSel.clear();V.changed('panel')}},fill?'Скрыть заполнение':'📥 Заполнить из сессии')));
  if(gm&&edit)root.append(editor());
  if(gm&&fill)root.append(filler());
  if(gm&&dl.length)root.append(section('drafts','🙈 Черновики (игроки не видят)',KINDS.flatMap(([k,n])=>{const its=dl.filter(e=>e.kind===k);return its.length?[h('div',{class:'jr-ses'},n),...kindBlock(k,its,true)]:[]}),dl.length));
  if(!list.length&&!gm)root.append(h('p',{class:'small muted'},'Журнал пока пуст. Мастер добавит сюда события, людей и места, которые встретятся отряду.'));
  for(const [k,n,ic] of KINDS){const its=list.filter(e=>e.kind===k);const nw=gm?0:its.filter(e=>(e.ts||0)>baseline).length;root.append(section(k,ic+' '+n,kindBlock(k,its,false),its.length,nw))}
  const flt=()=>{const s=q.trim().toLowerCase();
    for(const c of root.querySelectorAll('.jr-card'))c.hidden=!!s&&!c.dataset.s.includes(s);
    for(const d of root.querySelectorAll('details.jr-sec')){const any=[...d.querySelectorAll('.jr-card')].some(c=>!c.hidden);
      for(const hs of d.querySelectorAll('.jr-ses'))hs.hidden=!!s;
      d.hidden=!!s&&!any;if(s&&any)d.open=true}};
  search.oninput=ev=>{q=ev.target.value;flt()};if(q)flt();
  return root}

V.addTab({id:'journal',get label(){const n=unread();return'📖 Журнал'+(n?' •'+n:'')},render});
window.__journal={get entries(){return entries},get drafts(){return drafts}};
})();
