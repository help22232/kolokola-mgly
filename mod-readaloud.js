/* mod-readaloud.js — вкладка Мастера «📜 Тексты»: что читать вслух и когда, по сессиям и сценам.
   Данные — readaloud-data.js (window.READALOUD), грузится только у Мастера. Отметки «прочитано» — localStorage. */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
if(!V.isOwner)return; // игрокам ни вкладки, ни данных
if(!window.READALOUD&&!document.querySelector('script[src="readaloud-data.js"]')){const s=document.createElement('script');s.src='readaloud-data.js';s.onload=()=>V.changed('panel');s.onerror=()=>{};document.head.append(s)}

const TRIG={'начало сессии':'#8fd1c4','вход в локацию':'#7fb0e0','встреча NPC':'#d9b36c','начало боя':'#e58a80','после боя':'#b0a0d8','находка':'#8fcf8a','катсцена':'#e0a0c8','развязка':'#f0c070','конец сессии':'#8fd1c4'};
const ls={get(k,d){try{const v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}},set(k,v){try{localStorage.setItem(k,v)}catch(e){}}};
let ses=Number(ls.get('vtt-ra-ses',1))||1,q='',openScenes=null,flash=null;
let readSet=new Set();try{readSet=new Set(JSON.parse(ls.get('vtt-ra-read','[]')))}catch(e){}
const saveRead=()=>ls.set('vtt-ra-read',JSON.stringify([...readSet]));

const css=document.createElement('style');
css.textContent=`
.ra-root{min-width:0;overflow-wrap:anywhere}
.ra-root .btn{min-height:40px}
.ra-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0;align-items:center}
.ra-ses{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
.ra-root input[type=text]{width:100%;min-height:40px}
.ra-prog{font-size:12px;color:var(--muted);font-family:var(--f-mono)}
details.ra-sc{border:1px solid var(--line);border-radius:10px;background:var(--panel2);margin:8px 0}
details.ra-sc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:44px;padding:0 12px;font-family:var(--f-display);font-size:17px;color:#d9b36c}
details.ra-sc>summary::-webkit-details-marker{display:none}
details.ra-sc>summary::after{content:'▸';margin-left:auto;color:var(--muted);transition:transform .15s}
details.ra-sc[open]>summary::after{transform:rotate(90deg)}
details.ra-sc>summary .ra-n{font-family:var(--f-mono);font-size:11px;color:var(--muted);border:1px solid var(--line);border-radius:999px;padding:1px 7px}
.ra-body{padding:0 10px 10px;display:grid;gap:10px}
.ra-card{border:1px solid var(--line);border-left:3px solid var(--tc,#d9b36c);border-radius:10px;padding:10px 12px;background:#0f1617;display:grid;gap:8px;min-width:0;transition:opacity .2s,box-shadow .3s}
.ra-card.read{opacity:.5}
.ra-card.flash{box-shadow:0 0 0 2px #d9b36c}
.ra-t{font-family:var(--f-display);font-size:19px;line-height:1.2;color:#ffe6a0}
.ra-when{font-size:13px;line-height:1.35;background:rgba(217,179,108,.1);border:1px solid rgba(217,179,108,.3);border-radius:8px;padding:5px 8px}
.ra-tag{display:inline-block;font-size:11px;font-weight:600;border-radius:999px;padding:2px 8px;color:#10181a;background:var(--tc,#d9b36c);margin-right:6px;vertical-align:1px}
.ra-x{font-family:Alegreya,Georgia,serif;font-size:18px;line-height:1.55;white-space:pre-wrap}
.ra-var{border-top:1px dashed var(--line);padding-top:8px;display:grid;gap:6px}
.ra-var b{font-size:13px;color:#d9b36c}
.ra-note{font-size:13px;line-height:1.45;color:var(--muted);background:rgba(255,255,255,.03);border:1px solid var(--line);border-radius:8px;padding:6px 8px}
.ra-note::before{content:'Мастеру: ';font-weight:600}
.ra-act{display:flex;flex-wrap:wrap;gap:6px}
.ra-act .btn{flex:1 1 auto}
.ra-empty{font-size:13px;color:var(--muted)}
@media (max-width:600px){.ra-x{font-size:17px}.ra-t{font-size:18px}.ra-act .btn{flex:1 1 calc(50% - 6px)}}
`;document.head.append(css);

const data=()=>(window.READALOUD||[]);
const list=()=>data().filter(e=>e.session===ses);
const firstUnread=()=>list().find(e=>!readSet.has(e.id));

async function say(text){const parts=[];let cur='';for(const p of String(text).split(/\n\n+/)){if(cur&&(cur+'\n\n'+p).length>1500){parts.push(cur);cur=p}else cur=cur?cur+'\n\n'+p:p}if(cur)parts.push(cur);
  for(const p of parts)await V.post({kind:'chat',desc:true,text:p.slice(0,1500)});V.toast('Текст показан игрокам в журнале')}
function toggleRead(e){readSet.has(e.id)?readSet.delete(e.id):readSet.add(e.id);saveRead();V.changed('panel')}
function goNext(){const e=firstUnread();if(!e)return V.toast('В этой сессии всё прочитано');openScenes.add(e.scene);flash=e.id;q='';V.renderPane();
  setTimeout(()=>{const c=document.querySelector(`.ra-card[data-id="${e.id}"]`);if(c)c.scrollIntoView({block:'start',behavior:'smooth'});setTimeout(()=>{flash=null;c&&c.classList.remove('flash')},1800)},30)}

function card(e){const tc=TRIG[e.trigger]||'#d9b36c',isRead=readSet.has(e.id);
  const act=[h('button',{class:'btn sm'+(isRead?'':' pri'),type:'button','aria-pressed':String(isRead),onclick:()=>toggleRead(e)},isRead?'↺ Не прочитано':'✓ Прочитано')];
  if(e.map)act.push(h('button',{class:'btn sm',type:'button',title:'Переключить карту стола',onclick:async()=>{await V.setMap(e.map);V.toast('Карта: '+V.mapInfo(e.map).name)}},'🗺 '+V.mapInfo(e.map).name));
  if(e.cutscene)act.push(h('button',{class:'btn sm',type:'button',onclick:()=>V.showCutAll(e.cutscene)},'🎬 Катсцена'));
  act.push(h('button',{class:'btn sm',type:'button',title:'Отправить текст в журнал как описание сцены',onclick:()=>say(e.text)},'💬 Показать игрокам'));
  const vars=(e.variants||[]).map(v=>h('div',{class:'ra-var'},h('b',{},'▸ '+v.if),h('div',{class:'ra-x'},v.text),
    h('div',{class:'ra-act'},h('button',{class:'btn sm',type:'button',onclick:()=>say(v.text)},'💬 Показать этот вариант'))));
  const c=h('div',{class:'ra-card'+(isRead?' read':'')+(flash===e.id?' flash':''),'data-id':e.id,style:'--tc:'+tc},
    h('div',{class:'ra-t'},e.title),
    h('div',{class:'ra-when'},h('span',{class:'ra-tag'},e.trigger),'🕐 Когда: ',e.when),
    h('div',{class:'ra-x'},e.text),...vars,
    e.notes?h('div',{class:'ra-note'},e.notes):null,
    h('div',{class:'ra-act'},...act));
  c.dataset.s=[e.title,e.when,e.text,e.notes||'',...(e.variants||[]).map(v=>v.if+' '+v.text)].join(' ').toLowerCase();return c}

function render(){const root=h('div',{class:'ra-root'});
  if(!window.READALOUD){root.append(h('h3',{},'📜 Тексты для чтения'),h('p',{class:'small muted'},'Загружаю тексты…'));return root}
  const L=list(),done=L.filter(e=>readSet.has(e.id)).length;
  const scenes=[...new Set(L.map(e=>e.scene))];
  if(!openScenes){const n=firstUnread();openScenes=new Set(n?[n.scene]:[])}
  const search=h('input',{type:'text',placeholder:'Поиск по текстам сессии…','aria-label':'Поиск по текстам',value:q});
  root.append(h('h3',{},'📜 Тексты для чтения'),
    h('div',{class:'ra-ses',role:'group','aria-label':'Сессия'},...[1,2,3].map(n=>h('button',{class:'btn'+(n===ses?' pri':''),type:'button','aria-pressed':String(n===ses),onclick:()=>{ses=n;ls.set('vtt-ra-ses',n);openScenes=null;q='';V.changed('panel')}},'Сессия '+n))),
    h('div',{class:'ra-row'},h('button',{class:'btn pri',type:'button',onclick:goNext,style:'flex:1'},'➜ Следующий непрочитанный'),
      h('button',{class:'btn',type:'button',onclick:()=>{if(!confirm(`Сбросить отметки «прочитано» в сессии ${ses}?`))return;L.forEach(e=>readSet.delete(e.id));saveRead();openScenes=null;V.changed('panel')}},'Сбросить отметки')),
    h('div',{class:'ra-prog'},`Прочитано ${done} из ${L.length}`),search);
  for(const s of scenes){const its=L.filter(e=>e.scene===s);const rd=its.filter(e=>readSet.has(e.id)).length;
    const d=h('details',{class:'ra-sc'},h('summary',{},s,h('span',{class:'ra-n'},rd+'/'+its.length)),h('div',{class:'ra-body'},...its.map(card)));
    d.open=openScenes.has(s);d.querySelector('summary').addEventListener('click',()=>setTimeout(()=>{d.open?openScenes.add(s):openScenes.delete(s)},0));root.append(d)}
  const flt=()=>{const t=q.trim().toLowerCase();for(const d of root.querySelectorAll('details.ra-sc')){let any=false;
    for(const c of d.querySelectorAll('.ra-card')){c.hidden=!!t&&!c.dataset.s.includes(t);any=any||!c.hidden}
    d.hidden=!!t&&!any;if(t&&any)d.open=true;else if(!t)d.open=openScenes.has(d.querySelector('summary').firstChild.textContent)}};
  search.oninput=ev=>{q=ev.target.value;flt()};if(q)flt();
  return root}

V.addTab({id:'readaloud',label:'📜 Тексты',gm:true,render});
})();
