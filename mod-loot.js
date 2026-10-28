// mod-loot.js — вкладка Мастера «Добыча»: что лежит в сундуках, бочках, телах и тайниках по локациям кампании.
// Предметы и цены — Книга игрока 2014; магия — необычная/редкая из Руководства Мастера 2014, изредка и по уровню героев.
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;

/* ---------- предметы: [название, вес в фунтах, цена] ---------- */
const I={
  torch:['Факел',1,'1 мм'],rope:['Верёвка пеньковая, 50 фт',10,'1 зм'],silk:['Верёвка шёлковая, 50 фт',5,'10 зм'],ration:['Рационы (1 день)',2,'5 см'],oil:['Масло, фляга',1,'1 см'],
  bolts:['Арбалетные болты (20)',1.5,'1 зм'],arrows:['Стрелы (20)',1,'1 зм'],brandy:['Бутылка бренди Дожа',1.5,'5 зм'],rum:['Бутылка рома',1.5,'2 зм'],ale:['Бочонок эля (малый)',10,'4 см'],
  candle:['Свеча',0,'1 мм'],symbol:['Священный символ Морской Матери',1,'5 зм'],parchment:['Лист пергамента',0,'1 см'],ink:['Бутылочка чернил',0,'10 зм'],book:['Книга (молитвенник)',5,'25 зм'],
  potion:['Зелье лечения',0.5,'50 зм'],antitoxin:['Противоядие',0,'50 зм'],holy:['Святая вода, флакон',1,'25 зм'],healkit:['Набор целителя',3,'5 зм'],
  dagger:['Кинжал',1,'2 зм'],shortsword:['Короткий меч',2,'10 зм'],scimitar:['Ятаган',3,'25 зм'],lxbow:['Лёгкий арбалет',5,'25 зм'],spear:['Копьё',3,'1 зм'],harpoon:['Гарпун (как копьё)',3,'1 зм'],net:['Сеть',3,'1 зм'],trident:['Трезубец',4,'5 зм'],
  leather:['Кожаный доспех',10,'10 зм'],shield:['Щит',6,'10 зм'],chain:['Цепь, 10 фт',10,'5 зм'],crowbar:['Ломик',5,'2 зм'],lantern:['Фонарь закрытый',2,'5 зм'],tinder:['Трутница',1,'5 см'],
  spyglass:['Подзорная труба (треснувшая)',1,'100 зм'],navtools:['Инструменты навигатора',2,'25 зм'],thieves:['Воровские инструменты',1,'25 зм'],cards:['Колода карт',0,'5 см'],dice:['Игральные кости',0,'1 см'],
  salt:['Мешочек соли',1,'5 мм'],fish:['Копчёная селёдка (связка)',2,'1 см'],sailcloth:['Отрез парусины',4,'1 зм'],tar:['Горшок смолы',3,'5 см'],hook:['Кошка (абордажный крюк)',4,'2 зм'],
  pearl:['Жемчужина',0,'100 зм'],pearlS:['Мелкий речной жемчуг',0,'10 зм'],coral:['Ветка красного коралла',0.5,'25 зм'],agate:['Агат с прожилками',0,'10 зм'],turq:['Бирюза',0,'10 зм'],blood:['Гелиотроп',0,'50 зм'],aqua:['Аквамарин',0,'500 зм'],
  oldgold:['Старинная золотая монета Ис-Мерина',0,'2 зм (коллекционеру 5)'],ring:['Серебряное кольцо с волной',0,'25 зм'],goblet:['Серебряный кубок с гравировкой',1,'25 зм'],idol:['Статуэтка Морской Матери из кости',1,'25 зм'],crown:['Обруч жрицы Ис-Мерина',1,'250 зм'],
  bell:['Серебряный колокольчик певчих',0,'40 зм'],shell:['Ракушка с символом трёх волн',0,'—'],notes:['Обрывок нот певчих',0,'—'],letter:['Размокшее письмо (читается с трудом)',0,'—'],map:['Обрывок морской карты бухты',0,'—'],
  feather:['Перо чайки в воске (оберег)',0,'1 мм'],ear:['Восковые затычки для ушей',0,'1 см'],ladanka:['Солевая ладанка Морской Матери',0,'25 зм']};
const MAGIC_UNC=[['Зелье большего лечения',0.5,'≈150 зм'],['Зелье подводного дыхания',0.5,'≈120 зм'],['Свиток заклинания 1 круга («Щит веры»)',0,'≈60 зм'],['Свиток заклинания 2 круга («Тишина»)',0,'≈120 зм'],
  ['Шапка подводного дыхания (необычный)',1,'—'],['Кольцо плавания (необычный)',0,'—'],['Бутылка вечного дыма (необычный)',1,'—'],['Жемчужина силы (необычный, настройка: заклинатель)',0,'—'],
  ['Плащ манты (необычный)',1,'—'],['Оружие +1 (кинжал или трезубец)',2,'—'],['Сапоги эльфов (необычный)',1,'—'],['Монета-подвеска удачи: 1 раз перебросить d20 (сюжетная)',0,'—']];
const MAGIC_RARE=[['Зелье превосходного лечения (редкий)',0.5,'≈450 зм'],['Кольцо защиты (редкий)',0,'—'],['Свиток заклинания 3 круга («Снятие проклятия»)',0,'≈200 зм'],
  ['Доспех сопротивления холоду (редкий, кожаный)',10,'—'],['Трезубец-рыбоповелитель (необычный)',4,'—'],['Плащ защиты (необычный)',1,'—'],['Амулет здоровья (редкий)',1,'—']];

/* ---------- локации и подходящие карты ---------- */
const LOCS={grot:'Грот Бочек (контрабандисты)',mayak:'Маяк Седой Бран',town:'Солтхейвен (дома, лавка, таверна, часовня)',ship:'Палуба «Цапли» и Зубы Вдовы',monastery:'Монастырь Отлива',crypt:'Склеп Серебряного колокола',ismerin:'Ис-Мерин (утонувший город)',tower:'Колокольная башня'};
const MAP_LOC={'01-region':'town','02-solthaven':'town','03-grot-bochek':'grot','04-mayak':'mayak','05-paluba-tsapli':'ship','06-monastyr-otliva':'monastery','07-sklep-kolokola':'crypt','08-is-merin':'ismerin','09-kolokolnaya-bashnya':'tower',
  '10-baklan':'town','11-dom-marty':'town','12-chasovnya':'town','13-kryuk-i-uzel':'town','14-dom-staresty':'town','15-domik-smotritelya':'mayak'};
const CONTS={chest:'Сундук',barrel:'Бочка',crate:'Ящик',sack:'Мешок / сумка',body:'Тело (обыск павшего)',cache:'Тайник',altar:'Алтарь / реликварий',wreck:'Обломки корабля',shelf:'Полка / стол'};
const LOC_CONTS={grot:['chest','barrel','crate','sack','body','cache'],mayak:['chest','barrel','shelf','body','cache'],town:['chest','crate','shelf','sack','cache','barrel'],
  ship:['chest','barrel','crate','wreck','body','sack'],monastery:['chest','shelf','altar','body','cache','sack'],crypt:['altar','chest','body','cache','wreck'],
  ismerin:['chest','altar','wreck','body','shelf','cache'],tower:['altar','chest','body','cache','shelf']};
// множитель монет: сколько денег обычно в таком контейнере
const COIN_MUL={chest:1,cache:1.3,altar:.7,body:.5,sack:.4,wreck:.6,shelf:.25,crate:.2,barrel:.1};

/* ---------- таблицы: строка = [вес шанса, [[ключ, количество]...], примечание?, особое?]
   особое: 'empty' пусто, 'trap' неприятность, 'theme' + бросок по тематической таблице локации, 'magic' магический предмет ---------- */
const T={
 chest:[[6,[],'Пусто: кто-то побывал здесь раньше.','empty'],[5,[],'Крышка на ржавой пружине — игла с ядом: спасбросок Телосложения СЛ 11, иначе 1d10 урона ядом (Расследование СЛ 13 заметить заранее).','trap'],
   [10,[['rope',1],['torch','1d4']]],[10,[['potion',1]],'Флакон в тряпице.'],[8,[['dagger',1],['leather',1]]],[10,[['agate','1d3']]],[8,[['goblet',1]]],[12,[],'Тематическая находка.','theme'],
   [8,[['holy',1],['healkit',1]]],[7,[['turq','1d2'],['ring',1]]],[6,[['thieves',1]]],[6,[],'Двойное дно!','magic'],[4,[['blood',1]]]],
 barrel:[[14,[],'Солёная вода и тина — ничего полезного.','empty'],[8,[],'Тухлая рыба: запах на весь зал. Спасбросок Телосложения СЛ 10 или отравлен на 10 минут.','trap'],[14,[['fish','1d4'],['salt',2]]],
   [12,[['ale',1]]],[10,[['oil','1d6']]],[14,[],'Тематическая находка.','theme'],[10,[['tar',1],['sailcloth',1]]],[8,[['ration','1d6']]],[6,[],'На дне, в промасленной коже, свёрток.','theme'],[4,[['potion',1]],'Флакон, приклеенный воском к стенке.']],
 crate:[[10,[],'Пусто, только солома.','empty'],[6,[],'Из соломы выскакивает крыса и кусает: 1 колющий урон.','trap'],[14,[['bolts','1d2'],['lxbow',1]]],[12,[['ration','2d4'],['tinder',1]]],
   [12,[['lantern',1],['oil','1d4']]],[14,[],'Тематическая находка.','theme'],[10,[['crowbar',1],['hook',1]]],[8,[['chain',1]]],[8,[['candle','2d6']]],[6,[['shield',1]]]],
 sack:[[12,[],'Тряпьё и пустые бутылки.','empty'],[14,[['ration','1d4'],['tinder',1]]],[12,[['dice',1],['cards',1]]],[14,[],'Тематическая находка.','theme'],[10,[['pearlS','1d4']]],
   [10,[['dagger',1]]],[10,[['torch','1d3'],['oil',1]]],[8,[['feather',1],['ear',2]]],[6,[['letter',1]]],[4,[['potion',1]]]],
 body:[[10,[],'Карманы вывернуты — кто-то обыскал раньше.','empty'],[16,[['dagger',1]]],[14,[],'Тематическая находка.','theme'],[12,[['scimitar',1],['leather',1]]],
   [10,[['agate',1]]],[10,[['letter',1]],'Письмо или записка за пазухой.'],[8,[['potion',1]]],[8,[['ring',1]]],[6,[['thieves',1]]],[6,[['bell',1]],'Серебряный колокольчик на шнурке у шеи.']],
 cache:[[6,[],'Тайник пуст — нашли раньше вас.','empty'],[6,[],'Отравленная игла в крышке: спасбросок Телосложения СЛ 11, иначе 1d10 урона ядом.','trap'],[14,[['blood',1],['turq','1d3']]],
   [12,[['potion','1d2']]],[14,[],'Тематическая находка.','theme'],[10,[['pearl',1]]],[10,[['map',1]]],[10,[],'Завёрнутый в шёлк предмет.','magic'],[8,[['silk',1],['thieves',1]]],[10,[['ladanka',1],['holy',1]]]],
 altar:[[8,[],'Только оплывшие свечи.','empty'],[6,[],'Порча: тот, кто взял подношение, слышит пение в ушах до рассвета (помеха на Внимательность на слух).','trap'],
   [14,[['candle','3d4'],['symbol',1]]],[12,[['idol',1]]],[12,[],'Тематическая находка.','theme'],[10,[['pearl','1d2']]],[10,[['holy','1d2']]],[10,[['goblet',1],['ring',1]]],[8,[],'Под покровом алтаря — реликвия.','magic'],[10,[['coral','1d3']]]],
 wreck:[[12,[],'Только гнилые доски.','empty'],[6,[],'Доски проваливаются: спасбросок Ловкости СЛ 12 или 1d6 дробящего урона и падение в воду.','trap'],[14,[['sailcloth',1],['rope',1]]],
   [12,[['harpoon',1],['net',1]]],[14,[],'Тематическая находка.','theme'],[10,[['navtools',1]]],[8,[['spyglass',1]]],[10,[['rum','1d3']]],[8,[['oldgold','2d6']]],[6,[],'Запертая шкатулка капитана.','magic']],
 shelf:[[14,[],'Пыль, черепки, ничего ценного.','empty'],[14,[['candle','1d6'],['parchment','1d6']]],[12,[['book',1]]],[12,[],'Тематическая находка.','theme'],[10,[['ink',1],['parchment','2d4']]],
   [10,[['healkit',1]]],[10,[['goblet',1]]],[8,[['antitoxin',1]]],[6,[['letter',1]]],[4,[],'За книгами — свёрток.','magic']]};

// тематические находки локаций (бросок, когда выпала строка «тематическая находка»)
const THEME={
 grot:[[18,[['brandy','1d6']],'Контрабандный бренди Дожа.'],[14,[['bolts','1d3']]],[10,[['lxbow',1]]],[12,[['silk',1]],'Шёлковый канат — контрабанда.'],[10,[['agate','1d4']],'Мешочек «товара» для обмена.'],
   [8,[['map',1]],'Карта тайников Дожа вдоль берега.'],[8,[['cards',1],['dice',1]]],[8,[['spyglass',1]]],[6,[['shell',1]],'Ракушка с тремя волнами — знак певчих, кто-то обронил.'],[6,[['notes',1]],'Обрывок нот: несколько знаков, похожих на волну.']],
 mayak:[[18,[['oil','2d4']],'Масло для фонаря маяка.'],[14,[['lantern',1]]],[12,[['rope',1],['hook',1]]],[10,[['letter',1]],'Письмо Мейв к матери, которую она считает живой.'],[10,[['candle','2d6']]],
   [10,[['navtools',1]]],[8,[['shell','1d3']],'Ракушки с тремя волнами.'],[8,[['notes',1]],'Ноты песни певчих (Мейв учила их наизусть).'],[6,[['bell',1]]],[4,[['spyglass',1]]]],
 town:[[16,[['fish','1d6'],['salt',1]]],[14,[['ale',1]]],[12,[['ladanka',1]]],[12,[['ear','1d4']],'Восковые затычки от сестры Аделины.'],[10,[['healkit',1]]],[10,[['symbol',1]]],
   [8,[['letter',1]],'Неотправленное письмо родне: «у нас тут звонит море».'],[8,[['dice',1],['cards',1]]],[6,[['turq',1]]],[4,[['potion',1]]]],
 ship:[[16,[['rum','1d4']]],[14,[['harpoon','1d2']]],[12,[['net',1],['rope',1]]],[12,[['tar',1],['sailcloth','1d2']]],[10,[['navtools',1]]],[10,[['fish','1d6']]],
   [8,[['map',1]],'Морская карта Зубов Вдовы с пометками проходов.'],[8,[['pearlS','1d6']]],[6,[['bell',1]],'Колокольчик певчих — сорван с шеи мерроу.'],[4,[['spyglass',1]]]],
 monastery:[[16,[['candle','3d6']]],[14,[['symbol',1]]],[12,[['parchment','2d6'],['ink',1]]],[12,[['book',1]],'Молитвенник святой Ольвен.'],[10,[['holy','1d2']]],[8,[['idol',1]]],
   [8,[['notes',1]],'Страница с нотами «Песни Ольвен» (половина).'],[8,[['healkit',1]]],[6,[['goblet',1]]],[6,[['ladanka',1]]]],
 crypt:[[16,[['candle','2d6'],['symbol',1]]],[12,[['pearl',1]]],[12,[['ring',1]]],[10,[['goblet','1d2']]],[10,[['coral','1d3']]],[10,[['holy',1]]],
   [8,[['bell',1]],'Серебряный колокольчик — точь-в-точь как Серебряный колокол, только маленький.'],[8,[['shell','1d4']]],[8,[['oldgold','1d6']]],[6,[['idol',1]]]],
 ismerin:[[18,[['oldgold','3d6']],'Старинное золото Ис-Мерина.'],[14,[['coral','1d4']]],[12,[['pearl','1d3']]],[10,[['ring','1d2']]],[10,[['goblet',1]]],[8,[['aqua',1]],'Аквамарин в оправе из водорослей.'],
   [8,[['crown',1]],'Обруч жрицы-певчей.'],[8,[['shell','1d6']]],[6,[['notes',1]],'Ноты Великой Песни — от них холодеют пальцы.'],[6,[['trident',1]]]],
 tower:[[16,[['oldgold','2d6']]],[14,[['pearl','1d2']]],[12,[['bell','1d2']]],[12,[['candle','2d6']]],[10,[['coral','1d3']]],[10,[['ring',1]]],
   [8,[['notes',1]],'Партитура Великого колокола.'],[8,[['crown',1]]],[6,[['aqua',1]]],[4,[['idol',1]]]]};

/* ---------- броски ---------- */
const R=(expr)=>{if(typeof expr==='number')return expr;const r=V.roll(String(expr));return r?r.total:1};
function pick(rows,d){const total=rows.reduce((s,r)=>s+r[0],0);let x=Math.ceil(d/100*total);for(const r of rows){x-=r[0];if(x<=0)return r}return rows[rows.length-1]}
function avgLevel(){const pcs=V.tokList().filter(t=>t.kind==='pc');const ls=pcs.map(t=>Number((V.S.chars[t.id]||{}).lvl)||0).filter(Boolean);return ls.length?Math.round(ls.reduce((a,b)=>a+b,0)/ls.length):2}
function magicItem(lvl){const d=V.rnd(100);const rare=lvl>=6&&d>70;const list=rare?MAGIC_RARE:MAGIC_UNC;const it=list[V.rnd(list.length)-1];return{name:it[0],qty:1,w:it[1],price:it[2],magic:true,d}}
function coins(cont,lvl){const mul=COIN_MUL[cont]||.3;if(Math.random()>(mul>=.4?.8:.45))return{gp:0,sp:0,cp:0};const tier=lvl<=4?1:lvl<=6?2:3;
  return{gp:Math.round(R(`${tier*2}d6`)*5*mul*tier/1.5),sp:Math.round(R('3d6')*mul*tier),cp:Math.round(R('4d6')*mul)}}
function search(loc,cont,lvl){const d=V.rnd(100);const row=pick(T[cont],d);const res={loc,cont,lvl,d,items:[],note:row[2]||'',kind:row[3]||'',coins:{gp:0,sp:0,cp:0},ts:Date.now(),dice:[`d100 → ${d}`]};
  const add=(list)=>{for(const [k,q] of list){const it=I[k];if(!it)continue;res.items.push({name:it[0],qty:R(q),w:it[1],price:it[2]})}};
  add(row[1]);
  if(res.kind==='theme'){const d2=V.rnd(100);const tr=pick(THEME[loc],d2);res.dice.push(`находка d100 → ${d2}`);add(tr[1]);if(tr[2])res.note=tr[2]}
  if(res.kind==='magic'){if(lvl>=3||V.rnd(100)>60){const m=magicItem(lvl);res.items.push(m);res.dice.push(`магия d100 → ${m.d}`)}else{const d2=V.rnd(100);const tr=pick(THEME[loc],d2);add(tr[1]);res.note=(res.note?res.note+' ':'')+'Внутри — обычная находка (герои ещё низкого уровня).'}}
  if(res.kind!=='empty'&&res.kind!=='trap')res.coins=coins(cont,lvl);
  else if(res.kind==='trap'&&V.rnd(2)===2)res.coins=coins(cont,lvl);
  return res}

/* ---------- текст результата ---------- */
const coinTxt=c=>[c.gp?c.gp+' зм':'',c.sp?c.sp+' см':'',c.cp?c.cp+' мм':''].filter(Boolean).join(', ');
const itemTxt=it=>`${it.name}${it.qty>1?' ×'+it.qty:''}`;
function summary(r){const parts=[...r.items.map(itemTxt)];const c=coinTxt(r.coins);if(c)parts.push(c);return parts.join('; ')}

/* ---------- состояние вкладки ---------- */
let loc=null,cont=null,lvlSel='auto',cur=null,giveTo='',hist=[];
function curLoc(){if(loc)return loc;return MAP_LOC[V.st().map]||'town'}
function doSearch(){const L=curLoc();const C=cont&&LOC_CONTS[L].includes(cont)?cont:LOC_CONTS[L][0];const lvl=lvlSel==='auto'?avgLevel():Number(lvlSel);
  cur=search(L,C,lvl);hist.unshift(cur);hist=hist.slice(0,10);V.renderPane()}
function announce(secret){if(!cur)return;const s=summary(cur);
  V.post({kind:'sys',text:`💰 ${CONTS[cur.cont]} (${LOCS[cur.loc].replace(/ \(.+\)/,'')}): ${s||'ничего ценного'}${cur.kind==='trap'?' · ⚠ '+cur.note:cur.note&&cur.kind!=='theme'?' · '+cur.note:''}`},secret);
  V.toast(secret?'Записано в скрытый журнал':'Объявлено всем')}
async function give(){if(!cur||!giveTo)return V.toast('Выберите, кому отдать');const t=V.S.tokens[giveTo];if(!t)return;
  const c=V.S.chars[giveTo]||{};const inv=(Array.isArray(c.inv)?c.inv:[]).map(x=>[...x]);
  for(const it of cur.items){const ex=inv.find(x=>x[0]===it.name);if(ex)ex[1]=(Number(ex[1])||0)+it.qty;else inv.push([it.name,it.qty,it.w])}
  const next={...c,inv,gp:(Number(c.gp)||0)+cur.coins.gp,sp:(Number(c.sp)||0)+cur.coins.sp,cp:(Number(c.cp)||0)+cur.coins.cp};
  await V.store.set('chars/'+giveTo,next);
  await V.post({kind:'sys',text:`🎒 ${t.name} получает: ${summary(cur)||'ничего'}`});
  V.toast('Добыча у '+t.name);cur.given=t.name;V.renderPane()}

/* ---------- стили ---------- */
const st=document.createElement('style');st.textContent=`
.lt-row{display:flex;flex-wrap:wrap;gap:6px;margin:6px 0}
.lt-chip{border:1px solid var(--line);background:var(--panel2);border-radius:999px;padding:6px 11px;cursor:pointer;font-size:14px;color:var(--ink)}
.lt-chip[aria-pressed="true"]{border-color:var(--brass);background:#231d10;color:var(--brass)}
.lt-go{width:100%;padding:12px;font-size:17px;margin:10px 0}
.lt-card{border:1px solid rgba(217,179,108,.5);border-radius:12px;padding:12px;background:linear-gradient(180deg,#1d1a12,#141210)}
.lt-dice{font-family:var(--f-mono);font-size:12px;color:var(--muted)}
.lt-note{font-size:14px;margin:6px 0}
.lt-note.trap{color:var(--danger)} .lt-note.empty{color:var(--muted)}
.lt-items{width:100%;border-collapse:collapse;margin:6px 0}
.lt-items td{padding:4px 2px;border-bottom:1px solid var(--line);font-size:14px;vertical-align:top}
.lt-items td.n{font-family:var(--f-mono);font-size:12px;color:var(--muted);white-space:nowrap;text-align:right}
.lt-items tr.m td:first-child{color:#c9a7ff}
.lt-coins{font-family:var(--f-mono);color:var(--brass);margin:6px 0}
.lt-hist{font-size:13px;color:var(--muted);padding:4px 0;border-bottom:1px solid var(--line)}
@media (max-width:600px){.lt-chip{min-height:40px;min-width:40px}.lt-intro{display:none}.lt-items td{font-size:13px}}
`;document.head.append(st);
if(!document.getElementById('vacc-css')){const s=document.createElement('style');s.id='vacc-css';s.textContent=`
details.vacc{border:1px solid var(--line,#243235);border-radius:10px;background:var(--panel2,#162022);margin:8px 0}
details.vacc>summary{list-style:none;cursor:pointer;display:flex;align-items:center;gap:8px;min-height:42px;padding:0 12px}
details.vacc>summary::-webkit-details-marker{display:none}
details.vacc>summary::after{content:'▸';margin-left:auto;color:var(--muted,#8e9e9b);transition:transform .15s}
details.vacc[open]>summary::after{transform:rotate(90deg)}
details.vacc>summary h3{margin:0;font-size:17px}
details.vacc>.vacc-b{padding:0 12px 10px;overflow-x:hidden}
@media (max-width:600px){details.vacc button{min-height:40px}}
`;document.head.append(s)}
const accordion=(key,title,kids)=>{let open=false;try{open=localStorage.getItem('vtt-acc-'+key)==='1'}catch(e){}const d=h('details',{class:'vacc'},h('summary',{},h('h3',{},title)),h('div',{class:'vacc-b'},...kids.filter(Boolean)));d.open=open;d.ontoggle=()=>{try{localStorage.setItem('vtt-acc-'+key,d.open?'1':'0')}catch(e){}};return d};

/* ---------- вкладка ---------- */
function render(){const L=curLoc();const conts=LOC_CONTS[L];if(!cont||!conts.includes(cont))cont=conts[0];const out=[h('h3',{},'Добыча')];
  out.push(h('p',{class:'small muted lt-intro'},'Что нашли герои: бросок по таблице контейнера + монеты по уровню. Таблицы тематические для каждой локации.'));
  const ls=h('select',{'aria-label':'Локация',style:'width:100%'},...Object.entries(LOCS).map(([k,n])=>h('option',{value:k,selected:k===L},n+(MAP_LOC[V.st().map]===k?' · текущая карта':''))));
  ls.onchange=()=>{loc=ls.value;cont=null;cur=null;V.renderPane()};out.push(h('label',{class:'f'},'Локация',ls));
  out.push(h('div',{class:'small muted',style:'margin-top:8px'},'Что обыскивают'),h('div',{class:'lt-row'},...conts.map(k=>h('button',{type:'button',class:'lt-chip','aria-pressed':String(k===cont),onclick:()=>{cont=k;V.renderPane()}},CONTS[k]))));
  const lvl=avgLevel();out.push(h('div',{class:'small muted'},'Уровень героев'),h('div',{class:'lt-row'},h('button',{type:'button',class:'lt-chip','aria-pressed':String(lvlSel==='auto'),onclick:()=>{lvlSel='auto';V.renderPane()}},`Авто (${lvl})`),
    ...[2,3,4,5,6,7,8].map(n=>h('button',{type:'button',class:'lt-chip','aria-pressed':String(String(n)===String(lvlSel)),onclick:()=>{lvlSel=String(n);V.renderPane()}},String(n)))));
  out.push(h('button',{type:'button',class:'btn pri lt-go',onclick:doSearch},'🎲 Обыскать'));
  if(cur){const r=cur;const kids=[h('div',{class:'row',style:'justify-content:space-between'},h('b',{},`${CONTS[r.cont]} · ${LOCS[r.loc].replace(/ \(.+\)/,'')}`),h('span',{class:'lt-dice'},r.dice.join(' · ')))];
    if(r.note)kids.push(h('div',{class:'lt-note '+(r.kind==='trap'?'trap':r.kind==='empty'?'empty':'')},(r.kind==='trap'?'⚠ ':'')+r.note));
    if(r.items.length)kids.push(h('table',{class:'lt-items'},...r.items.map(it=>h('tr',{class:it.magic?'m':''},h('td',{},(it.magic?'✨ ':'')+it.name+(it.qty>1?' ×'+it.qty:'')),h('td',{class:'n'},(it.w?Math.round(it.w*it.qty*10)/10+' фнт':'—')),h('td',{class:'n'},it.price)))));
    const c=coinTxt(r.coins);if(c)kids.push(h('div',{class:'lt-coins'},'🪙 '+c));
    if(!r.items.length&&!c&&r.kind!=='trap')kids.push(h('div',{class:'lt-note empty'},'Ничего ценного.'));
    const heroes=V.tokList().filter(t=>t.kind==='pc'||t.kind==='npc');
    const sel=h('select',{'aria-label':'Кому отдать',style:'flex:1;min-width:120px'},h('option',{value:''},'Отдать герою…'),...heroes.map(t=>h('option',{value:t.id,selected:t.id===giveTo},t.name)));sel.onchange=()=>{giveTo=sel.value};
    kids.push(h('div',{class:'lt-row'},h('button',{type:'button',class:'btn sm pri',onclick:()=>announce(false)},'📣 Объявить всем'),h('button',{type:'button',class:'btn sm',onclick:()=>announce(true)},'🔒 Скрыто'),h('button',{type:'button',class:'btn sm',onclick:doSearch},'🔄 Перебросить')),
      h('div',{class:'lt-row'},sel,h('button',{type:'button',class:'btn sm pri',disabled:!heroes.length||(r.items.length===0&&!c),onclick:give},'🎒 Отдать')));
    if(r.given)kids.push(h('div',{class:'small muted'},'Отдано: '+r.given));
    out.push(h('div',{class:'lt-card'},...kids))}
  if(hist.length>1)out.push(accordion('loot-hist','Последние броски',hist.slice(1).map(r=>h('div',{class:'lt-hist'},`${new Date(r.ts).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})} · ${CONTS[r.cont]} (${LOCS[r.loc].replace(/ \(.+\)/,'')}): ${summary(r)||(r.kind==='trap'?'неприятность':'пусто')}`))))
  return out}

V.addTab({id:'gmloot',label:'Добыча',gm:true,render});
window.__loot={search,T,THEME,LOCS,LOC_CONTS};
})();
