/* mod-chat.js — чат и броски по образцу Roll20, адаптированные к «Колоколам Солёной Мглы».
   Команды (/r /gmr /w /me /desc /help), встроенные броски [[1d20+5]], шёпот, карточки атак,
   макросы героя и случайные таблицы Мастера. Работает только через window.VTT. */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;

/* ---------- стили ---------- */
const css=document.createElement('style');css.textContent=`
.mc-emote{border-left-color:#8fd1c4!important;font-style:italic}
.mc-desc{border-left:3px solid #d9b36c!important;background:#1b170d;padding:8px 10px!important;border-radius:0 8px 8px 0;font-family:"Alegreya SC",Georgia,serif;font-size:16px;line-height:1.45;white-space:pre-wrap}
.mc-wh{border-left-color:#b48ce0!important;background:#1a1522}
.mc-wh .mc-tag,.mc-gm .mc-tag{display:inline-block;font-size:11px;padding:1px 6px;border-radius:999px;border:1px solid #6b4f8f;color:#cdb4f0;margin-right:4px}
.mc-gm .mc-tag{border-color:#8a6d22;color:#e8c46a}
.mc-ir{display:inline-block;font-family:"IBM Plex Mono",monospace;font-weight:500;padding:0 6px;border-radius:6px;background:#203133;border:1px solid #3c5558;color:#e3ebe8;cursor:help}
.mc-ir.crit{border-color:#8fcf8a;color:#b9f0b5}.mc-ir.fail{border-color:#e58a80;color:#ffb3aa}
.mc-card{border:1px solid #2c3d40;border-radius:10px;overflow:hidden;background:#111a1b;margin:2px 0}
.mc-card .mc-h{background:#2a1d10;color:#ecd9b4;padding:5px 9px;font-family:"Alegreya SC",Georgia,serif;font-size:15px}
.mc-card .mc-h small{display:block;font-family:"Alegreya Sans",sans-serif;font-size:12px;color:#c7b08a}
.mc-card .mc-row{display:flex;justify-content:space-between;align-items:center;gap:8px;padding:5px 9px;border-top:1px solid #223033}
.mc-card .mc-row b{font-family:"IBM Plex Mono",monospace;font-size:20px}
.mc-card .mc-row span{font-size:12px;color:#8e9e9b}
.mc-card .mc-det{font-family:"IBM Plex Mono",monospace;font-size:11px;color:#8e9e9b;padding:0 9px 6px;word-break:break-word}
.mc-card.crit .mc-h{background:#17331a;color:#c9f5c4}.mc-card.fail .mc-h{background:#3a1714;color:#ffc2bb}
.mc-badge{font-size:11px;padding:1px 6px;border-radius:999px;margin-left:6px;font-family:"Alegreya Sans",sans-serif}
.mc-badge.crit{background:#2f6f3a;color:#e6ffe2}.mc-badge.fail{background:#7a2a24;color:#ffe2de}
.mc-tbl{border-left-color:#d9b36c!important}
.mc-tbl .mc-res{font-size:15px;margin-top:2px}
.mc-tbl .mc-res b{font-family:"IBM Plex Mono",monospace;color:#d9b36c;margin-right:6px}
.mc-mac{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.mc-mac .mc-m{display:inline-flex;align-items:center;border:1px solid #2c3d40;border-radius:8px;overflow:hidden}
.mc-mac .mc-m button{border:0;background:#162022;color:#e3ebe8;padding:6px 9px;cursor:pointer;font:inherit}
.mc-mac .mc-m button.mc-x{padding:6px 7px;color:#e58a80;border-left:1px solid #2c3d40}
.mc-mac .mc-m small{font-family:"IBM Plex Mono",monospace;color:#8e9e9b;margin-left:5px}
.mc-tables .mc-t{display:flex;align-items:center;gap:6px;flex-wrap:wrap;padding:6px 0;border-bottom:1px solid #243235}
.mc-tables .mc-t .mc-n{flex:1;min-width:140px}
.mc-tables .mc-t .mc-n small{display:block;color:#8e9e9b;font-size:12px}
.mc-help{position:fixed;inset:0;z-index:60;background:rgba(5,8,9,.82);display:flex;align-items:center;justify-content:center;padding:16px}
.mc-help .mc-box{background:#111819;border:1px solid #d9b36c;border-radius:12px;padding:16px;max-width:520px;width:100%;max-height:100%;overflow:auto;color:#e3ebe8}
.mc-help code{font-family:"IBM Plex Mono",monospace;color:#8fd1c4}
.mc-help li{margin:5px 0}
`;document.head.append(css);

/* ---------- общие помощники ---------- */
const tm=ts=>new Date(ts).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'});
const who=m=>h('div',{class:'who'},`${m.who||''} · ${tm(m.ts||Date.now())}`);
const GMID='gm';
const lc=s=>String(s||'').toLowerCase();
const FORM=/^[0-9dDкК+\-]+$/;
function inlineParts(text,mode){const parts=[];let last=0;const re=/\[\[([^\]]{1,60})\]\]/g;let mm,any=false;
  while((mm=re.exec(text))){if(mm.index>last)parts.push({t:text.slice(last,mm.index)});const expr=mm[1].replace(/\s+/g,'');const r=V.roll(expr,mode);
    if(r){any=true;parts.push({r:{expr,total:r.total,det:r.det,nat:r.nat}})}else parts.push({t:mm[0]});last=re.lastIndex}
  if(last<text.length)parts.push({t:text.slice(last)});return any?parts:null}
function renderParts(parts){return parts.map(p=>{if(p.r){const c=p.r.nat===20?' crit':p.r.nat===1?' fail':'';return h('span',{class:'mc-ir'+c,title:`${p.r.expr}: ${p.r.det}`},String(p.r.total))}return String(p.t||'')})}
// адресаты шёпота: «gm/мастер», имя героя (→ его игрок) или имя игрока
function findTarget(rest){const r=lc(rest);
  for(const k of['мастеру','мастер','gm','дм','dm'])if(r===k||r.startsWith(k+' '))return{ids:[GMID],name:'Мастер',len:k.length};
  const cands=[];
  for(const t of V.tokList())if(t.name)cands.push({name:t.name,ids:[t.owner||GMID]});
  for(const id in V.names)if(V.names[id])cands.push({name:V.names[id],ids:[id]});
  cands.sort((a,b)=>b.name.length-a.name.length);
  for(const c of cands){const n=lc(c.name);if(r===n||r.startsWith(n+' '))return{ids:c.ids,name:c.name,len:n.length}}
  return null}

/* ---------- команды чата ---------- */
function help(){const ov=V.overlay();const close=()=>ov.replaceChildren();
  ov.replaceChildren(h('div',{class:'mc-help',onclick:e=>{if(e.target===e.currentTarget)close()}},h('div',{class:'mc-box'},
    h('h3',{style:'margin:0 0 8px'},'Команды чата'),
    h('ul',{style:'padding-left:18px;margin:0'},
      h('li',{},h('code',{},'/r 2d6+3 урон'),' — бросок с подписью (также ',h('code',{},'/roll'),')'),
      h('li',{},h('code',{},'/gmr 1d20 Скрытность'),' — бросок, который видят только Мастер и вы'),
      h('li',{},h('code',{},'/w Ари привет'),' — шёпот герою или игроку; ',h('code',{},'/w мастер …'),' — Мастеру'),
      h('li',{},h('code',{},'/me осматривает ящики'),' — действие от лица героя'),
      h('li',{},h('code',{},'/desc …'),' — описание сцены (только Мастер)'),
      h('li',{},h('code',{},'[[1d20+5]]'),' в любом сообщении — встроенный бросок, наведите или нажмите, чтобы увидеть разбор'),
      h('li',{},'Формула без команды (',h('code',{},'1d20+3'),') — обычный бросок, как раньше')),
    h('p',{class:'small muted',style:'margin:10px 0'},'Шёпот и скрытые броски не показываются чужим игрокам в журнале, но это не шифрование: опытный игрок может найти их в данных страницы. Настоящие тайны Мастер держит в своей вкладке.'),
    h('button',{class:'btn pri',type:'button',onclick:close},'Понятно'))))}
V.onChat((text,opt)=>{const mode=opt&&opt.mode;const secret=opt&&opt.secret;const t=text.trim();
  if(V.readOnly)return false;
  if(t[0]==='/'){const sp=t.indexOf(' ');const cmd=lc(sp<0?t:t.slice(0,sp)),rest=sp<0?'':t.slice(sp+1).trim();
    if(cmd==='/help'||cmd==='/?'||cmd==='/помощь'){help();return true}
    if(cmd==='/r'||cmd==='/roll'||cmd==='/gmr'){const m=rest.match(/^(\S+)\s*(.*)$/);const expr=m?m[1]:'';const label=(m&&m[2])||expr;
      if(!expr||!V.roll(expr,mode)){V.toast('Не понял формулу. Пример: /r 2d6+3 урон');return true}
      if(cmd==='/gmr'){if(V.isOwner)V.rollPost(label,expr,{mode,secret:true});
        else{const r=V.roll(expr,mode);V.post({kind:'roll',text:label,expr,total:r.total,det:r.det+(mode?(mode==='adv'?' · с преимуществом':' · с помехой'):''),nat:r.nat,to:[GMID],gmr:true})}
        return true}
      V.rollPost(label,expr,{mode,secret});return true}
    if(cmd==='/w'||cmd==='/шёпот'||cmd==='/шепот'){const tg=findTarget(rest);if(!tg){V.toast('Кому шептать? Пример: /w Ари текст или /w мастер текст');return true}
      const msg=rest.slice(tg.len).trim();if(!msg){V.toast('Напишите текст после имени.');return true}
      const parts=inlineParts(msg,mode);V.post({kind:'chat',whisper:true,to:tg.ids,toName:tg.name,text:msg.slice(0,500),parts});return true}
    if(cmd==='/me'||cmd==='/em'){if(!rest)return true;V.post({kind:'chat',emote:true,text:rest.slice(0,500),parts:inlineParts(rest,mode)},secret);return true}
    if(cmd==='/desc'){if(!V.isOwner){V.toast('Описывать сцену может только Мастер.');return true}if(!rest)return true;V.post({kind:'chat',desc:true,text:rest.slice(0,1500)},secret);return true}
    V.toast('Неизвестная команда. Наберите /help');return true}
  if(/\[\[[^\]]+\]\]/.test(t)){const parts=inlineParts(t,mode);if(!parts)return false;V.post({kind:'chat',text:t.slice(0,500),parts},secret);return true}
  return false});

/* шёпот и скрытые броски видят отправитель, адресат и Мастер */
V.addLogFilter(m=>!m.to||!m.to.length||V.isOwner||m.by===V.myId||m.to.includes(V.myId));

/* ---------- отрисовка записей журнала ---------- */
function attackCard(m){const det=String(m.det||'');const ti=String(m.text||'');
  const head=ti.split(' · ');const title=head[0]||ti;const sub=head.slice(1).join(' · ');
  const crit=m.nat===20||/КРИТ/.test(ti),fail=m.nat===1||/промах \(1\)/.test(ti);
  const atk=det.match(/^атака\s+(.*?)\s*·\s*урон\s+(\S+)\s*\((.*)\)\s*$/);
  const card=h('div',{class:'mc-card'+(crit?' crit':fail?' fail':'')},
    h('div',{class:'mc-h'},title,crit?h('span',{class:'mc-badge crit'},'КРИТ'):null,fail?h('span',{class:'mc-badge fail'},'ПРОМАХ'):null,sub?h('small',{},sub):null),
    h('div',{class:'mc-row'},h('span',{},'Атака'),h('b',{},String(m.total))),
    h('div',{class:'mc-row'},h('span',{},'Урон'+(crit?' (кости ×2)':'')),h('b',{},fail?'—':(m.dmg!=null?String(m.dmg):(atk?atk[2]:'?')))),
    h('div',{class:'mc-det'},atk?`атака ${atk[1]} · урон ${atk[3]}`:det));
  return card}
V.addLogRenderer(m=>{if(!m||typeof m!=='object')return null;
  const lock=m.to&&m.to.length?(m.gmr?h('span',{class:'mc-tag'},'🔒 скрыто: Мастер и вы'):m.whisper?h('span',{class:'mc-tag'},m.by===V.myId?`шёпот → ${m.toName||'?'}`:'шёпот вам'):null):null;
  if(m.desc)return h('div',{class:'msg mc-desc'},String(m.text||''));
  if(m.emote)return h('div',{class:'msg mc-emote'},h('div',{class:'who'},tm(m.ts||Date.now())),h('div',{},'✦ ',h('b',{},m.who||''),' ',...(m.parts?renderParts(m.parts):[String(m.text||'')])));
  if(m.whisper)return h('div',{class:'msg mc-wh'},who(m),h('div',{},lock,...(m.parts?renderParts(m.parts):[String(m.text||'')])));
  if(m.table)return h('div',{class:'msg mc-tbl'+(m.kind==='secret'?' secret':'')},who(m),h('div',{},(m.kind==='secret'?'🔒 ':'')+'🎲 '+(m.tname||'Таблица')+` (d${m.die})`),h('div',{class:'mc-res'},h('b',{},String(m.total)),String(m.res||'')));
  if(m.gmr)return h('div',{class:'msg roll mc-gm'},who(m),h('div',{},lock,String(m.text||'')),h('div',{},h('span',{class:'tot'},String(m.total)),' ',h('span',{class:'det'},String(m.det||''))));
  if(m.parts&&m.kind==='chat')return h('div',{class:'msg chat'},who(m),h('div',{},...renderParts(m.parts)));
  if(m.kind==='roll'&&/^атака\s/.test(String(m.det||''))){
    const tg=m.target&&V.S.tokens[m.target];
    const btn=V.isOwner&&tg&&m.dmg!=null&&typeof V.applyHp==='function'
      ?h('button',{class:'btn sm bad',type:'button',style:'margin-top:4px',onclick:()=>V.applyHp(m.target,m.dmg,'dmg')},`Нанести ${m.dmg} урона: ${tg.name}`):null;
    return h('div',{class:'msg roll'},who(m),attackCard(m),btn)}
  return null});

/* ---------- макросы героя ---------- */
V.addHeroSection((t,c)=>{const can=!V.readOnly&&(V.isOwner||t.owner===V.myId);const macros=Array.isArray(c&&c.macros)?c.macros:[];
  const save=list=>V.store.set('chars/'+t.id,{...(c||{}),macros:list.slice(0,40)});
  const box=h('div',{class:'mc-mac'},...macros.map((mm,i)=>h('span',{class:'mc-m'},
    h('button',{type:'button',title:mm[1],onclick:()=>{if(!V.roll(mm[1])){V.toast('Формула макроса не читается: '+mm[1]);return}V.rollPost(`${t.name}: ${mm[0]}`,mm[1],{})}},mm[0],h('small',{},mm[1])),
    can?h('button',{type:'button',class:'mc-x','aria-label':'Удалить макрос '+mm[0],onclick:()=>save(macros.filter((_,j)=>j!==i))},'✕'):null)));
  const out=[h('h3',{},'Макросы'),macros.length?box:h('p',{class:'small muted'},'Быстрые кнопки бросков: «Скрытая атака 2d6», «Внимательность 1d20+4», «Лечение 1d8+3».')];
  if(can){const n=h('input',{type:'text',placeholder:'Название','aria-label':'Название макроса',style:'flex:1;min-width:110px'}),f=h('input',{type:'text',placeholder:'1d20+4','aria-label':'Формула макроса',style:'width:96px'});
    out.push(h('div',{class:'row'},n,f,h('button',{class:'btn sm',type:'button',onclick:()=>{const name=n.value.trim().slice(0,30),fm=f.value.replace(/\s+/g,'');if(!name||!V.roll(fm)){V.toast('Укажите название и формулу, например 2d6+3');return}save([...macros,[name,fm]])}},'+ Макрос')))}
  return out});

/* ---------- случайные таблицы Мастера ---------- */
const PRESET=[
 {id:'p-rumors',name:'Слухи Солтхейвена',die:6,rows:[
  'Пропадают только те, кто живёт у самой воды.',
  'В Ис-Мерине было три колокола, и все звонили в ночь, когда город утонул.',
  'Контрабандисты Дожа перестали возить бренди — что-то их напугало.',
  'Маяк погас, потому что старый Бран спился. (ложь: Бран связан, маяком правит Мейв)',
  'Пропавшие уходят к русалкам, им там хорошо. (полуправда: их зовёт Вейра)',
  'Монахи с Чаячьего Хребта знали, как заставить колокол молчать.']},
 {id:'p-coast',name:'Встречи на побережье',die:8,rows:[
  '1d4 гигантских краба в приливной луже',
  '2 бандита Дожа с бочонком бренди — готовы торговаться',
  'Лунатик бредёт к воде (испытание навыков, как в сцене 1)',
  '2 культиста-певчих тянут ноту у камня с символом рта и волн',
  'Выброшенная лодка: внутри бутыль с запиской «Не слушай колокол»',
  'Сахуагин-разведчик следит из прибоя и уходит под воду',
  'Тамси или Орвин с новостями из города',
  'Тишина и туман… далёкий удар колокола (Шкала Мглы +1, если ночь)']},
 {id:'p-sea',name:'Встречи в море',die:8,rows:[
  'Акула-охотник кружит вокруг лодки',
  '2 мерроу лезут на борт',
  'Обломок мачты с серебряным колокольчиком певчих',
  'Косяк рыбы светится зелёным — признак Мглы',
  'Туман: проверка Мудрости (Выживание) СЛ 13, иначе лодка сбивается с курса на час',
  'Утопленник всплывает и шепчет имя одного из героев',
  'Рыбацкая лодка без людей, сети полны',
  'Ветер стихает — штиль на 1d4 часа']},
 {id:'p-ismerin',name:'Встречи в Ис-Мерине',die:8,rows:[
  'Патруль: 2 сахуагина',
  'Жрица сахуагинов и 2 сахуагина ведут пленника',
  '1d4 зомби-утопленника в бывших доспехах стражи',
  '2 гуля в склепе под мостовой',
  'Призрачный торговец предлагает обмен за воспоминание',
  'Купол дрожит: с потолка льётся вода, трудная местность на 1 минуту',
  'Певчие поют на площади — Вейра узнаёт, где герои',
  'Мерроу у Разлома, внизу что-то огромное открывает глаз']},
 {id:'p-loot',name:'Находки в обломках',die:10,rows:[
  '2d6 мм и ржавый рыболовный крючок','Фляга масла и сухой факел','Медальон с портретом — 15 зм','Карта отмелей (преимущество на навигацию в бухте)',
  'Зелье лечения в просмолённой коробке','Серебряный колокольчик певчих — 40 зм','Нож с перламутровой рукоятью — 25 зм',
  'Восковые затычки (пара) в кожаном мешочке','Жемчужина — 100 зм','Свиток «Невидимое служение» или «Тишина» (1 круг/2 круг, на выбор Мастера)']},
 {id:'p-names',name:'Имена NPC',die:12,rows:['Хенн Гаррик (старый рыбак)','Ильма Соль (засольщица)','Бертольд Кнехт (бочар)','Нэйла Ватт (вдова моряка)','Корвин Шторм (лоцман)','Сив Тёрн (юнга)','Аська Мел (торговка рыбой)','Олаф Риф (кузнец)','Тара Вереск (травница)','Энно Пэрри (бывший контрабандист)','Мэй Лин (певчая-новообращённая)','Дорн Каменный (охотник за обломками)']},
 {id:'p-mist',name:'Погода и Мгла',die:6,rows:[
  'Ясно, ветер с моря — Мгла отступает на день',
  'Лёгкий туман утром, к полудню рассеивается',
  'Морось и туман; дальность зрения 60 фт',
  'Густой туман: всё дальше 30 фт — слабо заслонено',
  'Шторм: лодки в гавани, лазать по скалам с помехой',
  'Зелёная Мгла и звон ночью (Шкала Мглы +1)']}];
// слухи из лора, если он уже загружен и там есть список
function loreRumors(){try{const L=window.LORE;if(!Array.isArray(L))return null;const s=L.find(x=>x.id==='solthaven');if(!s)return null;
  let after=false;for(const b of s.body||[]){if(b.h)after=/слух/i.test(b.h);else if(after&&Array.isArray(b.list)&&b.list.length>=6)return b.list.slice(0,6)}}catch(e){}return null}
let custom={};let watching=false;
function ensureWatch(){if(watching||!V.isOwner)return;watching=true;V.watch('gm',a=>{custom=Object.fromEntries(a.filter(d=>String(d.id).startsWith('table_')).map(d=>[d.id,d]));V.renderPane()})}
function rollTable(tb,secret){const rows=(tb.rows||[]).filter(Boolean);if(!rows.length)return;const die=Number(tb.die)||rows.length;const r=V.rnd(die);
  const res=rows[(r-1)%rows.length];V.post({kind:'roll',table:true,tname:tb.name,die,total:r,res,text:`${tb.name}: ${res}`},secret)}
let tblSecret=true;
V.addGmSection(()=>{ensureWatch();
  const rumors=loreRumors();const list=PRESET.map(p=>p.id==='p-rumors'&&rumors?{...p,rows:rumors}:p);
  const all=[...list,...Object.values(custom)];
  const sec=h('input',{type:'checkbox',checked:tblSecret,onchange:e=>{tblSecret=e.target.checked}});
  const rows=all.map(tb=>h('div',{class:'mc-t'},h('div',{class:'mc-n'},tb.name,h('small',{},`d${tb.die||(tb.rows||[]).length} · ${(tb.rows||[]).length} строк`+(tb.id&&String(tb.id).startsWith('table_')?' · своя':''))),
    h('button',{class:'btn sm pri',type:'button',onclick:()=>rollTable(tb,tblSecret)},'🎲 Бросить'),
    String(tb.id||'').startsWith('table_')?h('button',{class:'btn sm bad',type:'button','aria-label':'Удалить таблицу '+tb.name,onclick:()=>V.store.del('gm/'+tb.id)},'✕'):null));
  const nn=h('input',{type:'text',placeholder:'Название таблицы','aria-label':'Название таблицы',style:'width:100%'});
  const ta=h('textarea',{rows:4,placeholder:'Каждая строка — один результат. Кость = число строк.','aria-label':'Строки таблицы'});
  const add=h('details',{},h('summary',{},'+ Своя таблица'),nn,ta,h('button',{class:'btn sm',type:'button',style:'margin-top:6px',onclick:()=>{const name=nn.value.trim().slice(0,60);const rws=ta.value.split('\n').map(s=>s.trim()).filter(Boolean).slice(0,100);
    if(!name||rws.length<2){V.toast('Нужно название и хотя бы две строки.');return}const id='table_'+V.store.newId('gm');V.store.set('gm/'+id,{name,die:rws.length,rows:rws})}},'Сохранить таблицу'));
  return[h('h3',{},'Случайные таблицы'),h('label',{class:'row small'},sec,'Бросать скрыто (видит только Мастер)'),h('div',{class:'mc-tables'},...rows),add,
    h('p',{class:'small muted'},'Команды чата для всех: /r, /gmr, /w, /me, /desc, [[1d20+5]] — подробнее /help во вкладке «Кубики».')]});
})();
