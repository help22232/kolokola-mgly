/* Модуль стола: записки и раздаточные материалы (handouts).
   Мастер показывает записку всем → handouts/<id>; черновики Мастера → gm/ho_<id>.
   Игроки получают окно с текстом на весь экран и кнопку «📜 Записки (N)». */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;

/* ---------- ноты «Песни Ольвен»: семь знаков волной, без цифр ---------- */
const SONG_ORDER=[1,3,5,7,6,4,2]; // высота каждого знака слева направо
const STAFF=(()=>{const rows=[];for(let hgt=7;hgt>=1;hgt--){let line='';for(const v of SONG_ORDER)line+=v===hgt?'──●──':'─────';rows.push(line)}return rows.join('\n')})();

/* ---------- готовые записки кампании ---------- */
const PRESETS=[
 {id:'maeve',style:'note',title:'Записка из сундука Дожа',when:'Сессия 1 · Грот Бочек, сундук «Сиплого» Дожа',
  text:'Маяк. Новая луна.\nКолокол на место огня.\nОтец не должен знать.\n\n— М.'},
 {id:'reward',style:'note',title:'Объявление на доске',when:'До игры или в самом начале — зацепка для героев',
  text:'СОЛТХЕЙВЕНУ НУЖНЫ СМЕЛЫЕ\n\nВ городе пропадают люди. Тот, кто положит этому конец, получит 50 золотых — и ещё 50, если пропавшие вернутся домой.\n\nОбращаться к старосте Кобу, дом с оградой у площади.\nПросьба не беспокоить жителей расспросами.'},
 {id:'adelina',style:'book',title:'Список сестры Аделины',when:'Сессия 1 · Часовня Морской Матери',
  text:'Пропавшие. Помолимся за них.\n\n1. Хельга Сеттен, засольщица — дом у мостков\n2. Бьорн Агге, рыбак\n3. Малыш Пер, сын Бьорна\n4. Тобиас Грей, рыбак — ВЕРНУЛСЯ, хвала Матери\n5. Старая Ульва, вдова\n6. Ян Корхольм, бондарь\n7. Сив и Ода Лундгрен, сёстры\n8. Эйнар Тресс, лодочник\n9. Брат Кольм из часовни\n10. Мира-прачка\n11. Неизвестный моряк с «Чайки»\n\nВсе жили у воды. Все ушли в ночь, когда звонил колокол.'},
 {id:'kob',style:'letter',title:'Письмо старосты в столицу (не отправлено)',when:'Тайник в доме старосты Коба (карта 14)',
  text:'Его милости наместнику побережья.\n\nСпешу уверить вашу милость, что в Солтхейвене всё спокойно. Туман этой осенью гуще обычного, и несколько рыбаков не вернулись с промысла — такова наша доля у моря. Прошу не присылать сборщиков и стражу: люди и без того встревожены, а лишние слухи вредят торговле.\n\nЕсли же… если пропавших станет больше дюжины, умоляю прислать жреца и солдат. Я не знаю, что делать. Колокол звонит каждую ночь.\n\nВаш покорный слуга,\nКоб, староста Солтхейвена'},
 {id:'monk',style:'note',title:'Записка мёртвого монаха',when:'Сессия 2 · Монастырь Отлива, колодец во дворе',
  text:'Брат Эммерих, если ты жив: камертоны в часовне открывают склеп. Песнь святой Ольвен — в скриптории, в столе аббата.\n\nНе позволяй им звонить. Не позволяй ей петь.\n\nЯ спрячусь в колодце. Вода поёт громче, но здесь её почти не слышно.'},
 {id:'talmir',style:'book',title:'Дневник аббата Тальмира, последняя страница',when:'Сессия 2 · Скрипторий монастыря',
  text:'Вейра снова приходила ко мне во сне. Сорок лет назад она была лучшей послушницей, что я видел. Голос, от которого море затихало.\n\nЭто я отправил её в Ис-Мерин звонить в Великий колокол в ночь шторма. Она ударила не в такт. Город ушёл под воду, она — вместе с ним. Теперь она хочет ударить ещё раз — правильно, как ей кажется.\n\nЯ спрятал Жемчужину Дыхания у Серебряного колокола. Только с ней можно спуститься в Ис-Мерин и заглушить Великий.\n\nПеснь Ольвен — на обороте. Волна поднимается и отступает.\n\nДа простит меня Мать.'},
 {id:'song',style:'book',title:'Песнь святой Ольвен (оборот дневника)',when:'Сессия 2 · Скрипторий, ключ к загадке камертонов',
  text:'Семь голосов у святой Ольвен, от самого глубокого до самого звонкого.\nПой, как дышит море: волна поднимается — и отступает.',
  pre:STAFF,after:'Слева — первый удар, справа — последний. Чем выше знак, тем выше голос.'},
 {id:'chronicle',style:'book',title:'Летопись Ис-Мерина, последняя запись',when:'Сессия 3 · Дворцовый архив (доказательство для финала)',
  text:'Год чумы, месяц бурь.\n\nМор уносит по двадцать душ в день. Старшая певчая Вейра Тиш ушла в Разлом с тремя колоколами, чтобы просить Безмолвный Прилив о милости.\n\nПрилив ответил: город будет жить вечно.\n\nВода поднялась этой ночью. Мы живём. Да простит нас Мать Вод — мы живём.'},
 {id:'cloak',style:'item',title:'Плащ ската',when:'Сессия 1 · подарок смотрителя Брана',
  text:'Чудесный предмет, необычный.\n\nТёмно-серый плащ из гладкой кожи с узором, похожим на крылья ската. Пахнет солью и ламповым маслом.\n\nПока плащ надет на вас, вы можете дышать под водой и получаете скорость плавания 60 футов.\n\n«Он мне больше не нужен. Мне нужна дочь». — смотритель Бран'}];
const STYLES=[['letter','Письмо'],['note','Записка'],['book','Книга / свиток'],['item','Предмет']];

/* ---------- стили ---------- */
if(!document.getElementById('hoStyles')){const css=document.createElement('style');css.id='hoStyles';css.textContent=`
.ho-fab{position:fixed;z-index:20;left:max(56px,calc(env(safe-area-inset-left,0px) + 56px));top:calc(env(safe-area-inset-top,0px) + 56px);border:1px solid rgba(217,179,108,.6);background:rgba(35,29,16,.94);color:#d9b36c;border-radius:9px;padding:7px 11px;font:500 14px "Alegreya Sans",system-ui,sans-serif;cursor:pointer;box-shadow:0 4px 14px rgba(0,0,0,.5)}
.ho-fab:focus-visible{outline:2px solid #8fd1c4}
/* телефон: круглая кнопка 40px под кнопкой звука, число записок — значком */
.ho-fab.round{width:40px;height:40px;padding:0;border-radius:50%;font-size:18px;display:flex;align-items:center;justify-content:center}
.ho-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#d9b36c;color:#111819;font:700 11px/18px system-ui,sans-serif;text-align:center}
details.vacc{border:1px solid var(--line,#243235);border-radius:10px;background:var(--panel2,#162022);margin:8px 0}
details.vacc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:42px;padding:0 12px}
details.vacc>summary::-webkit-details-marker{display:none}
details.vacc>summary::after{content:'▸';margin-left:auto;color:var(--muted,#8e9e9b);transition:transform .15s}
details.vacc[open]>summary::after{transform:rotate(90deg)}
details.vacc>summary h3{margin:0;font-size:17px}
details.vacc>.vacc-b{padding:0 12px 10px;overflow-x:hidden}
@media (max-width:600px){details.vacc button{min-height:40px}}
.ho-ov{position:fixed;inset:0;z-index:45;background:rgba(6,9,10,.82);overflow-y:auto;-webkit-overflow-scrolling:touch;padding:calc(env(safe-area-inset-top,0px) + 18px) max(14px,env(safe-area-inset-right,0px)) 40px max(14px,env(safe-area-inset-left,0px))}
.ho-sheet{position:relative;max-width:620px;margin:0 auto;padding:30px 28px 26px;border-radius:6px;color:#3b2a17;background:#efe0bd;background-image:radial-gradient(circle at 20% 15%,rgba(255,255,255,.35),transparent 55%),radial-gradient(circle at 85% 90%,rgba(120,80,30,.18),transparent 60%),linear-gradient(180deg,#f2e5c6,#e6d2a6);box-shadow:0 18px 50px rgba(0,0,0,.6),inset 0 0 60px rgba(120,80,30,.22);font-family:"Alegreya",Georgia,"Times New Roman",serif;font-size:19px;line-height:1.55}
.ho-sheet h2{font-family:"Alegreya SC",Georgia,serif;font-weight:700;font-size:24px;margin:0 0 14px;color:#4a3015;text-wrap:balance;letter-spacing:.02em}
.ho-sheet .ho-txt{white-space:pre-wrap;margin:0}
.ho-sheet pre{font-family:"IBM Plex Mono",Consolas,monospace;font-size:13px;line-height:1.35;overflow-x:auto;background:rgba(120,80,30,.08);border-radius:4px;padding:10px 8px;margin:14px 0;color:#3b2a17}
.ho-sheet.letter .ho-txt{font-style:italic}
.ho-sheet.note{transform:rotate(-.6deg);max-width:440px;background:#f4ead2;border-bottom:2px dashed rgba(120,80,30,.25)}
.ho-sheet.note .ho-txt{font-style:italic;font-size:21px}
.ho-sheet.book .ho-txt::first-letter{font-family:"Alegreya SC",Georgia,serif;font-size:2.4em;float:left;line-height:.9;margin:4px 8px 0 0;color:#7a2f1d}
.ho-sheet.item{background:#e9e1cc;border:3px double rgba(90,60,25,.6);max-width:480px}
.ho-sheet.item h2{text-align:center;border-bottom:1px solid rgba(90,60,25,.35);padding-bottom:8px}
.ho-close{display:block;margin:18px auto 0;font:500 15px "Alegreya Sans",system-ui,sans-serif;padding:10px 22px;border-radius:9px;border:1px solid rgba(217,179,108,.6);background:#231d10;color:#d9b36c;cursor:pointer}
.ho-list{max-width:620px;margin:0 auto;background:#111819;border:1px solid #243235;border-radius:12px;padding:16px;color:#e3ebe8;font-family:"Alegreya Sans",system-ui,sans-serif}
.ho-list h2{font-family:"Alegreya SC",Georgia,serif;font-size:22px;margin:0 0 10px}
.ho-list button.ho-it{display:block;width:100%;text-align:left;margin:6px 0;padding:10px 12px;border-radius:9px;border:1px solid #243235;background:#162022;color:#e3ebe8;font:inherit;cursor:pointer}
.ho-list button.ho-it small{display:block;color:#8e9e9b;font-size:12px}
.ho-gm .ho-row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:space-between;border-bottom:1px solid #243235;padding:6px 0}
.ho-gm .ho-row b{font-weight:500}
.ho-gm .ho-when{font-size:12px;color:#8e9e9b;display:block}
.ho-gm .ho-on{color:#8fcf8a;font-size:12px}
`;document.head.append(css)}
if(!document.querySelector('link[href*="family=Alegreya:"]')){const l=document.createElement('link');l.rel='stylesheet';l.href='https://fonts.googleapis.com/css2?family=Alegreya:ital,wght@0,400;0,700;1,400&display=swap';document.head.append(l)}

/* ---------- состояние ---------- */
let shown={},drafts={},firstSnap=true,openId=null;
// перерисовать панель Мастера, но не сбивать ввод в поля
const refresh=()=>{const a=document.activeElement;if(a&&/INPUT|TEXTAREA|SELECT/.test(a.tagName))return;V.renderPane()};
const draft={id:null,title:'',text:'',style:'letter'};
const accordion=(key,title,kids)=>{let open=false;try{open=localStorage.getItem('vtt-acc-'+key)==='1'}catch(e){}const d=h('details',{class:'vacc'},h('summary',{},h('h3',{},title)),h('div',{class:'vacc-b'},...kids.filter(Boolean)));d.open=open;d.ontoggle=()=>{try{localStorage.setItem('vtt-acc-'+key,d.open?'1':'0')}catch(e){}};return d};

const root=V.overlay()||document.body;
const fab=h('button',{type:'button',class:'ho-fab',hidden:true,'aria-label':'Записки отряда'},'📜 Записки');
const ov=h('div',{class:'ho-ov',hidden:true,role:'dialog','aria-modal':'true'});
root.append(fab,ov);
fab.onclick=()=>openList();
ov.addEventListener('click',e=>{if(e.target===ov)closeOv()});
window.addEventListener('keydown',e=>{if(e.key==='Escape'&&!ov.hidden)closeOv()});

function sorted(){return Object.values(shown).sort((a,b)=>(a.ts||0)-(b.ts||0))}
function renderFab(){const n=Object.keys(shown).length,nw=innerWidth<600;fab.hidden=!n;fab.classList.toggle('round',nw);fab.title=`Записки отряда: ${n}`;
  if(nw){fab.replaceChildren('📜',h('span',{class:'ho-badge'},String(n)));const c=document.getElementById('board'),r=c?c.getBoundingClientRect():{right:innerWidth,top:0};fab.style.left=Math.round(r.right-50)+'px';fab.style.top=Math.round(r.top+58)+'px'}
  else{fab.textContent=`📜 Записки (${n})`;fab.style.left='';fab.style.top=''}}
addEventListener('resize',renderFab);
function closeOv(){ov.hidden=true;ov.replaceChildren();openId=null}
function sheet(d){const kids=[h('h2',{},d.title||'Записка'),h('p',{class:'ho-txt'},d.text||'')];
  if(d.pre)kids.push(h('pre',{'aria-label':'Ноты'},d.pre));if(d.after)kids.push(h('p',{class:'ho-txt',style:'font-size:16px;opacity:.85'},d.after));
  return h('div',{class:'ho-sheet '+(['letter','note','book','item'].includes(d.style)?d.style:'letter')},...kids)}
function openHandout(id){const d=shown[id];if(!d)return;openId=id;
  ov.replaceChildren(sheet(d),h('button',{type:'button',class:'ho-close',onclick:closeOv},'Закрыть'));ov.hidden=false;ov.scrollTop=0}
function openList(){const items=sorted();if(!items.length)return;openId=null;
  ov.replaceChildren(h('div',{class:'ho-list'},h('h2',{},'📜 Записки отряда'),
    ...items.map(d=>h('button',{type:'button',class:'ho-it',onclick:()=>openHandout(d.id)},d.title||'Записка',h('small',{},new Date(d.ts||0).toLocaleString('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})))),
    h('button',{type:'button',class:'ho-close',onclick:closeOv},'Закрыть')));ov.hidden=false;ov.scrollTop=0}

/* ---------- данные ---------- */
V.watch('handouts',arr=>{const prev=shown;shown=Object.fromEntries(arr.map(d=>[d.id,d]));renderFab();
  if(!firstSnap&&!V.isOwner){const fresh=arr.filter(d=>!prev[d.id]).sort((a,b)=>(b.ts||0)-(a.ts||0));if(fresh.length)openHandout(fresh[0].id)}
  if(openId&&!shown[openId])closeOv();firstSnap=false;if(V.isOwner)refresh()});
if(V.isOwner)V.watch('gm',arr=>{const next=Object.fromEntries(arr.filter(d=>d.id.startsWith('ho_')).map(d=>[d.id,d]));
  const ch=JSON.stringify(Object.keys(next))!==JSON.stringify(Object.keys(drafts));drafts=next;if(ch)refresh()});
const room=V.room;
if(room&&room.on)room.on('handout',m=>{if(V.isOwner)return;const id=m&&m.data&&m.data.id;if(typeof id!=='string')return;
  if(shown[id])openHandout(id);else setTimeout(()=>{if(shown[id])openHandout(id)},800)});

async function showAll(d,srcId){if(V.readOnly)return;
  const existing=srcId&&Object.values(shown).find(x=>x.src===srcId);if(existing){V.toast('Эта записка уже у игроков.');return}
  const id=V.store.newId('handouts');const doc={title:String(d.title||'Записка').slice(0,120),text:String(d.text||'').slice(0,8000),style:d.style||'letter',ts:Date.now()};
  if(d.pre)doc.pre=d.pre;if(d.after)doc.after=d.after;if(srcId)doc.src=srcId;
  await V.store.set('handouts/'+id,doc);if(room&&room.emit)room.emit('handout',{id}).catch(()=>{});
  V.post({kind:'sys',text:'📜 Мастер показал записку: '+doc.title})}
async function takeBack(id){const d=shown[id];await V.store.del('handouts/'+id);if(d)V.post({kind:'sys',text:'📜 Мастер забрал записку: '+d.title})}

/* ---------- раздел Мастера ---------- */
V.addGmSection(()=>{const out=[h('p',{class:'small muted'},'«Показать всем» — записка откроется у игроков. «Забрать» — убрать у всех.')];
  const box=h('div',{class:'ho-gm'});
  for(const p of PRESETS){const on=Object.values(shown).find(x=>x.src===p.id);
    box.append(h('div',{class:'ho-row'},h('span',{},h('b',{},p.title),h('span',{class:'ho-when'},p.when)),
      h('span',{class:'row'},h('button',{class:'btn sm',type:'button',title:'Посмотреть самому',onclick:()=>{ov.replaceChildren(sheet(p),h('button',{type:'button',class:'ho-close',onclick:closeOv},'Закрыть'));ov.hidden=false}},'👁'),
        on?h('span',{class:'ho-on'},'у игроков'):null,
        on?h('button',{class:'btn sm bad',type:'button',onclick:()=>takeBack(on.id)},'Забрать'):h('button',{class:'btn sm pri',type:'button',disabled:V.readOnly,onclick:()=>showAll(p,p.id)},'Показать всем'))))}
  out.push(box);
  // свои записки: черновики и уже показанные без шаблона
  const own=Object.values(shown).filter(x=>!x.src);
  if(own.length){out.push(h('h4',{style:'margin:12px 0 4px'},'Свои записки у игроков'));const b2=h('div',{class:'ho-gm'});
    for(const d of own)b2.append(h('div',{class:'ho-row'},h('b',{},d.title),h('button',{class:'btn sm bad',type:'button',onclick:()=>takeBack(d.id)},'Забрать')));out.push(b2)}
  const dl=Object.values(drafts);
  if(dl.length){out.push(h('h4',{style:'margin:12px 0 4px'},'Черновики'));const b3=h('div',{class:'ho-gm'});
    for(const d of dl)b3.append(h('div',{class:'ho-row'},h('b',{},d.title||'Без названия'),h('span',{class:'row'},
      h('button',{class:'btn sm',type:'button',onclick:()=>{Object.assign(draft,{id:d.id,title:d.title||'',text:d.text||'',style:d.style||'letter'});V.renderPane()}},'Изменить'),
      h('button',{class:'btn sm pri',type:'button',onclick:()=>showAll(d)},'Показать всем'),
      h('button',{class:'btn sm bad',type:'button',onclick:()=>V.store.del('gm/'+d.id)},'✕'))));out.push(b3)}
  // новая записка
  const ti=h('input',{type:'text',placeholder:'Заголовок','aria-label':'Заголовок записки',style:'width:100%'});ti.value=draft.title;ti.oninput=()=>{draft.title=ti.value};
  const tx=h('textarea',{rows:5,placeholder:'Текст записки, письма, вывески…','aria-label':'Текст записки'});tx.value=draft.text;tx.oninput=()=>{draft.text=tx.value};
  const stl=h('select',{'aria-label':'Вид'},...STYLES.map(([v,n])=>h('option',{value:v,selected:draft.style===v},n)));stl.onchange=()=>{draft.style=stl.value};
  const clear=()=>{Object.assign(draft,{id:null,title:'',text:'',style:'letter'});V.renderPane()};
  out.push(h('div',{class:'card'},h('b',{},draft.id?'Правка черновика':'Новая записка'),h('div',{style:'display:grid;gap:6px;margin-top:6px'},ti,tx,h('div',{class:'row'},'Вид: ',stl)),
    h('div',{class:'row',style:'margin-top:8px'},
      h('button',{class:'btn sm',type:'button',disabled:V.readOnly,onclick:async()=>{if(!draft.title.trim()&&!draft.text.trim())return V.toast('Напишите заголовок или текст');const id=draft.id||('ho_'+V.store.newId('gm'));
        await V.store.set('gm/'+id,{title:draft.title.trim().slice(0,120),text:draft.text.slice(0,8000),style:draft.style,ts:Date.now()});V.toast('Черновик сохранён — игроки его не видят');clear()}},'Сохранить черновик'),
      h('button',{class:'btn sm pri',type:'button',disabled:V.readOnly,onclick:async()=>{if(!draft.title.trim()&&!draft.text.trim())return V.toast('Напишите заголовок или текст');await showAll({title:draft.title.trim(),text:draft.text,style:draft.style});if(draft.id)await V.store.del('gm/'+draft.id);clear()}},'Показать всем'),
      draft.id||draft.title||draft.text?h('button',{class:'btn sm',type:'button',onclick:clear},'Очистить'):null)));
  return accordion('ho-gm','Записки и материалы',out)});
renderFab();
})();
