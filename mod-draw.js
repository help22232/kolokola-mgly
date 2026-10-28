/* mod-draw.js — рисование на карте: карандаш, прямая, стрелка, прямоугольник, круг, текст, ластик.
   Рисунки отряда: drawings/<id>; скрытый слой Мастера: gm/draw_<id>. Рисуется в слое 'top' (поверх тумана). */
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
const COLORS=['#ffe066','#ff6b6b','#69db7c','#4dabf7','#ffffff','#b197fc','#ffa94d','#111111'];
const WIDTHS=[['тонко',3],['средне',6],['толсто',12]];
const MODES=[['pen','✏️','Карандаш'],['line','／','Прямая'],['arrow','➚','Стрелка'],['rect','▭','Прямоугольник'],['circle','◯','Круг'],['text','T','Текст'],['erase','⌫','Ластик']];
const MAX_PTS=400;
let mode='pen',color=COLORS[0],width=6,hidden=false,text='';
let drawings=[],gmDrawings=[],cur=null,panel=null,clearArm=0;

/* ---------- стили ---------- */
const st=document.createElement('style');st.textContent=`
.mdw-panel{position:fixed;z-index:20;left:50%;transform:translateX(-50%);top:calc(env(safe-area-inset-top,0px) + 54px);width:max-content;max-width:calc(100vw - 20px);
  background:var(--panel,#111819);border:1px solid var(--brass,#d9b36c);border-radius:12px;padding:8px;box-shadow:0 8px 24px rgba(0,0,0,.6);display:grid;gap:6px;font-size:14px;color:var(--ink,#e3ebe8)}
.mdw-row{display:flex;flex-wrap:wrap;gap:4px;align-items:center}
.mdw-b{min-width:36px;height:34px;padding:0 8px;border-radius:8px;border:1px solid var(--line,#243235);background:var(--panel2,#162022);color:inherit;cursor:pointer;font:inherit}
.mdw-b[aria-pressed="true"]{border-color:var(--brass,#d9b36c);background:#231d10;color:var(--brass,#d9b36c)}
.mdw-b:focus-visible{outline:2px solid var(--sea,#8fd1c4)}
.mdw-c{width:26px;height:26px;border-radius:50%;border:2px solid #333;cursor:pointer;padding:0}
.mdw-c[aria-pressed="true"]{border-color:#fff;box-shadow:0 0 0 2px var(--brass,#d9b36c)}
.mdw-txt{flex:1;min-width:140px;background:#0c1213;border:1px solid var(--line,#243235);border-radius:7px;padding:6px 8px;color:inherit;font:inherit}
.mdw-sm{font-size:12px;color:var(--muted,#8e9e9b)}
/* телефон: одна строка с прокруткой внизу поля, слева от кнопок масштаба */
.mdw-panel.mdw-dock{transform:none;top:auto;display:flex;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;align-items:center;gap:8px;padding:4px 6px;border-color:var(--line,#243235);touch-action:pan-x;overscroll-behavior-x:contain;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.mdw-dock .mdw-row{flex-wrap:nowrap;flex:0 0 auto}
.mdw-dock .mdw-b{min-width:40px;height:40px;white-space:nowrap}
.mdw-dock .mdw-c{width:32px;height:32px;flex:0 0 auto}
.mdw-dock .mdw-txt{flex:0 0 150px;min-width:0;height:40px}
.mdw-dock .mdw-lt{display:none}`;
document.head.append(st);

/* ---------- данные ---------- */
V.watch('drawings',a=>{drawings=a;V.requestDraw()});
if(V.isOwner)V.watch('gm',a=>{gmDrawings=a.filter(d=>d.id.startsWith('draw_')).map(d=>({...d,gm:true}));V.requestDraw()});
const mapId=()=>V.st().map;
const narrow=()=>innerWidth<600;
const onceHint=(key,txt)=>{let seen=false;try{seen=localStorage.getItem('vtt-hint-'+key)==='1';localStorage.setItem('vtt-hint-'+key,'1')}catch(e){}if(seen)return'';setTimeout(()=>{const el=document.getElementById('hint');if(el&&el.textContent===txt)V.setHint('')},3000);return txt};
const cvRect=()=>{const c=document.getElementById('cv');return c?c.getBoundingClientRect():{left:0,top:0,right:innerWidth,bottom:innerHeight,width:innerWidth,height:innerHeight}};
function dockPanel(){if(!panel)return;const nw=narrow();panel.classList.toggle('mdw-dock',nw);
  if(nw){const r=cvRect();panel.style.left=(r.left+8)+'px';panel.style.bottom=Math.max(8,innerHeight-r.bottom+10)+'px';panel.style.width=Math.max(150,r.width-206)+'px';panel.style.maxWidth='none'}
  else{panel.style.left='';panel.style.bottom='';panel.style.width='';panel.style.maxWidth=''}}
addEventListener('resize',dockPanel);
const visible=()=>[...drawings,...(V.isGM()?gmDrawings:[])].filter(d=>d.map===mapId());
const pathOf=d=>d.gm?'gm/'+d.id:'drawings/'+d.id;
const canDel=d=>V.isOwner||d.by===V.myId;
const r1=v=>Math.round(v*10)/10;

/* упрощение линии: Рамер — Дуглас — Пекер до MAX_PTS точек */
function simplify(pts,eps){if(pts.length<3)return pts;const keep=new Uint8Array(pts.length);keep[0]=keep[pts.length-1]=1;const st=[[0,pts.length-1]];
  while(st.length){const [a,b]=st.pop();let md=-1,mi=-1;const [ax,ay]=pts[a],[bx,by]=pts[b],dx=bx-ax,dy=by-ay,l=Math.hypot(dx,dy)||1;
    for(let i=a+1;i<b;i++){const d=Math.abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/l;if(d>md){md=d;mi=i}}
    if(md>eps){keep[mi]=1;st.push([a,mi],[mi,b])}}
  return pts.filter((_,i)=>keep[i])}
function compact(pts){let eps=.5,out=simplify(pts,eps);while(out.length>MAX_PTS){eps*=1.6;out=simplify(pts,eps)}return out.map(p=>[r1(p[0]),r1(p[1])])}

/* ---------- рисование ---------- */
function drawOne(g,d,z){const p=d.pts||[];if(!p.length)return;g.strokeStyle=d.color;g.fillStyle=d.color;g.lineWidth=d.w||6;g.lineCap='round';g.lineJoin='round';
  if(d.gm){g.setLineDash([(d.w||6)*2,(d.w||6)*1.5])}else g.setLineDash([]);
  if(d.kind==='pen'){g.beginPath();g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);if(p.length===1)g.lineTo(p[0][0]+.1,p[0][1]);g.stroke()}
  else if(d.kind==='line'||d.kind==='arrow'){const [a,b]=[p[0],p[p.length-1]];g.beginPath();g.moveTo(a[0],a[1]);g.lineTo(b[0],b[1]);g.stroke();
    if(d.kind==='arrow'){const ang=Math.atan2(b[1]-a[1],b[0]-a[0]),L=Math.max(14,(d.w||6)*3.2);g.setLineDash([]);g.beginPath();g.moveTo(b[0],b[1]);g.lineTo(b[0]-L*Math.cos(ang-.45),b[1]-L*Math.sin(ang-.45));g.lineTo(b[0]-L*Math.cos(ang+.45),b[1]-L*Math.sin(ang+.45));g.closePath();g.fill()}}
  else if(d.kind==='rect'){const [a,b]=[p[0],p[p.length-1]];g.strokeRect(Math.min(a[0],b[0]),Math.min(a[1],b[1]),Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))}
  else if(d.kind==='circle'){const [a,b]=[p[0],p[p.length-1]];g.beginPath();g.arc(a[0],a[1],Math.hypot(b[0]-a[0],b[1]-a[1]),0,Math.PI*2);g.stroke()}
  else if(d.kind==='text'&&d.text){const fs=14+(d.w||6)*2;g.font=`700 ${fs}px "Alegreya Sans",sans-serif`;g.textBaseline='middle';g.textAlign='left';
    g.lineWidth=Math.max(2,fs/7);g.strokeStyle='rgba(0,0,0,.75)';g.setLineDash([]);g.strokeText(d.text,p[0][0],p[0][1]);g.fillStyle=d.color;g.fillText(d.text,p[0][0],p[0][1]);
    if(d.gm){g.font=`${fs*.6}px sans-serif`;g.fillText('🔒',p[0][0]-fs*.8,p[0][1])}}
  g.setLineDash([])}
V.onDraw('top',(g,m,cam)=>{for(const d of visible())drawOne(g,d,cam.z);if(cur)drawOne(g,cur,cam.z)});

/* ---------- попадание ластиком ---------- */
function segD(px,py,a,b){const dx=b[0]-a[0],dy=b[1]-a[1],l=dx*dx+dy*dy||1;const k=Math.max(0,Math.min(1,((px-a[0])*dx+(py-a[1])*dy)/l));return Math.hypot(px-(a[0]+dx*k),py-(a[1]+dy*k))}
function hitDist(d,x,y){const p=d.pts||[];if(!p.length)return Infinity;
  if(d.kind==='pen'){if(p.length===1)return Math.hypot(x-p[0][0],y-p[0][1]);let m=Infinity;for(let i=1;i<p.length;i++)m=Math.min(m,segD(x,y,p[i-1],p[i]));return m}
  const a=p[0],b=p[p.length-1];
  if(d.kind==='line'||d.kind==='arrow')return segD(x,y,a,b);
  if(d.kind==='rect'){const c=[[a[0],a[1]],[b[0],a[1]],[b[0],b[1]],[a[0],b[1]]];let m=Infinity;for(let i=0;i<4;i++)m=Math.min(m,segD(x,y,c[i],c[(i+1)%4]));return m}
  if(d.kind==='circle')return Math.abs(Math.hypot(x-a[0],y-a[1])-Math.hypot(b[0]-a[0],b[1]-a[1]));
  if(d.kind==='text'){const fs=14+(d.w||6)*2,w=(d.text||'').length*fs*.55;return(x>=a[0]-4&&x<=a[0]+w&&Math.abs(y-a[1])<=fs*.7)?0:Infinity}
  return Infinity}
async function eraseAt(x,y){const tol=Math.max(10/V.cam.z,6);let best=null,bd=Infinity;
  for(const d of visible()){if(!canDel(d))continue;const dd=hitDist(d,x,y)-(d.w||6)/2;if(dd<bd){bd=dd;best=d}}
  if(best&&bd<=tol){await V.store.del(pathOf(best))}else V.toast('Здесь нет вашего рисунка.')}

/* ---------- сохранение ---------- */
async function save(d){if(V.readOnly){V.toast('У вас доступ только для просмотра.');return}
  const doc={map:mapId(),kind:d.kind,pts:d.kind==='pen'?compact(d.pts):d.pts.map(p=>[r1(p[0]),r1(p[1])]),color:d.color,w:d.w,by:V.myId,who:V.whoAmI(),ts:Date.now()};
  if(d.text)doc.text=String(d.text).slice(0,120);
  const id=V.store.newId('drawings');
  if(hidden&&V.isOwner)await V.store.set('gm/draw_'+id,doc);else await V.store.set('drawings/'+id,doc)}

/* ---------- панель ---------- */
function rerender(){if(panel)renderPanel()}
function renderPanel(){if(!panel){panel=h('div',{class:'mdw-panel',role:'toolbar','aria-label':'Рисование на карте'});V.overlay().append(panel)}
  const rows=[];
  rows.push(h('div',{class:'mdw-row'},...MODES.map(([k,ic,n])=>h('button',{type:'button',class:'mdw-b',title:n,'aria-label':n,'aria-pressed':String(mode===k),onclick:()=>{mode=k;cur=null;V.setHint(onceHint('draw-'+k,hintText()));rerender()}},ic)),
    h('button',{type:'button',class:'mdw-b',title:'Закрыть рисование','aria-label':'Закрыть рисование',onclick:()=>V.setTool('select')},'✕')));
  rows.push(h('div',{class:'mdw-row'},...COLORS.map(c=>h('button',{type:'button',class:'mdw-c',title:'Цвет','aria-label':'Цвет '+c,'aria-pressed':String(color===c),style:`background:${c}`,onclick:()=>{color=c;rerender()}})),
    ...WIDTHS.map(([n,w])=>h('button',{type:'button',class:'mdw-b','aria-pressed':String(width===w),onclick:()=>{width=w;rerender()}},n))));
  if(mode==='text'){const inp=h('input',{type:'text',class:'mdw-txt',placeholder:'Текст надписи, затем коснитесь карты',maxlength:120,'aria-label':'Текст надписи'});inp.value=text;inp.oninput=()=>{text=inp.value};rows.push(h('div',{class:'mdw-row'},inp))}
  const extra=[h('button',{type:'button',class:'mdw-b',title:'Убрать мои рисунки на этой карте',onclick:clearMine},'🧹',h('span',{class:'mdw-lt'},' Убрать мои рисунки'))];
  if(V.isOwner){const cb=h('input',{type:'checkbox',checked:hidden,onchange:e=>{hidden=e.target.checked}});extra.unshift(h('label',{class:'mdw-row mdw-sm',title:'Скрытый слой: видит только Мастер'},cb,'🙈',h('span',{class:'mdw-lt'},' Скрытый слой (видит только Мастер)')))}
  rows.push(h('div',{class:'mdw-row'},...extra));
  panel.replaceChildren(...rows);panel.hidden=false;dockPanel()}
function hintText(){return{pen:'Ведите пальцем по карте',line:'Тяните от начала к концу',arrow:'Тяните к острию стрелки',rect:'Тяните из угла в угол',circle:'Тяните от центра к краю',text:'Напишите текст, коснитесь карты',erase:'Коснитесь рисунка — стереть'}[mode]}
function hidePanel(){if(panel)panel.hidden=true;cur=null;V.requestDraw()}

async function clearMine(){const mine=visible().filter(d=>d.by===V.myId);if(!mine.length){V.toast('На этой карте нет ваших рисунков.');return}for(const d of mine)await V.store.del(pathOf(d));V.toast('Ваши рисунки убраны: '+mine.length)}
async function clearAll(){const all=[...drawings,...gmDrawings].filter(d=>d.map===mapId());if(!all.length){V.toast('На этой карте нет рисунков.');return}
  if(Date.now()-clearArm>4000){clearArm=Date.now();V.toast('Нажмите «Очистить все рисунки» ещё раз, чтобы стереть '+all.length+' шт.');return}
  clearArm=0;for(const d of all)await V.store.del(pathOf(d));V.toast('Все рисунки на карте стёрты.')}

/* ---------- инструмент ---------- */
V.addTool({id:'draw',icon:'✏️',title:'Рисовать на карте',get hint(){return onceHint('draw-'+mode,hintText())},
  activate(){renderPanel()},
  cancel(){hidePanel()},
  down(x,y){if(V.readOnly){V.toast('У вас доступ только для просмотра.');return}
    if(mode==='erase'){eraseAt(x,y);return}
    if(mode==='text'){const t=text.trim();if(!t){V.toast('Сначала напишите текст в поле на панели.');return}cur=null;save({kind:'text',pts:[[x,y]],color,w:width,text:t});return}
    cur={kind:mode,pts:[[x,y]],color,w:width,gm:hidden&&V.isOwner};if(mode!=='pen')cur.pts.push([x,y]);V.requestDraw()},
  move(x,y){if(!cur)return;if(cur.kind==='pen'){const l=cur.pts[cur.pts.length-1];if(Math.hypot(x-l[0],y-l[1])>=Math.max(1.5,2/V.cam.z))cur.pts.push([x,y])}else cur.pts[1]=[x,y];V.requestDraw()},
  up(x,y){if(!cur)return;const d=cur;cur=null;if(d.kind!=='pen')d.pts[1]=[x,y];
    const tiny=d.kind!=='pen'&&Math.hypot(d.pts[1][0]-d.pts[0][0],d.pts[1][1]-d.pts[0][1])<4;
    if(!tiny)save(d);V.requestDraw()}});

V.addGmSection(()=>[h('h3',{},'Рисунки на карте'),h('p',{class:'small muted'},`На этой карте: ${drawings.filter(d=>d.map===mapId()).length} у отряда, ${gmDrawings.filter(d=>d.map===mapId()).length} в скрытом слое.`),
  h('div',{class:'row'},h('button',{class:'btn sm bad',type:'button',onclick:clearAll},'Очистить все рисунки на карте'))]);
})();
