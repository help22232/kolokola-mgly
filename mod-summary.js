/* mod-summary.js — «Итоги сессии»: после завершения сессии Мастер видит сводку (бои, урон, криты, павшие враги, добыча),
   раздаёт опыт (Книга игрока 2014) и разрешает повышение уровня; игроки получают карточку итогов. */
(function boot(){if(!window.VTT||!window.VTT.store)return setTimeout(boot,50);if(window.VTT_SUMMARY)return;window.VTT_SUMMARY=true;
const V=window.VTT,h=V.h,store=V.store;
const XP=[0,0,300,900,2700,6500,14000,23000,34000,48000,64000,85000,100000,120000,140000,165000,195000,225000,265000,305000,355000];
const xpFor=l=>{l=Math.max(1,Math.min(20,Number(l)||1));return window.LevelUp&&LevelUp.xpFor?LevelUp.xpFor(l):XP[l]};
const num=v=>Math.max(0,Math.floor(Number(v)||0));
const fmt=n=>Number(n||0).toLocaleString('ru');
const LOADED=Date.now();

/* ---------- стили ---------- */
const css=document.createElement('style');css.textContent=`
.ms-ov{position:fixed;inset:0;z-index:70;background:rgba(5,8,9,.84);display:flex;align-items:center;justify-content:center;padding:16px}
.ms-box{background:var(--panel,#111819);border:1px solid #d9b36c;border-radius:14px;padding:16px 18px;width:100%;max-width:760px;max-height:100%;overflow-y:auto;overflow-x:hidden;color:var(--ink,#e3ebe8);box-shadow:0 14px 40px rgba(0,0,0,.6);-webkit-overflow-scrolling:touch}
.ms-box.pl{max-width:480px}
.ms-box h2{margin:0 0 4px;font-family:"Alegreya SC",Georgia,serif;color:#d9b36c;font-size:24px}
.ms-box h4{margin:14px 0 6px;color:#d9b36c;font-size:15px}
.ms-mut{color:var(--muted,#8e9e9b);font-size:13px}
.ms-stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin:10px 0}
.ms-stat{border:1px solid var(--line,#243235);border-radius:10px;padding:8px 10px;background:var(--panel2,#162022)}
.ms-stat b{display:block;font-size:22px;color:#ffe6a0}
.ms-stat span{font-size:12px;color:var(--muted,#8e9e9b)}
.ms-hero{border:1px solid var(--line,#243235);border-radius:10px;padding:10px 12px;margin:8px 0;background:var(--panel2,#162022)}
.ms-hero .ms-top{display:flex;flex-wrap:wrap;gap:4px 12px;align-items:baseline}
.ms-hero .ms-top b{font-size:16px}
.ms-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin-top:8px}
.ms-row label{display:flex;align-items:center;gap:6px;min-width:0}
.ms-box input[type=number]{width:110px}
.ms-box textarea{width:100%;box-sizing:border-box;min-height:70px;resize:vertical}
.ms-up{color:var(--ok,#8fcf8a);font-weight:600}
.ms-bar{height:8px;border-radius:5px;background:#0c1213;border:1px solid var(--line,#243235);overflow:hidden;margin-top:4px}
.ms-bar i{display:block;height:100%;background:linear-gradient(90deg,#8a6d33,#d9b36c)}
.ms-acts{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-top:14px;position:sticky;bottom:-16px;background:var(--panel,#111819);padding:10px 0 4px}
.ms-list{margin:0;padding-left:18px}
.ms-list li{margin:2px 0;overflow-wrap:anywhere}
.ms-big{font-size:28px;color:#ffe6a0;font-weight:700}
.ms-lvl{border:1px solid rgba(217,179,108,.7);background:#231d10;color:#ffe6a0;border-radius:10px;padding:10px;margin:10px 0;text-align:center;font-size:17px}
.ms-note{white-space:pre-wrap;border-left:3px solid #d9b36c;padding:6px 10px;background:var(--panel2,#162022);border-radius:6px;overflow-wrap:anywhere}
@media (max-width:819px){
 .ms-ov{padding:0;align-items:stretch}
 .ms-box,.ms-box.pl{max-width:none;border-radius:0;border:0;padding:calc(env(safe-area-inset-top,0px) + 14px) 14px calc(env(safe-area-inset-bottom,0px) + 14px)}
 .ms-box input[type=number],.ms-box input[type=text],.ms-box textarea,.ms-box .btn{min-height:40px;font-size:16px}
 .ms-box input[type=checkbox]{width:22px;height:22px}
 .ms-box input[type=number]{flex:1 1 110px}
 .ms-acts{bottom:calc(-14px - env(safe-area-inset-bottom,0px))}
 .ms-acts .btn{flex:1}
}`;document.head.append(css);

function overlay(box,onClose){const ov=h('div',{class:'ms-ov',role:'dialog','aria-modal':'true'},box);
  const close=()=>{ov.remove();document.removeEventListener('keydown',esc);if(onClose)onClose()};
  const esc=e=>{if(e.key==='Escape')close()};document.addEventListener('keydown',esc);
  document.body.append(ov);return close}

/* ---------- чтение журнала за сессию ---------- */
function readLog(since){return new Promise(res=>{let un=null,done=false;
  const fin=a=>{if(done)return;done=true;setTimeout(()=>{try{un&&un()}catch(e){}},0);res((a||[]).filter(m=>(m.ts||0)>=since).sort((x,y)=>x.ts-y.ts))};
  try{un=store.watchCol('log',fin,{order:'ts',dir:'desc',limit:1500})}catch(e){fin(V.S.log)}
  setTimeout(()=>fin(V.S.log),4000)})}

function analyze(log){
  const pcs=V.tokList().filter(t=>t.kind==='pc');
  const byName=[...pcs].sort((a,b)=>(b.name||'').length-(a.name||'').length);
  const st={};for(const t of pcs)st[t.id]={done:0,taken:0,crits:0};
  const who=m=>{const tx=String(m.text||'').replace(/^✨\s*/,'');
    for(const t of byName)if(t.name&&tx.startsWith(t.name))return t.id;
    const own=pcs.filter(t=>t.owner&&t.owner===m.by);return own.length===1?own[0].id:null};
  let fights=0,rounds=0,cur=0;const foes=[],loot=[],pend={},unused=[];
  const closeFight=()=>{if(cur){rounds+=cur;cur=0}};
  for(const m of log){const tx=String(m.text||'');
    if(m.kind==='sys'){
      if(tx.startsWith('⚔ Бой начался')){closeFight();fights++;cur=1;continue}
      if(tx.startsWith('Бой окончен')){closeFight();continue}
      const r=tx.match(/· раунд (\d+)/);if(r&&cur)cur=Math.max(cur,Number(r[1]));
      if(/^(🎒|💰)/.test(tx))loot.push(tx.replace(/^(🎒|💰)\s*/,''));
      if(m.tid&&typeof m.delta==='number'&&m.delta<0){const amt=-m.delta;
        if(st[m.tid])st[m.tid].taken+=amt;
        else{const p=pend[m.tid]&&!pend[m.tid].used&&m.ts-pend[m.tid].ts<600000?pend[m.tid]:(pend._&&!pend._.used&&m.ts-pend._.ts<120000?pend._:null);
          if(p){st[p.pc].done+=amt;p.used=true}}
        if(/повержен/.test(tx)&&!st[m.tid])foes.push(tx.split(':')[0].trim())}
      continue}
    if(m.kind==='roll'){const pc=who(m);if(!pc||!st[pc])continue;
      if(/КРИТ/.test(tx)||(m.nat===20&&m.dmg!=null))st[pc].crits++;
      if(m.dmg!=null&&!/мимо|промах/.test(tx)){const k=m.target&&!st[m.target]?m.target:'_';
        if(pend[k]&&!pend[k].used)unused.push(pend[k]);pend[k]={pc,ts:m.ts,dmg:num(m.dmg),hit:/попал|КРИТ/.test(tx),used:false}}}}
  closeFight();
  /* бросок урона с отметкой «попал», который Мастер не провёл через хиты, — тоже засчитываем */
  for(const p of [...unused,...Object.values(pend)])if(!p.used&&p.hit)st[p.pc].done+=p.dmg;
  return{pcs,st,fights,rounds,foes,loot}}

/* ---------- окно Мастера ---------- */
let gmOpen=false;
async function openGM(startedAt){if(!V.isOwner||gmOpen)return;gmOpen=true;
  const since=Number(startedAt)||Date.now()-6*3600e3;const log=await readLog(since);const A=analyze(log);
  const rows=[];
  const total=h('input',{type:'number',min:0,step:10,placeholder:'напр. 900','aria-label':'Всего опыта'});
  const note=h('textarea',{placeholder:'Что запомнилось, куда двигаемся дальше…','aria-label':'Заметка для игроков',maxlength:1500});
  const heroBox=h('div');
  for(const t of A.pcs){const c=V.S.chars[t.id]||{};const lvl=Number(c.lvl)||1,xp=num(c.xp),s=A.st[t.id];
    const inp=h('input',{type:'number',min:0,step:10,value:'0','aria-label':'Опыт за сессию: '+t.name});
    const chk=h('input',{type:'checkbox'});const chkL=h('label',{class:'ms-up'},chk,'Разрешить повышение уровня');
    const info=h('span',{class:'ms-mut'});
    const upd=()=>{const nx=xp+num(inp.value),need=lvl<20?xpFor(lvl+1):Infinity,ok=nx>=need;
      info.textContent=`итого ${fmt(nx)} / ${need===Infinity?'макс.':fmt(need)}`;
      chkL.hidden=!ok;if(ok&&!chk.dataset.touched)chk.checked=true;if(!ok)chk.checked=false};
    chk.onchange=()=>{chk.dataset.touched='1'};inp.oninput=upd;
    rows.push({t,inp,chk,chkL,s,xp,lvl,upd});
    heroBox.append(h('div',{class:'ms-hero'},
      h('div',{class:'ms-top'},h('b',{},t.name||'Герой'),h('span',{class:'ms-mut'},`${c.cls?c.cls+' · ':''}ур. ${lvl} · опыт ${fmt(xp)}${t.lvlUp?' · повышение уже разрешено':''}`)),
      h('div',{class:'ms-mut',style:'margin-top:4px'},`⚔ нанёс ${s.done} · 🩸 получил ${s.taken} · 🎯 критов ${s.crits}`),
      h('div',{class:'ms-row'},h('label',{},'Опыт за сессию',inp),info),
      h('div',{class:'ms-row'},chkL)));upd()}
  if(!A.pcs.length)heroBox.append(h('p',{class:'ms-mut'},'На столе нет героев игроков.'));
  const split=()=>{const n=rows.length;if(!n)return;const each=Math.floor(num(total.value)/n);for(const r of rows){r.inp.value=each;r.upd()}};
  const stat=(v,l)=>h('div',{class:'ms-stat'},h('b',{},String(v)),h('span',{},l));
  let close;
  const save=async btn=>{btn.disabled=true;const now=Date.now();
    try{for(const r of rows){const add=num(r.inp.value),nx=r.xp+add;
        if(add){if(V.S.chars[r.t.id])await store.update('chars/'+r.t.id,{xp:nx});else await store.set('chars/'+r.t.id,{xp:nx})}
        if(r.chk.checked&&!r.chkL.hidden)await store.update('tokens/'+r.t.id,{lvlUp:true})}
      const heroes=rows.map(r=>({id:r.t.id,name:r.t.name||'Герой',xp:num(r.inp.value),xpTotal:r.xp+num(r.inp.value),dmgDone:r.s.done,dmgTaken:r.s.taken,crits:r.s.crits,lvlUp:!!(r.chk.checked&&!r.chkL.hidden)}));
      const doc={ts:now,startedAt:since,endedAt:now,fights:A.fights,rounds:A.rounds,heroes,foes:A.foes,loot:A.loot.slice(0,40),note:String(note.value||'').slice(0,1500)};
      await store.set('game/summary',doc);
      const xpTxt=heroes.filter(x=>x.xp).map(x=>`${x.name} +${fmt(x.xp)}`).join(', ');
      const ups=heroes.filter(x=>x.lvlUp).map(x=>x.name);
      await V.post({kind:'sys',text:`📜 Итоги сессии: ${xpTxt?'опыт — '+xpTxt:'без опыта'}${ups.length?' · ⚓ повышение уровня: '+ups.join(', '):''}${A.foes.length?' · повержено врагов: '+A.foes.length:''}`});
      V.toast('Итоги сессии сохранены');
      acts.replaceChildren(h('span',{class:'ms-up',style:'margin-right:auto;align-self:center'},'✓ Итоги сохранены'),shareBtn(doc,'btn pri'),h('button',{class:'btn',type:'button',onclick:()=>close()},'Закрыть'))}
    catch(e){console.error(e);V.toast('Не удалось сохранить итоги');btn.disabled=false}};
  const saveBtn=h('button',{class:'btn pri',type:'button',onclick:()=>save(saveBtn)},'📜 Сохранить итоги');
  const acts=h('div',{class:'ms-acts'},h('button',{class:'btn',type:'button',onclick:()=>close()},'Пропустить'),saveBtn);
  const box=h('div',{class:'ms-box'},
    h('h2',{},'Итоги сессии'),
    h('div',{class:'ms-mut'},`С ${new Date(since).toLocaleString('ru',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})} · записей в журнале: ${log.length}`),
    h('div',{class:'ms-stats'},stat(A.fights,'боёв'),stat(A.rounds,'раундов боя'),stat(A.foes.length,'врагов повержено'),stat(A.loot.length,'находок')),
    A.foes.length?h('div',{},h('h4',{},'Павшие враги'),h('div',{class:'ms-mut',style:'overflow-wrap:anywhere'},A.foes.join(', '))):null,
    A.loot.length?h('div',{},h('h4',{},'Добыча'),h('ul',{class:'ms-list'},...A.loot.slice(0,40).map(x=>h('li',{},x)))):null,
    h('h4',{},'Герои и опыт'),
    h('div',{class:'ms-row'},h('label',{},'Всего опыта',total),h('button',{class:'btn sm',type:'button',onclick:split},'поровну')),
    heroBox,
    h('h4',{},'Заметка для игроков'),note,
    acts);
  close=overlay(box,()=>{gmOpen=false})}

window.addEventListener('vtt-session-end',e=>{if(V.isOwner)openGM((e.detail&&e.detail.startedAt)||(V.st()||{}).startedAt)});

/* ---------- картинка для мессенджеров (1080×1350) ---------- */
const GOLD='#d9b36c',INK='#e3ebe8',MUT='#8e9e9b',DISP='"Alegreya SC", Georgia, serif',BODY='"Alegreya Sans", "Segoe UI", sans-serif';
const dstr=ts=>new Date(ts||Date.now()).toLocaleDateString('ru',{day:'numeric',month:'long',year:'numeric'});
function groupFoes(list){const m=new Map();for(const f of list||[]){const k=String(f).replace(/\s+\d+$/,'');m.set(k,(m.get(k)||0)+1)}return[...m].map(([k,n])=>n>1?`${k} ×${n}`:k)}
function wrap(g,text,maxW){const out=[];for(const para of String(text||'').split(/\n+/)){let line='';for(const w of para.split(/\s+/).filter(Boolean)){const t=line?line+' '+w:w;if(g.measureText(t).width<=maxW||!line)line=t;else{out.push(line);line=w}}if(line)out.push(line)}return out}
function clip(g,lines,max,maxW){if(lines.length<=max)return lines;const a=lines.slice(0,max);let l=a[max-1];while(l&&g.measureText(l+'…').width>maxW)l=l.slice(0,-1);a[max-1]=l.replace(/[\s,.;:—-]+$/,'')+'…';return a}
function rrect(g,x,y,w,hh,r){g.beginPath();g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+hh,r);g.arcTo(x+w,y+hh,x,y+hh,r);g.arcTo(x,y+hh,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
async function makeImage(d){
  try{await Promise.race([Promise.all([document.fonts.load(`700 64px ${DISP}`),document.fonts.load(`400 30px ${BODY}`),document.fonts.load(`700 30px ${BODY}`)]).then(()=>document.fonts.ready),new Promise(r=>setTimeout(r,3000))])}catch(e){}
  const W=1080,H=1350,P=72,cw=W-2*P,c=document.createElement('canvas');c.width=W;c.height=H;const g=c.getContext('2d');
  /* фон: тёмное море, виньетка, двойная золотая рамка */
  let gr=g.createLinearGradient(0,0,0,H);gr.addColorStop(0,'#0f1a1b');gr.addColorStop(1,'#070b0c');g.fillStyle=gr;g.fillRect(0,0,W,H);
  gr=g.createRadialGradient(W/2,260,40,W/2,260,760);gr.addColorStop(0,'rgba(217,179,108,.13)');gr.addColorStop(1,'rgba(217,179,108,0)');g.fillStyle=gr;g.fillRect(0,0,W,H);
  g.strokeStyle='rgba(143,209,196,.05)';g.lineWidth=2;for(let y=H-300;y<H;y+=26){g.beginPath();for(let x=0;x<=W;x+=20)g.lineTo(x,y+Math.sin(x/70+y)*6);g.stroke()}
  g.strokeStyle=GOLD;g.lineWidth=3;rrect(g,28,28,W-56,H-56,22);g.stroke();g.strokeStyle='rgba(217,179,108,.35)';g.lineWidth=1.5;rrect(g,40,40,W-80,H-80,16);g.stroke();
  g.textAlign='center';g.textBaseline='alphabetic';
  g.fillStyle=GOLD;g.font=`700 66px ${DISP}`;g.fillText('Колокола Солёной Мглы',W/2,150);
  const orn=y=>{g.strokeStyle='rgba(217,179,108,.6)';g.lineWidth=2;g.beginPath();g.moveTo(P+60,y);g.lineTo(W/2-26,y);g.moveTo(W/2+26,y);g.lineTo(W-P-60,y);g.stroke();
    g.fillStyle=GOLD;g.beginPath();g.moveTo(W/2,y-10);g.lineTo(W/2+12,y);g.lineTo(W/2,y+10);g.lineTo(W/2-12,y);g.closePath();g.fill()};
  orn(186);
  g.fillStyle='#ffe6a0';g.font=`500 46px ${DISP}`;g.fillText('Итоги сессии',W/2,254);
  g.fillStyle=MUT;g.font=`400 30px ${BODY}`;g.fillText(dstr(d.endedAt||d.ts),W/2,298);
  /* счётчики */
  let y=336;const foes=groupFoes(d.foes),stats=[[d.fights||0,'боёв'],[d.rounds||0,'раундов'],[(d.foes||[]).length,'врагов повержено']],sw=(cw-2*24)/3;
  stats.forEach(([v,l],i)=>{const x=P+i*(sw+24);g.fillStyle='rgba(22,32,34,.92)';rrect(g,x,y,sw,112,14);g.fill();g.strokeStyle='#2c3d40';g.lineWidth=2;g.stroke();
    g.fillStyle='#ffe6a0';g.font=`700 50px ${DISP}`;g.fillText(String(v),x+sw/2,y+60);g.fillStyle=MUT;g.font=`400 26px ${BODY}`;g.fillText(l,x+sw/2,y+96)});
  y+=146;g.textAlign='left';
  const maxY=H-110,head=t=>{g.fillStyle=GOLD;g.font=`700 32px ${DISP}`;g.fillText(t,P,y+30);y+=50};
  /* герои */
  const heroes=(d.heroes||[]).slice(0,4),hh=heroes.length>2?112:128;
  if(heroes.length){head('Герои');for(const x of heroes){g.fillStyle='rgba(22,32,34,.92)';rrect(g,P,y,cw,hh-14,14);g.fill();g.strokeStyle=x.lvlUp?'rgba(217,179,108,.75)':'#2c3d40';g.lineWidth=2;g.stroke();
      g.fillStyle=INK;g.font=`700 36px ${BODY}`;let nm=x.name||'Герой';while(g.measureText(nm).width>cw-360&&nm.length>3)nm=nm.slice(0,-2)+'…';g.fillText(nm,P+26,y+46);
      g.textAlign='right';g.fillStyle='#ffe6a0';g.font=`700 40px ${DISP}`;g.fillText(`+${fmt(x.xp)} оп.`,W-P-26,y+48);g.textAlign='left';
      g.fillStyle=MUT;g.font=`400 27px ${BODY}`;g.fillText(`урон ${x.dmgDone||0}  ·  получил ${x.dmgTaken||0}  ·  критов ${x.crits||0}  ·  всего ${fmt(x.xpTotal)} оп.`,P+26,y+hh-36);
      if(x.lvlUp){g.textAlign='right';g.fillStyle='#8fcf8a';g.font=`700 27px ${BODY}`;g.fillText('⬆ новый уровень',W-P-26,y+hh-36);g.textAlign='left'}
      y+=hh}y+=10}
  /* павшие враги, добыча, слово Мастера — что влезет */
  const block=(title,lines,font,color,lh,minLeft)=>{if(!lines.length||y+50+lh>maxY-minLeft)return;head(title);g.font=font;const room=Math.max(1,Math.floor((maxY-minLeft-y)/lh));
    for(const l of clip(g,lines,room,cw))(g.fillStyle=color,g.fillText(l,P,y+lh*.75),y+=lh);y+=18};
  const note=String(d.note||'').trim(),loot=(d.loot||[]).slice(0,12);
  g.font=`italic 400 30px ${BODY}`;const noteH=note?60+Math.min(5,wrap(g,note,cw-30).length)*42:0;
  g.font=`400 28px ${BODY}`;const lootL=[];for(const l of loot){const w=clip(g,wrap(g,'• '+l,cw-24),2,cw-24);lootL.push(w[0],...w.slice(1).map(x=>'   '+x))}
  g.font=`400 29px ${BODY}`;block('Павшие враги',clip(g,wrap(g,foes.join(', '),cw),2,cw),`400 29px ${BODY}`,INK,40,noteH+(lootL.length?126:0));
  block('Добыча',lootL.slice(0,8),`400 28px ${BODY}`,INK,38,noteH);
  if(note&&y+90<maxY){head('Слово Мастера');g.font=`italic 400 30px ${BODY}`;const ls=wrap(g,note,cw-30),room=Math.max(1,Math.floor((maxY-y)/42)),sy=y;
    for(const l of clip(g,ls,room,cw-30))(g.fillStyle='#efe3c4',g.fillText(l,P+26,y+32),y+=42);g.fillStyle=GOLD;g.fillRect(P,sy+4,4,y-sy)}
  orn(H-92);g.textAlign='center';g.fillStyle=MUT;g.font=`400 24px ${BODY}`;g.fillText('D&D 5e · онлайн-стол кампании',W/2,H-54);
  return new Promise((res,rej)=>c.toBlob(b=>b?res(b):rej(new Error('toBlob')),'image/png'))}
async function shareSummary(d,btn){if(!d)return;if(btn)btn.disabled=true;
  try{const blob=await makeImage(d);const dt=new Date(d.endedAt||d.ts||Date.now()),p=n=>String(n).padStart(2,'0');
    const name=`smgla-итоги-${dt.getFullYear()}-${p(dt.getMonth()+1)}-${p(dt.getDate())}.png`;let shared=false;
    try{const file=new File([blob],name,{type:'image/png'});if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:'Колокола Солёной Мглы — итоги сессии'});shared=true}}
    catch(e){if(e&&e.name==='AbortError')shared=true;else console.warn(e)}
    if(!shared){const u=URL.createObjectURL(blob),a=h('a',{href:u,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),5000);V.toast('Картинка итогов сохранена: '+name)}}
  catch(e){console.error(e);V.toast('Не удалось нарисовать картинку итогов')}
  finally{if(btn)btn.disabled=false}}
const shareBtn=(d,cls)=>{const b=h('button',{class:cls||'btn',type:'button',onclick:()=>shareSummary(typeof d==='function'?d():d,b)},'📤 Поделиться итогами');return b};
window.VTT_SUMMARY_IMG=makeImage;

/* ---------- карточка игрока ---------- */
let last=null;const SEEN='vtt-summary-seen-'+(V.room&&V.room.id||'');
const seenTs=()=>{try{return Number(localStorage.getItem(SEEN))||0}catch(e){return 0}};
const markSeen=ts=>{try{localStorage.setItem(SEEN,String(ts))}catch(e){}};
function openPlayer(d){const mine=(d.heroes||[]).filter(x=>{const t=V.S.tokens[x.id];return t&&t.owner===V.myId});
  const box=h('div',{class:'ms-box pl'},h('h2',{},'Сессия завершена'),h('div',{class:'ms-mut'},new Date(d.endedAt||d.ts).toLocaleString('ru',{day:'numeric',month:'long',hour:'2-digit',minute:'2-digit'})));
  for(const x of mine)box.append(h('div',{class:'ms-hero'},h('div',{class:'ms-top'},h('b',{},x.name)),
    h('div',{class:'ms-big'},`Опыт +${fmt(x.xp)}`),h('div',{class:'ms-mut'},`итого ${fmt(x.xpTotal)}`),
    x.lvlUp?h('div',{class:'ms-lvl'},'🎉 Доступно повышение уровня!'):null,
    h('div',{class:'ms-mut',style:'margin-top:6px'},`⚔ урон нанесён: ${x.dmgDone} · 🩸 получен: ${x.dmgTaken} · 🎯 критов: ${x.crits}`)));
  if(!mine.length&&(d.heroes||[]).length)box.append(h('p',{class:'ms-mut'},'Опыт: '+d.heroes.map(x=>`${x.name} +${fmt(x.xp)}`).join(', ')));
  box.append(h('div',{class:'ms-stats'},h('div',{class:'ms-stat'},h('b',{},String(d.fights||0)),h('span',{},'боёв')),h('div',{class:'ms-stat'},h('b',{},String((d.foes||[]).length)),h('span',{},'врагов повержено'))));
  if((d.loot||[]).length)box.append(h('h4',{},'Добыча отряда'),h('ul',{class:'ms-list'},...d.loot.map(x=>h('li',{},x))));
  if(d.note)box.append(h('h4',{},'Слово Мастера'),h('div',{class:'ms-note'},d.note));
  let close;box.append(h('div',{class:'ms-acts'},shareBtn(d,'btn'),h('button',{class:'btn pri',type:'button',onclick:()=>close()},'Закрыть')));
  close=overlay(box,()=>markSeen(d.ts))}
store.watchDoc('game/summary',d=>{last=d;if(V.isOwner)V.renderPane();
  if(!d||!d.ts||V.isOwner)return;
  if(d.ts>seenTs()&&(d.ts>LOADED||Date.now()-d.ts<3*86400e3)){markSeen(d.ts);openPlayer(d)}});

/* ---------- раздел Мастера ---------- */
V.addGmSection(()=>{if(!V.isOwner)return null;const out=[h('h3',{},'Итоги сессии'),
  h('div',{class:'row'},h('button',{class:'btn sm pri',type:'button',onclick:()=>openGM((V.st()||{}).startedAt)},'📜 Подвести итоги сейчас'))];
  if(last&&last.ts)out.push(h('p',{class:'small muted'},`Последние итоги: ${new Date(last.ts).toLocaleString('ru',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})} · `+
    ((last.heroes||[]).map(x=>`${x.name} +${fmt(x.xp)}${x.lvlUp?' ⚓':''}`).join(', ')||'без опыта')),
    h('div',{class:'row'},h('button',{class:'btn sm',type:'button',onclick:()=>openPlayer(last)},'Показать карточку игрока'),shareBtn(()=>last,'btn sm')));
  else out.push(h('p',{class:'small muted'},'Итогов ещё не было. Окно откроется само после «⏹ Завершить сессию».'));
  return out});

/* ---------- опыт в листе героя ---------- */
V.addHeroSection((t,c)=>{if(!t||t.kind!=='pc')return null;c=c||{};const lvl=Number(c.lvl)||1,xp=num(c.xp);
  if(lvl>=20)return h('div',{class:'small',style:'margin:6px 0'},`Опыт: ${fmt(xp)} · максимальный уровень`);
  const from=xpFor(lvl),need=xpFor(lvl+1),p=Math.max(0,Math.min(100,need>from?(xp-from)/(need-from)*100:0));
  return h('div',{style:'margin:8px 0'},h('div',{class:'small'},`Опыт: ${fmt(xp)} / ${fmt(need)}`,xp>=need?h('span',{class:'ms-up'},' · порог достигнут'):null),
    h('div',{class:'ms-bar',role:'progressbar','aria-valuemin':0,'aria-valuemax':need,'aria-valuenow':xp},h('i',{style:`width:${p.toFixed(1)}%`})))});
})();
