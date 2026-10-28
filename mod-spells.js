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

async function cast(t,c,spell,slot,targetId,ab,dc,atk){const sp=c.spells||{};const tg=targetId&&V.S.tokens[targetId];const heroLvl=Number(c.lvl)||1;
  if(spell.lvl>0&&!(spell.ritual&&slot==='ritual')){if(freeSlots(sp,slot)<=0)return V.toast('Нет свободной ячейки этого круга.');save(t,c,{used:{...(sp.used||{}),[slot]:Number((sp.used||{})[slot]||0)+1}})}
  const lvlTxt=spell.lvl===0?'заговор':slot==='ritual'?'ритуал':`ячейка ${slot} круга`;
  const head=`✨ ${t.name}: «${spell.name}» (${lvlTxt})${tg?' → '+tg.name:''}`;
  const ns=slot==='ritual'?spell.lvl:Number(slot)||spell.lvl;
  if(spell.conc){const cond=(t.cond||[]).filter(x=>x!=='Концентрация');if((t.cond||[]).includes('Концентрация'))V.post({kind:'sys',text:`${t.name} теряет прежнюю концентрацию`});await V.store.update('tokens/'+t.id,{cond:[...cond,'Концентрация'],concOn:spell.name})}
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
      body.append(h('div',{class:'sp-cast'},opts.length?h('div',{class:'sp-row'},sl,tg,h('button',{class:'btn pri sm',type:'button',onclick:()=>cast(t,c,spell,sl.value==='ritual'?'ritual':Number(sl.value),tg.value,ctx.ab,ctx.dc,ctx.atk)},'✨ Сотворить')):h('div',{class:'sp-meta'},'Нет свободных ячеек — нужен отдых.')))}
    kids.push(body)}
  return h('div',{class:'sp-item'},...kids)}

function rest(t,c,kind){const sp=c.spells||{};const ck=clsKeyOf(c);
  if(kind==='long'){save(t,c,{used:{}});V.post({kind:'sys',text:`${t.name}: долгий отдых — все ячейки восстановлены`});return}
  if(sp.pact||ck==='warlock'){save(t,c,{used:{}});V.post({kind:'sys',text:`${t.name}: короткий отдых — ячейки договора восстановлены`})}}
window.addEventListener('vtt-rest',e=>{const d=e.detail||{};const t=V.S.tokens[d.tokenId];const c=t&&V.S.chars[t.id];if(t&&c&&c.spells)rest(t,c,d.kind==='long'?'long':'short')});

V.addHeroSection((t,c)=>{if(!t||!c)return null;const ck=clsKeyOf(c);if(!ck&&!c.spells)return null;
  const sp=c.spells||{};c.spells=sp;const ab=CAST_AB[ck]||sp.ab||'int';const prof=Number(c.prof)||2;const dc=8+prof+md(c[ab]),atk=prof+md(c[ab]);
  const gm=V.isGM(),mine=gm||t.owner===V.myId,canCast=mine&&!V.readOnly;
  const out=[h('h3',{},'Магия')];
  out.push(h('div',{class:'sp-row sp-stat'},`Характеристика: ${ABK[ab]} · СЛ спасброска ${dc} · атака заклинанием ${sg(atk)}`));
  if(!spells().length){out.push(h('p',{class:'small muted'},'Данные заклинаний загружаются…'));return[h('div',{class:'sp-box'},...out)]}
  // ячейки
  const lv=Object.keys(sp.slots||{}).map(Number).filter(l=>Number(sp.slots[l])>0).sort((a,b)=>a-b);
  if(lv.length)out.push(h('div',{class:'sp-slots'},...lv.map(l=>h('span',{class:'sp-slot'},`${l}:`,...Array.from({length:Number(sp.slots[l])},(_,i)=>{const used=i<Number((sp.used||{})[l]||0);
    return h('button',{type:'button',class:'sp-pip'+(used?' used':''),'aria-label':`Ячейка ${l} круга ${used?'потрачена':'свободна'}`,disabled:!canCast,onclick:()=>{const u=Number((sp.used||{})[l]||0);save(t,c,{used:{...(sp.used||{}),[l]:used?u-1:u+1}})}})})))));
  if(gm){const inp=h('input',{type:'text',value:lv.map(l=>`${l}:${sp.slots[l]}`).join(' '),placeholder:'1:4 2:3','aria-label':'Ячейки'});
    out.push(h('div',{class:'sp-row'},h('span',{class:'small muted'},'Ячейки (Мастер):'),inp,h('button',{class:'btn sm',type:'button',onclick:()=>{const s={};for(const m of inp.value.matchAll(/(\d)\s*:\s*(\d+)/g))s[m[1]]=Number(m[2]);save(t,c,{slots:s})}},'OK')))}
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
  return[h('div',{class:'sp-box'},...out)]});
function freeMaxLevel(sp){return Math.max(0,...Object.keys(sp.slots||{}).map(Number).filter(l=>Number(sp.slots[l])>0))}
})();
