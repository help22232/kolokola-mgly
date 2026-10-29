// Раздел «Магия» в листе героя: характеристика заклинаний, ячейки, подготовка, карточки и сотворение (Книга игрока 2014)
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
// данные заклинаний пишут spells-a.js и spells-b.js; подгружаем их сами
if(!window.SPELLS||!window.SPELLS.length)for(const src of['spells-a.js','spells-b.js']){if(document.querySelector(`script[src="${src}"]`))continue;const s=document.createElement('script');s.src=src;s.onload=()=>V.renderPane();s.onerror=()=>{};document.body.append(s)}
let tries=0;(function wait(){if(window.SPELLS&&window.SPELLS.length){V.renderPane();return}if(++tries<80)setTimeout(wait,250)})();

const st=document.createElement('style');st.textContent=`
.sp-box{border:1px solid var(--line);border-radius:10px;padding:10px;background:var(--panel2);margin:8px 0}
.sp-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap}
.sp-stat{font-family:var(--f-mono);font-size:13px;color:var(--sea)}
.sp-slots{display:flex;gap:10px;flex-wrap:wrap;margin:6px 0}
.sp-slot{display:flex;gap:3px;align-items:center;font-size:12px;color:var(--muted)}
.sp-pip{width:14px;height:14px;border-radius:50%;border:1px solid var(--brass);background:var(--brass);cursor:pointer;padding:0}
.sp-pip.used{background:transparent}
@media (max-width:600px){.sp-pip{width:24px;height:24px}.sp-slots{gap:12px}.sp-head{min-height:40px}}
.sp-lvl{font-family:var(--f-mono);font-size:11px;color:var(--muted);margin:10px 0 2px;letter-spacing:.06em;text-transform:uppercase}
.sp-item{border:1px solid var(--line);border-radius:8px;margin:4px 0;background:#0c1213}
.sp-head{display:flex;justify-content:space-between;align-items:center;gap:6px;padding:7px 9px;cursor:pointer}
.sp-head b{font-weight:500}
.sp-tags{font-size:11px;color:var(--muted)}
.sp-body{padding:0 9px 9px;font-size:14px}
.sp-body .sp-meta{font-size:12px;color:var(--muted);margin:4px 0}
.sp-body p{margin:6px 0;white-space:pre-wrap}
.sp-cast{border-top:1px solid var(--line);margin-top:8px;padding-top:8px}
.sp-prep{accent-color:var(--brass);width:18px;height:18px}
`;document.head.append(st);

const ABK={str:'СИЛ',dex:'ЛОВ',con:'ТЕЛ',int:'ИНТ',wis:'МДР',cha:'ХАР'};
const CAST_AB={wizard:'int',cleric:'wis',druid:'wis',ranger:'wis',bard:'cha',sorcerer:'cha',warlock:'cha',paladin:'cha'};
const PREP={cleric:1,druid:1,paladin:.5,wizard:1};
const RU_CLS={wizard:'волшебник',cleric:'жрец',druid:'друид',ranger:'следопыт',bard:'бард',sorcerer:'чародей',warlock:'колдун',paladin:'паладин'};
const norm=s=>String(s||'').toLowerCase().replace(/ё/g,'е').replace(/[«»"']/g,'').trim();
const md=v=>Math.floor((Number(v||10)-10)/2);
const sg=n=>(n>=0?'+':'')+n;
const spells=()=>window.SPELLS||[];
const byName=n=>{const k=norm(n);return spells().find(s=>norm(s.name)===k||[].concat(s.aka||[]).some(a=>norm(a)===k))||null};
function clsKeyOf(c){if(c.clsKey&&CAST_AB[c.clsKey])return c.clsKey;const t=norm(c.cls);for(const [k,ru] of Object.entries(RU_CLS))if(t.includes(ru))return k;return c.clsKey||null}
const hasClass=(s,k)=>(s.classes||[]).some(x=>{const n=norm(x);return n===k||n.includes(RU_CLS[k]||'#')});
const open=new Set();let castFor=null,prepMode=false;

function save(t,c,spPatch){V.store.set('chars/'+t.id,{...c,spells:{...(c.spells||{}),...spPatch}})}
function freeSlots(sp,l){const max=Number((sp.slots||{})[l]||0),used=Number((sp.used||{})[l]||0);return Math.max(0,max-used)}

// урон с учётом повышения круга и роста заговоров
function scaledDice(base,spell,slot,heroLvl){if(!base)return'';let d=String(base).replace(/к/g,'d');
  if(spell.lvl===0){const tier=heroLvl>=17?4:heroLvl>=11?3:heroLvl>=5?2:1;if(tier>1)d=d.replace(/(\d*)d(\d+)/,(m,n,f)=>`${(Number(n)||1)*tier}d${f}`)}
  else if(slot>spell.lvl){const per=(String(spell.upcast||spell.higher||'').replace(/к/g,'d').match(/(\d+)d(\d+)/));if(per){const k=slot-spell.lvl;d=d.replace(/(\d*)d(\d+)/,(m,n,f)=>f===per[2]?`${(Number(n)||1)+Number(per[1])*k}d${f}`:m)}}
  return d}

// трата ячейки и концентрация — общие для обычного сотворения и для размещения области
async function pay(t,c,spell,slot){const sp=c.spells||{};
  if(spell.lvl>0&&!(spell.ritual&&slot==='ritual')){if(freeSlots(sp,slot)<=0){V.toast('Нет свободной ячейки этого круга.');return false}save(t,c,{used:{...(sp.used||{}),[slot]:Number((sp.used||{})[slot]||0)+1}})}
  if(spell.conc){const cond=(t.cond||[]).filter(x=>x!=='Концентрация');if((t.cond||[]).includes('Концентрация'))V.post({kind:'sys',text:`${t.name} теряет прежнюю концентрацию`});await V.store.update('tokens/'+t.id,{cond:[...cond,'Концентрация'],concOn:spell.name})}
  return true}
const lvlTxtOf=(spell,slot)=>spell.lvl===0?'заговор':slot==='ritual'?'ритуал':`ячейка ${slot} круга`;
async function cast(t,c,spell,slot,targetId,ab,dc,atk){const tg=targetId&&V.S.tokens[targetId];const heroLvl=Number(c.lvl)||1;
  if(!await pay(t,c,spell,slot))return;
  const lvlTxt=lvlTxtOf(spell,slot);
  const head=`✨ ${t.name}: «${spell.name}» (${lvlTxt})${tg?' → '+tg.name:''}`;
  const ns=slot==='ritual'?spell.lvl:Number(slot)||spell.lvl;
  if(spell.attack){const cm=V.condMode?V.condMode(t,tg||null,spell.attack==='ranged'):{mode:null,why:''};const r=V.roll('1d20'+sg(atk),cm.mode);const crit=r.nat===20,miss=r.nat===1;let dd=scaledDice(spell.dmg,spell,ns,heroLvl);if(crit)dd=dd.replace(/(\d*)d(\d+)/g,(m,n,f)=>`${(Number(n)||1)*2}d${f}`);
    const dr=dd?V.roll(dd+(spell.dmgMod?sg(md(c[ab])):'')):null;
    return V.post({kind:'roll',text:`${head}${crit?' · КРИТ!':miss?' · промах (1)':''}`,total:r.total,det:`${cm.why?'['+cm.why+'] ':''}атака заклинанием ${r.det}${dr?` · урон ${dr.total} ${spell.dmgType||''} (${dr.det})`:''}`,nat:r.nat,target:tg?tg.id:null,dmg:dr&&!miss?dr.total:null})}
  if(spell.save){const dd=scaledDice(spell.dmg,spell,ns,heroLvl);const dr=dd?V.roll(dd):null;
    return V.post({kind:'roll',text:`${head} · спасбросок ${spell.save} СЛ ${dc}`,total:dr?dr.total:dc,det:dr?`урон ${dr.total} ${spell.dmgType||''} (${dr.det}); при успешном спасброске ${spell.halfOnSave===false?'урона нет':'половина: '+Math.floor(dr.total/2)}`:`цель делает спасбросок ${spell.save} СЛ ${dc}`,target:tg?tg.id:null,dmg:dr?dr.total:null})}
  if(spell.heal){let hd=String(spell.heal).replace(/к/g,'d');const per=String(spell.upcast||spell.higher||'').replace(/к/g,'d').match(/(\d+)d(\d+)/);
    if(per&&ns>spell.lvl)hd=hd.replace(/(\d*)d(\d+)/,(m,n,f)=>`${(Number(n)||1)+Number(per[1])*(ns-spell.lvl)}d${f}`);
    const r=V.roll(hd+(spell.healMod!==false?sg(md(c[ab])):''));const target=tg||t;
    V.post({kind:'roll',text:`${head} · лечение`,total:r.total,det:r.det});if(V.applyHp&&target.kind!=='monster')await V.applyHp(target.id,r.total,'heal');return}
  V.post({kind:'sys',text:`${head}${spell.dur?' · длительность: '+spell.dur:''}`})}

// область заклинания из данных: поле area, скобки в дистанции «На себя (конус 15 фт)» или описание
const SAVE_KEY={'сил':'str','лов':'dex','тел':'con','инт':'int','мдр':'wis','хар':'cha'};
function areaOf(s){if(s.attack)return null;const par=(String(s.range||'').match(/\(([^)]*)\)/)||[])[1]||'';const self=/^на себя/.test(norm(s.range));
  for(const x of [s.area,par,s.save||s.dmg?s.desc:null]){if(!x)continue;const m=norm(x).match(/(?:^|[^а-я])(конус\S*|куб\S*|квадрат\S*|лини\S*|стен\S*|сфер\S*|полусфер\S*|цилиндр\S*|круг\S*|кольц\S*|аур\S*|радиус\S*)\s+(?:радиусом\s+|длиной\s+|до\s+)?(\d+)\s*(?:×\s*\d+\s*)?фт/);
    if(m){const w=m[1];return{kind:/^кон/.test(w)?'cone':/^(куб|квадрат)/.test(w)?'cube':/^(лин|стен)/.test(w)?'line':'sphere',size:Number(m[2]),self}}}
  const m=norm(par).match(/^(\d+)\s*фт$/);return m&&self?{kind:'sphere',size:Number(m[1]),self}:null}
async function placeArea(t,c,spell,slot,ctx){const ar=areaOf(spell);if(!ar)return;if(!V.aoe||!V.aoe.start)return V.toast('Инструмент областей ещё не загрузился.');
  if(V.mapInfo().id!==t.map)return V.toast('Герой не на этой карте.');
  if(!await pay(t,c,spell,slot))return;
  const ns=slot==='ritual'?spell.lvl:Number(slot)||spell.lvl;
  let dice=scaledDice(spell.dmg,spell,ns,Number(c.lvl)||1);
  const extra=String(spell.dmgType||'').replace(/к/g,'d').match(/\+\s*(\d+d\d+)/);if(dice&&extra)dice+='+'+extra[1];// «Град»: 2к8 дробящего + 4к6 холодом
  const sv=spell.save?SAVE_KEY[norm(spell.save).slice(0,3)]||null:null;
  const half=spell.halfOnSave===false?false:spell.halfOnSave===true?true:spell.lvl>0||/половин/.test(norm(spell.desc));
  const eff=spell.save||dice?{dice:dice||'',type:spell.dmgType||'',save:sv,dc:ctx.dc,half,spell:spell.name,caster:t.name}:null;
  V.post({kind:'sys',text:`✨ ${t.name}: «${spell.name}» (${lvlTxtOf(spell,slot)}) — ${{cone:'конус',cube:'куб',line:'линия',sphere:'сфера'}[ar.kind]} ${ar.size} фт`});
  V.aoe.start({kind:ar.kind,size:ar.size,from:ar.self?t.id:null,effect:eff})}

/* ---------- свет от заклинаний ---------- */
// r — яркий свет, фт; dim — тусклый ДОБАВОЧНО к яркому (нет поля — тусклый = r). mode: self — на свою фишку (поле light),
// place — касанием карты (shapes/<id> kind:'light'), choose — выбор «на себя» или «на карту». Радиусы — по Книге игрока 2014.
const LIGHT={
  'light':{mode:'choose',r:20,range:5},                 // Свет: предмет, яркий 20 + тусклый 20, 1 час
  'continual-flame':{mode:'choose',r:20,range:5},       // Вечный огонь: как факел, пока не рассеют
  'daylight':{mode:'choose',r:60,dim:60,range:60,day:1}, // Дневной свет: 60 + 60, гасит магическую тьму 3 круга и ниже
  'produce-flame':{mode:'self',r:10},                   // Сотворение пламени: 10 + 10 в ладони
  'flame-blade':{mode:'self',r:10},                     // Пылающий клинок: 10 + 10, концентрация
  'fire-shield':{mode:'self',r:10},                     // Огненный щит: 10 + 10
  'dancing-lights':{mode:'place',n:4,r:0,dim:10,range:120}, // Танцующие огоньки: до 4, тусклый 10, концентрация
  'flaming-sphere':{mode:'place',n:1,r:20,range:60},     // Пылающий шар: 20 + 20, концентрация
  'moonbeam':{mode:'place',n:1,r:0,dim:5,range:120}};    // Лунный луч: тусклый свет в цилиндре 5 фт, концентрация
const lightOf=s=>s&&LIGHT[s.id]||null;
const lightTxt=s=>`${s.r?`ярко ${s.r} фт, `:''}тускло ${s.dim!=null?s.dim:s.r} фт`;
let lights=[],lightKey='';
V.watch('shapes',a=>{lights=a.filter(s=>s.kind==='light');const k=lights.map(s=>s.id).sort().join();V.requestDraw();if(k!==lightKey){lightKey=k;V.renderPane()}checkConc()});
const canWriteTok=t=>!!t&&!V.readOnly&&(V.isOwner||t.owner===V.myId);
const canDelLight=s=>!V.readOnly&&(V.isOwner||s.by===V.myId);
const concOk=(t,name)=>!!t&&(t.cond||[]).includes('Концентрация')&&(!t.concOn||t.concOn===name);
// концентрация потеряна (или начата другая) — огоньки концентрации гаснут, свет на фишке возвращается к прежнему
const dying=new Set();
function checkConc(){const T=V.S.tokens||{};
  for(const s of lights)if(s.conc&&canDelLight(s)&&!dying.has(s.id)&&!concOk(T[s.caster],s.label)){dying.add(s.id);V.store.del('shapes/'+s.id).catch(()=>{}).finally(()=>dying.delete(s.id))}
  for(const t of Object.values(T)){const c=V.S.chars&&V.S.chars[t.id],sl=c&&c.spellLight;if(sl&&sl.conc&&canWriteTok(t)&&!dying.has('t'+t.id)&&!concOk(t,sl.spell)){dying.add('t'+t.id);lightOff(t,true).finally(()=>dying.delete('t'+t.id))}}}
V.watch('tokens',()=>setTimeout(checkConc,0));
async function lightOn(t,spell,L){const c=V.S.chars[t.id]||{};const prev=c.spellLight?Number(c.lightPrev)||0:Number(t.light)||0;
  await V.store.update('chars/'+t.id,{lightPrev:prev,spellLight:{spell:spell.name,r:L.r,conc:!!spell.conc,ts:Date.now()}});await V.store.update('tokens/'+t.id,{light:L.r})}
async function lightOff(t,auto){const c=V.S.chars[t.id]||{};if(!c.spellLight)return;const prev=Number(c.lightPrev)||0;
  await V.store.update('tokens/'+t.id,{light:prev});await V.store.update('chars/'+t.id,{lightPrev:null,spellLight:null});
  V.post({kind:'sys',text:`${t.name}: «${c.spellLight.spell}» гаснет${auto?' — концентрация прервана':''}`})}
// размещение огоньков касанием карты
const place={L:null};let lbar=null;
const lcss=document.createElement('style');lcss.textContent=`
.spl-bar{position:fixed;z-index:6;background:var(--panel,#111819);border:1px solid var(--brass,#d9b36c);border-radius:10px;padding:8px 10px;display:flex;flex-wrap:wrap;gap:6px;align-items:center;box-shadow:0 6px 20px rgba(0,0,0,.5);font-size:13px;max-width:calc(100vw - 16px);box-sizing:border-box}
.spl-bar span{flex:1 1 160px;min-width:0}
.spl-pop{position:fixed;z-index:8;background:var(--panel,#111819);border:1px solid var(--brass,#d9b36c);border-radius:10px;padding:10px;display:grid;gap:8px;box-shadow:0 8px 24px rgba(0,0,0,.6);font-size:13px;width:min(240px,calc(100vw - 20px));box-sizing:border-box}
.sp-fx{display:flex;align-items:center;gap:6px;font-size:13px;padding:4px 0;border-top:1px solid var(--line)}
.sp-fx span{flex:1;min-width:0;overflow-wrap:anywhere}
@media (max-width:600px){.spl-bar .btn,.spl-pop .btn,.sp-fx .btn{min-height:40px;min-width:40px}}`;document.head.append(lcss);
const cvRect=()=>{const c=document.getElementById('cv');return c?c.getBoundingClientRect():{left:0,top:0,right:innerWidth,width:innerWidth,height:innerHeight}};
function closeBar(){if(lbar){lbar.remove();lbar=null}}
function showBar(){closeBar();if(!place.L)return;const r=cvRect(),nw=innerWidth<600,left=r.left+(nw?54:56);
  lbar=h('div',{class:'spl-bar',role:'region','aria-label':'Размещение света'},h('span',{},`💡 «${place.spell}»: коснитесь карты в пределах ${place.L.range} фт${place.left>1?` · осталось ${place.left}`:''}`),
    h('button',{class:'btn pri sm',type:'button',onclick:()=>V.setTool('select')},'Готово'));
  lbar.style.left=left+'px';lbar.style.top=(r.top+8)+'px';lbar.style.width=Math.max(200,Math.min(380,r.right-left-(nw?54:12)))+'px';(V.overlay()||document.body).append(lbar)}
V.addTool({id:'splight',icon:'💡',title:'Свет заклинания',
  down(wx,wy,e){place.down=e?[e.clientX,e.clientY]:null},
  up(wx,wy,e){if(e&&place.down&&Math.hypot(e.clientX-place.down[0],e.clientY-place.down[1])>8)return;putLight(wx,wy)},
  cancel(){place.L=null;closeBar()}});
{const b=document.querySelector('#tools [data-tool="splight"]');if(b)b.style.display='none'}// кнопка не нужна: инструмент включается из раздела «Магия»
async function putLight(wx,wy){const L=place.L;if(!L||V.readOnly)return;const m=V.mapInfo(),t=V.S.tokens[place.t];let x=wx,y=wy;
  if(m.grid){x=(Math.floor(wx/m.grid)+.5)*m.grid;y=(Math.floor(wy/m.grid)+.5)*m.grid}
  if(t&&t.map===m.id&&L.range){const ft=m.grid?V.gridFt(m,t.x,t.y,x,y):Math.hypot(x-t.x,y-t.y)/V.ftPx(m);if(ft>L.range+2.5)return V.toast(`Слишком далеко: ${Math.round(ft)} фт, можно до ${L.range} фт от ${t.name}.`)}
  const s={kind:'light',map:m.id,x:Math.round(x),y:Math.round(y),r:L.r,label:place.spell,by:V.myId,who:V.whoAmI(),caster:place.t,conc:!!place.conc,ts:Date.now()};
  if(L.dim!=null)s.dim=L.dim;if(L.day)s.day=true;
  await V.store.set('shapes/'+V.store.newId('shapes'),s);place.left--;if(place.left<=0)V.setTool('select');else showBar()}
async function castLight(t,c,spell,slot,where){const L=lightOf(spell);if(!L)return;
  if(where!=='self'&&V.mapInfo().id!==t.map)return V.toast('Герой не на этой карте.');
  if(!await pay(t,c,spell,slot))return;
  if(spell.conc)for(const s of lights.filter(s=>s.caster===t.id&&s.label===spell.name&&canDelLight(s)))await V.store.del('shapes/'+s.id);// повторное сотворение заменяет прежнее
  V.post({kind:'sys',text:`💡 ${t.name}: «${spell.name}» (${lvlTxtOf(spell,slot)}) — ${lightTxt(L)}${where==='self'?' на себе':''}`});
  if(where==='self')return lightOn(t,spell,L);
  V.setTool('splight');place.L={...L,range:L.range||5};place.spell=spell.name;place.conc=!!spell.conc;place.t=t.id;place.left=L.n||1;// setTool вызывает cancel — заполняем ещё раз
  try{V.centerOn(t.x,t.y)}catch(e){}showBar()}
// значок огонька на карте; касание значка (в режиме выбора) — меню «Погасить» для владельца и Мастера
V.onDraw('top',(g,m,cam)=>{const z=cam.z;for(const s of lights){if(s.map!==m.id)continue;
  g.beginPath();g.arc(s.x,s.y,9/z,0,7);g.fillStyle='rgba(0,0,0,.55)';g.fill();g.beginPath();g.arc(s.x,s.y,5/z,0,7);g.fillStyle=s.day?'#fff3c4':'#ffd36a';g.fill();g.lineWidth=1.5/z;g.strokeStyle='#fff';g.stroke()}});
let lpop=null;const closePop=()=>{if(lpop){lpop.remove();lpop=null}};
function lightAt(cx,cy){const r=cvRect(),c=V.cam,id=V.st().map;return lights.slice().reverse().find(s=>s.map===id&&Math.hypot(r.left+s.x*c.z+c.ox-cx,r.top+s.y*c.z+c.oy-cy)<=14)}
addEventListener('pointerdown',e=>{if(lpop&&!lpop.contains(e.target))closePop();const cv=document.getElementById('cv');if(e.target!==cv||(V.tool!=='select'&&V.tool!=='splight'))return;
  const s=lightAt(e.clientX,e.clientY);if(!s||!canDelLight(s))return;e.stopPropagation();e.preventDefault();
  lpop=h('div',{class:'spl-pop',role:'dialog','aria-label':'Источник света'},h('b',{},`💡 «${s.label||'Свет'}»`),h('div',{class:'small muted'},`${lightTxt(s)} · ${s.who||''}${s.conc?' · концентрация':''}`),
    h('div',{class:'sp-row'},h('button',{class:'btn sm bad',type:'button',onclick:async()=>{closePop();await V.store.del('shapes/'+s.id)}},'Погасить'),h('button',{class:'btn sm',type:'button',onclick:closePop},'Закрыть')));
  lpop.style.left=Math.min(Math.max(8,e.clientX+10),innerWidth-250)+'px';lpop.style.top=Math.min(Math.max(8,e.clientY+10),innerHeight-140)+'px';document.body.append(lpop)},true);
// «Активные эффекты» в разделе «Магия»
function activeFx(t,c,canCast){const sl=c.spellLight,mine=lights.filter(s=>s.caster===t.id);if(!sl&&!mine.length)return[];
  const out=[h('div',{class:'sp-lvl'},'Активные эффекты')];
  if(sl)out.push(h('div',{class:'sp-fx'},h('span',{},`💡 «${sl.spell}»: свет ${sl.r} фт на ${t.name}${sl.conc?' · К':''}`),canCast?h('button',{class:'btn sm',type:'button',onclick:()=>lightOff(t)},'Погасить свет'):null));
  for(const s of mine)out.push(h('div',{class:'sp-fx'},h('span',{},`✦ «${s.label}»: ${lightTxt(s)}${s.conc?' · К':''}`),canCast&&canDelLight(s)?h('button',{class:'btn sm',type:'button','aria-label':'Погасить','title':'Погасить',onclick:()=>V.store.del('shapes/'+s.id)},'✕'):null));
  if(canCast&&mine.length>1)out.push(h('div',{class:'sp-row'},h('button',{class:'btn sm',type:'button',onclick:async()=>{for(const s of mine)if(canDelLight(s))await V.store.del('shapes/'+s.id)}},'Погасить все огоньки')));
  return out}

function spellCard(t,c,spell,ctx){const k=spell.name;const isOpen=open.has(t.id+k);
  const tags=[spell.lvl===0?'заговор':spell.lvl+' круг',spell.school,spell.conc?'К':null,spell.ritual?'Р':null].filter(Boolean).join(' · ');
  const head=h('div',{class:'sp-head',role:'button',tabindex:0,onclick:()=>{isOpen?open.delete(t.id+k):open.add(t.id+k);V.renderPane()}},h('b',{},spell.name),h('span',{class:'sp-tags'},tags));
  const kids=[head];
  if(ctx.prep&&spell.lvl>0){const on=(c.spells.prepared||[]).some(n=>norm(n)===norm(spell.name));
    head.prepend(h('input',{type:'checkbox',class:'sp-prep',checked:on,'aria-label':'Подготовлено',onclick:e=>{e.stopPropagation();const cur=c.spells.prepared||[];
      if(!on&&cur.length>=ctx.maxPrep)return(e.preventDefault(),V.toast(`Можно подготовить не больше ${ctx.maxPrep}.`));save(t,c,{prepared:on?cur.filter(n=>norm(n)!==norm(spell.name)):[...cur,spell.name]})}}))}
  if(isOpen){const meta=[['Время',spell.time],['Дистанция',spell.range],['Компоненты',spell.comp],['Длительность',(spell.conc?'Концентрация, ':'')+(spell.dur||'')],spell.area?['Область',spell.area]:null,spell.save?['Спасбросок',spell.save]:null,spell.attack?['Атака',spell.attack==='melee'?'рукопашная':'дальнобойная']:null,spell.dmg?['Урон',`${spell.dmg} ${spell.dmgType||''}`]:null,spell.heal?['Лечение',spell.heal+(spell.healMod!==false?' + мод':'')]:null].filter(Boolean);
    const body=h('div',{class:'sp-body'},h('div',{class:'sp-meta'},meta.map(([a,b])=>`${a}: ${b}`).join(' · ')),h('p',{},spell.desc||''),spell.higher?h('p',{class:'sp-meta'},'На больших кругах: '+spell.higher):null);
    if(ctx.canCast){const sp=c.spells||{};const opts=[];
      if(spell.lvl===0)opts.push(['0','без ячейки']);else{for(let l=spell.lvl;l<=9;l++)if(freeSlots(sp,l)>0)opts.push([String(l),`ячейка ${l} круга (свободно ${freeSlots(sp,l)})`]);if(spell.ritual)opts.unshift(['ritual','ритуалом (+10 мин, без ячейки)'])}
      const sl=h('select',{'aria-label':'Ячейка'},...opts.map(([v,n])=>h('option',{value:v},n)));
      const tg=h('select',{'aria-label':'Цель'},h('option',{value:''},'— цель —'),...V.tokList().filter(x=>x.map===V.st().map&&V.canSee(x)).map(x=>h('option',{value:x.id},x.name)));
      body.append(h('div',{class:'sp-cast'},opts.length?h('div',{class:'sp-row'},sl,tg,h('button',{class:'btn pri sm',type:'button',onclick:()=>cast(t,c,spell,sl.value==='ritual'?'ritual':Number(sl.value),tg.value,ctx.ab,ctx.dc,ctx.atk)},'✨ Сотворить'),
        ...(()=>{const L=lightOf(spell);if(!L)return[];const sv=()=>sl.value==='ritual'?'ritual':Number(sl.value);const B=(txt,where)=>h('button',{class:'btn sm',type:'button',onclick:()=>castLight(t,c,spell,sv(),where)},txt);
          return L.mode==='self'?[B('💡 Зажечь на себе','self')]:L.mode==='choose'?[B('💡 На себя (оружие/предмет)','self'),B('📍 На карту','map')]:[B(L.n>1?`📍 Разместить огоньки (до ${L.n})`:'📍 Разместить свет','map')]})(),
        areaOf(spell)?h('button',{class:'btn sm',type:'button',title:'Поставить шаблон на карте и бросить спасброски всем в области',onclick:()=>placeArea(t,c,spell,sl.value==='ritual'?'ritual':Number(sl.value),ctx)},'🎯 Разместить область'):null):h('div',{class:'sp-meta'},'Нет свободных ячеек — нужен отдых.')))}
    kids.push(body)}
  return h('div',{class:'sp-item'},...kids)}

function rest(t,c,kind){const sp=c.spells||{};const ck=clsKeyOf(c);
  if(kind==='long'){save(t,c,{used:{}});V.post({kind:'sys',text:`${t.name}: долгий отдых — все ячейки восстановлены`});return}
  if(sp.pact||ck==='warlock'){save(t,c,{used:{}});V.post({kind:'sys',text:`${t.name}: короткий отдых — ячейки договора восстановлены`})}}
window.addEventListener('vtt-rest',e=>{const d=e.detail||{};const t=V.S.tokens[d.tokenId];const c=t&&V.S.chars[t.id];if(t&&c&&c.spells)rest(t,c,d.kind==='long'?'long':'short')});

V.addHeroSection((t,c)=>{if(!t||!c)return null;
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
const ck=clsKeyOf(c);if(!ck&&!c.spells)return null;
  const sp=c.spells||{};c.spells=sp;const ab=CAST_AB[ck]||sp.ab||'int';const prof=Number(c.prof)||2;const dc=8+prof+md(c[ab]),atk=prof+md(c[ab]);
  const gm=V.isGM(),mine=gm||t.owner===V.myId,canCast=mine&&!V.readOnly;
  const out=[h('h3',{},'Магия')];
  out.push(h('div',{class:'sp-row sp-stat'},`Характеристика: ${ABK[ab]} · СЛ спасброска ${dc} · атака заклинанием ${sg(atk)}`));
  if(!spells().length){out.push(h('p',{class:'small muted'},'Данные заклинаний загружаются…'));return accordion('spells','Магия',[h('div',{class:'sp-box'},...out.slice(1))])}
  // ячейки
  const lv=Object.keys(sp.slots||{}).map(Number).filter(l=>Number(sp.slots[l])>0).sort((a,b)=>a-b);
  if(lv.length)out.push(h('div',{class:'sp-slots'},...lv.map(l=>h('span',{class:'sp-slot'},`${l}:`,...Array.from({length:Number(sp.slots[l])},(_,i)=>{const used=i<Number((sp.used||{})[l]||0);
    return h('button',{type:'button',class:'sp-pip'+(used?' used':''),'aria-label':`Ячейка ${l} круга ${used?'потрачена':'свободна'}`,disabled:!canCast,onclick:()=>{const u=Number((sp.used||{})[l]||0);save(t,c,{used:{...(sp.used||{}),[l]:used?u-1:u+1}})}})})))));
  if(gm){const inp=h('input',{type:'text',value:lv.map(l=>`${l}:${sp.slots[l]}`).join(' '),placeholder:'1:4 2:3','aria-label':'Ячейки'});
    out.push(h('div',{class:'sp-row'},h('span',{class:'small muted'},'Ячейки (Мастер):'),inp,h('button',{class:'btn sm',type:'button',onclick:()=>{const s={};for(const m of inp.value.matchAll(/(\d)\s*:\s*(\d+)/g))s[m[1]]=Number(m[2]);save(t,c,{slots:s})}},'OK')))}
  out.push(...activeFx(t,c,canCast));
  if(canCast)out.push(h('div',{class:'sp-row'},h('button',{class:'btn sm',type:'button',onclick:()=>{window.dispatchEvent(new CustomEvent('vtt-rest',{detail:{kind:'short',tokenId:t.id,from:'spells'}}))}},'Короткий отдых'),h('button',{class:'btn sm',type:'button',onclick:()=>{window.dispatchEvent(new CustomEvent('vtt-rest',{detail:{kind:'long',tokenId:t.id,from:'spells'}}))}},'Долгий отдых')));
  // список
  const cantrips=(sp.cantrips||[]).map(byName).filter(Boolean);const known=(sp.known||[]).map(byName).filter(Boolean);
  const prepK=PREP[ck];let pool=known,maxPrep=0;
  if(prepK){const lvl=Number(c.lvl)||1;maxPrep=Math.max(1,Math.floor(lvl*prepK)+md(c[ab]));
    pool=ck==='wizard'?known:spells().filter(s=>s.lvl>0&&hasClass(s,ck)&&freeMaxLevel(sp)>=s.lvl);
    out.push(h('div',{class:'sp-row'},h('span',{class:'small muted'},`Подготовлено ${(sp.prepared||[]).length} из ${maxPrep}`),canCast?h('button',{class:'btn sm',type:'button',onclick:()=>{prepMode=!prepMode;V.renderPane()}},prepMode?'Готово':'Подготовить на сегодня'):null))}
  const ctx={ab,dc,atk,canCast,prep:prepK&&prepMode,maxPrep};
  if(cantrips.length){out.push(h('div',{class:'sp-lvl'},'Заговоры'),...cantrips.map(s=>spellCard(t,c,s,ctx)))}
  // у подготавливающих классов в обычном режиме видны только подготовленные; в режиме подготовки — весь доступный список
  const isPrep=s=>(sp.prepared||[]).some(n=>norm(n)===norm(s.name));
  const shown=prepK&&!prepMode?pool.filter(isPrep):pool;
  const byLvl={};for(const s of shown)(byLvl[s.lvl]=byLvl[s.lvl]||[]).push(s);
  for(const l of Object.keys(byLvl).sort((a,b)=>a-b))out.push(h('div',{class:'sp-lvl'},`${l} круг`),...byLvl[l].sort((a,b)=>a.name.localeCompare(b.name,'ru')).map(s=>spellCard(t,c,s,ctx)));
  if(!cantrips.length&&!shown.length)out.push(h('p',{class:'small muted'},prepK?'Нажмите «Подготовить на сегодня» и отметьте заклинания.':'Заклинаний в листе нет — их выбирают при создании героя и повышении уровня.'));
  const miss=[...(sp.cantrips||[]),...(sp.known||[])].filter(n=>!byName(n));if(miss.length)out.push(h('p',{class:'small muted'},'Нет описания: '+miss.join(', ')));
  return accordion('spells','Магия',[h('div',{class:'sp-box'},...out.slice(1))])});
function freeMaxLevel(sp){return Math.max(0,...Object.keys(sp.slots||{}).map(Number).filter(l=>Number(sp.slots[l])>0))}
})();
