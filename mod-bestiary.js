/* mod-bestiary.js — «Бестиарий» во вкладке Мастера: полный лист выбранного монстра,
   броски спасбросков и проверок характеристик, поиск по всем существам кампании (данные — bestiary.js). */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
if(!window.BESTIARY&&!document.querySelector('script[src="bestiary.js"]')){const s=document.createElement('script');s.src='bestiary.js';s.onload=()=>V.changed('panel');s.onerror=()=>{};document.head.append(s)}

const AB=[['str','Сил','СИЛ'],['dex','Лов','ЛОВ'],['con','Тел','ТЕЛ'],['int','Инт','ИНТ'],['wis','Мдр','МДР'],['cha','Хар','ХАР']];
const css=document.createElement('style');
css.textContent=`
.bst{border:1px solid rgba(217,179,108,.45);border-radius:10px;background:var(--panel2);padding:10px 12px;margin:8px 0;min-width:0;overflow-wrap:anywhere}
.bst-hd{display:flex;align-items:flex-start;gap:8px}
.bst-hd .bst-nm{font-family:var(--f-display);font-size:21px;color:#d9b36c;line-height:1.15;flex:1;min-width:0}
.bst-ty{font-style:italic;color:var(--muted);font-size:13px;margin:2px 0 6px}
.bst-tag{display:inline-block;font-size:11px;border:1px solid var(--line);border-radius:999px;padding:1px 7px;margin-left:4px;color:var(--muted);font-style:normal}
.bst-rule{height:2px;background:linear-gradient(90deg,#d9b36c,rgba(217,179,108,0));border:0;margin:7px 0}
.bst-kv{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;text-align:center}
.bst-kv div{border:1px solid var(--line);border-radius:8px;padding:4px 2px}
.bst-kv b{display:block;font-size:17px}.bst-kv span{font-size:11px;color:var(--muted)}
.bst-ab{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:6px;margin:4px 0}
.bst-ab .bst-c{border:1px solid var(--line);border-radius:8px;padding:4px;text-align:center;display:grid;gap:3px;min-width:0}
.bst-ab .bst-c>i{font-style:normal;font-size:11px;letter-spacing:.06em;color:#d9b36c}
.bst-ab .bst-c>em{font-style:normal;font-size:15px}
.bst-ab .btn{min-height:40px;padding:2px 4px;font-size:13px;white-space:normal;line-height:1.1}
.bst-ln{font-size:14px;margin:3px 0}.bst-ln b{color:#d9b36c;font-weight:600}
.bst details{border-top:1px solid var(--line);margin-top:6px}
.bst summary{cursor:pointer;min-height:40px;display:flex;align-items:center;font-family:var(--f-display);font-size:16px;color:#d9b36c;list-style:none}
.bst summary::-webkit-details-marker{display:none}
.bst summary::after{content:'▸';margin-left:auto;color:var(--muted);transition:transform .15s}
.bst details[open]>summary::after{transform:rotate(90deg)}
.bst p.bst-it{margin:4px 0 7px;font-size:14px}.bst p.bst-it b{font-style:italic}
.bst-close{min-width:40px;min-height:40px}
.bst-find{display:grid;gap:6px}
.bst-find input{width:100%;min-height:40px}
.bst-list{display:grid;gap:5px;max-height:360px;overflow-y:auto;overflow-x:hidden}
.bst-list button{display:flex;justify-content:space-between;gap:8px;align-items:center;min-height:40px;text-align:left;white-space:normal;width:100%}
.bst-list button small{color:var(--muted);white-space:nowrap}
.bst-list button.on{border-color:rgba(217,179,108,.7);color:#d9b36c}
@media (max-width:600px){.bst-ab{grid-template-columns:repeat(3,minmax(0,1fr))}.bst-hd .bst-nm{font-size:19px}}
`;document.head.append(css);

let view=null,lastSel=null,q='';
const DB=()=>window.BESTIARY||{};
const typeOf=t=>{if(!t||t.kind!=='monster')return null;const g=(V.S.gm||{})[t.id];const k=t.monster||(g&&g.type);if(k&&DB()[k])return k;
  const n=String(t.name||'').replace(/\s*\d+$/,'');return DB()[n]?n:(Object.keys(DB()).find(x=>n&&(x.startsWith(n)||n.startsWith(x)))||null)};
const lst=a=>(a||[]).join(', ');
const line=(k,v)=>v?h('div',{class:'bst-ln'},h('b',{},k+': '),v):null;
const items=a=>(a||[]).map(([n,d])=>h('p',{class:'bst-it'},h('b',{},n+'. '),d));
const fold=(title,arr,open)=>{if(!arr||!arr.length)return null;const d=h('details',{},h('summary',{},title),...arr);d.open=open;return d};

function sheet(key,who,closable){const m=DB()[key];if(!m)return h('p',{class:'small muted'},'Нет данных о существе «'+key+'».');
  const nm=who||key,wide=window.matchMedia('(min-width:601px)').matches;
  const abil=m.object?null:h('div',{class:'bst-ab'},...AB.map(([k,s,S])=>{const md=V.mod(m[k]),sv=(m.saves&&m.saves[k]!=null)?m.saves[k]:md,prof=sv!==md;
    return h('div',{class:'bst-c'},h('i',{},S),h('em',{},`${m[k]} (${V.sgn(md)})`),
      h('button',{class:'btn sm',type:'button',title:`Проверка ${s}: 1d20${V.sgn(md)}`,onclick:()=>V.rollPost(`${nm}: проверка ${s}`,'1d20'+V.sgn(md))},'Пров '+V.sgn(md)),
      h('button',{class:'btn sm'+(prof?' pri':''),type:'button',title:`Спасбросок ${s}: 1d20${V.sgn(sv)}`+(prof?' (владение)':''),onclick:()=>V.rollPost(`${nm}: спасбросок ${s}`,'1d20'+V.sgn(sv))},'Спас '+V.sgn(sv)))}));
  const svText=m.object?'':AB.filter(([k])=>m.saves&&m.saves[k]!==V.mod(m[k])).map(([k,s])=>s+' '+V.sgn(m.saves[k])).join(', ');
  return h('div',{class:'bst'},
    h('div',{class:'bst-hd'},h('div',{class:'bst-nm'},nm,who&&who!==key?h('div',{class:'small muted',style:'font-family:var(--f-body);font-size:13px'},key):null),
      closable?h('button',{class:'btn sm bst-close',type:'button',title:'Закрыть лист','aria-label':'Закрыть лист',onclick:()=>{view=null;V.changed('panel')}},'✕'):null),
    h('div',{class:'bst-ty'},m.type,m.aka?' · '+m.aka:'',m.author?h('span',{class:'bst-tag'},'авторское'):null,m.ally?h('span',{class:'bst-tag'},'союзник'):null),
    h('div',{class:'bst-kv'},h('div',{},h('b',{},m.ac),h('span',{},'КД'+(m.acNote?' · '+m.acNote:''))),
      h('div',{},h('b',{},m.avg),h('span',{},'хиты · '+m.hp)),
      h('div',{},h('b',{},m.cr),h('span',{},'ПО'+(m.xp?' · '+m.xp.toLocaleString('ru-RU')+' оп.':'')))),
    line('Скорость',m.speed),
    h('hr',{class:'bst-rule'}),abil,abil?h('hr',{class:'bst-rule'}):null,
    line('Спасброски',svText),line('Навыки',m.skills),
    line('Уязвимость',lst(m.vuln)),line('Сопротивление',lst(m.resist)),line('Иммунитет к урону',lst(m.immune)),line('Иммунитет к состояниям',lst(m.condImmune)),
    line('Чувства',m.senses),line('Языки',m.languages),
    fold('Особенности',items(m.traits),wide),
    fold('Действия',items(m.actions),wide),
    fold('Реакции',items(m.reactions),wide),
    fold('Легендарные действия',[m.legendaryNote?h('p',{class:'small muted'},m.legendaryNote):null,...items(m.legendary)].filter(Boolean),wide))}

function finder(){const keys=Object.keys(DB());
  const btns=keys.map(k=>{const m=DB()[k];const b=h('button',{class:'btn'+(view===k?' on':''),type:'button',onclick:()=>{view=k;V.changed('panel')}},
    h('span',{},k,m.aka?h('span',{class:'muted'},' · '+m.aka):null),h('small',{},'ПО '+m.cr));b.dataset.s=(k+' '+(m.aka||'')+' '+m.type).toLowerCase();return b});
  const flt=()=>{const s=q.trim().toLowerCase();for(const b of btns)b.hidden=!!s&&!b.dataset.s.includes(s)};
  const inp=h('input',{type:'text',placeholder:'Найти существо…','aria-label':'Поиск по бестиарию',value:q,oninput:e=>{q=e.target.value;flt()}});
  flt();return h('div',{class:'bst-find'},inp,h('div',{class:'bst-list'},...btns))}

V.addGmSection(()=>{if(!V.isOwner)return null;
  if(V.sel!==lastSel){lastSel=V.sel;view=null}
  const out=[h('h3',{},'Бестиарий')];
  if(!window.BESTIARY){out.push(h('p',{class:'small muted'},'Загружаю листы существ…'));return out}
  const t=V.sel&&V.S.tokens[V.sel],tk=typeOf(t);
  if(view)out.push(sheet(view,null,true));
  else if(tk)out.push(sheet(tk,t.name,false));
  else out.push(h('p',{class:'small muted'},'Выберите фишку монстра на карте — здесь появится его полный лист. Или найдите существо в списке.'));
  out.push(h('div',{class:'small muted',style:'margin:8px 0 2px'},'Все существа кампании'),finder());
  return out});
})();
