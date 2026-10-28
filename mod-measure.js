// Модуль стола: линейка и шаблоны областей заклинаний (D&D 5e, Книга игрока 2014).
// Линейка видна всем через presence комнаты; области хранятся в shapes/<id> и общие для всех на карте.
(function boot(){if(!window.VTT)return setTimeout(boot,50);
const V=window.VTT,h=V.h;
const css=document.createElement('style');css.textContent=`
.mm-panel{position:fixed;z-index:6;background:rgba(17,24,25,.96);border:1px solid #243235;border-radius:10px;padding:8px;display:grid;gap:6px;box-shadow:0 6px 20px rgba(0,0,0,.5);font-size:13px;color:#e3ebe8}
.mm-row{display:flex;flex-wrap:wrap;gap:5px;align-items:center}
.mm-b{border:1px solid #243235;background:#162022;border-radius:8px;padding:7px 9px;cursor:pointer;color:#e3ebe8;font:inherit;min-height:34px}
.mm-b[aria-pressed="true"]{border-color:#d9b36c;color:#d9b36c;background:#231d10}
.mm-c{width:28px;height:28px;border-radius:50%;border:2px solid #243235;cursor:pointer;padding:0}
.mm-c[aria-pressed="true"]{border-color:#fff}
.mm-in{width:64px;background:#0c1213;border:1px solid #243235;border-radius:7px;padding:6px;color:#e3ebe8;font:inherit}
.mm-menu{position:fixed;z-index:7;width:min(260px,calc(100vw - 20px));background:#111819;border:1px solid #d9b36c;border-radius:10px;padding:10px;box-shadow:0 8px 24px rgba(0,0,0,.6);color:#e3ebe8;font-size:14px}
.mm-menu .mm-who{font-size:12px;color:#8e9e9b;margin-bottom:6px}
.mm-menu ul{margin:6px 0;padding-left:18px}
.mm-list{display:grid;gap:4px;max-height:120px;overflow:auto}
.mm-li{display:flex;justify-content:space-between;align-items:center;gap:6px;font-size:12px;color:#8e9e9b}
.mm-q{display:none}
/* телефон: одна строка с прокруткой внизу поля, слева от кнопок масштаба */
.mm-panel.mm-dock{display:flex;flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;align-items:center;gap:8px;padding:4px 6px;touch-action:pan-x;overscroll-behavior-x:contain;scrollbar-width:thin;-webkit-overflow-scrolling:touch}
.mm-dock .mm-row{flex-wrap:nowrap;flex:0 0 auto;gap:4px}
.mm-dock .mm-b{min-height:40px;min-width:40px;white-space:nowrap;padding:0 9px}
.mm-dock .mm-c{width:32px;height:32px;flex:0 0 auto}
.mm-dock .mm-in{width:56px;min-height:40px}
.mm-dock .mm-tip{display:none}
.mm-dock .mm-q{display:inline-flex;align-items:center;justify-content:center}
.mm-dock .mm-list{display:flex;flex:0 0 auto;max-height:none;overflow:visible}
.mm-dock .mm-li{white-space:nowrap}`;
document.head.append(css);

const narrow=()=>innerWidth<600;
const onceHint=(key,txt)=>{let seen=false;try{seen=localStorage.getItem('vtt-hint-'+key)==='1';localStorage.setItem('vtt-hint-'+key,'1')}catch(e){}if(seen)return'';setTimeout(()=>{const el=document.getElementById('hint');if(el&&el.textContent===txt)V.setHint('')},3000);return txt};
const KINDS=[['cone','Конус'],['sphere','Сфера'],['line','Линия'],['cube','Куб']];
const COLORS=[['#e8734a','огонь'],['#6fb7e8','холод'],['#9fd36a','яд'],['#c79bf0','магия']];
const KNAME=Object.fromEntries(KINDS);
let shapes=[];V.watch('shapes',a=>{shapes=a;V.requestDraw();refreshPanel()});

/* ---------- геометрия ---------- */
const cellOf=m=>V.cellPx(m);
const ftpx=m=>V.ftPx(m);
function snapCenter(m,x,y){if(!m.grid)return[x,y];const c=m.grid;return[(Math.floor(x/c)+.5)*c,(Math.floor(y/c)+.5)*c]}
// расстояние по правилу 5e: каждая клетка (и по диагонали) — 5 футов
function segFt(m,a,b){if(m.grid){const c=m.grid;return Math.round(Math.max(Math.abs(b[0]-a[0]),Math.abs(b[1]-a[1]))/c)*5}return Math.round(Math.hypot(b[0]-a[0],b[1]-a[1])/ftpx(m)/5)*5}
// точка внутри области? (для подсветки клеток по их центру и для фишек)
function inside(s,m,px,py){const fp=ftpx(m),L=s.size*fp,ox=s.x,oy=s.y,rx=px-ox,ry=py-oy;
  if(s.kind==='sphere')return Math.hypot(rx,ry)<=L+.01;
  const dx=s.dx||1,dy=s.dy||0,u=rx*dx+ry*dy,v=-rx*dy+ry*dx;
  if(s.kind==='cube'){if(!s.dx&&!s.dy)return Math.abs(rx)<=L/2&&Math.abs(ry)<=L/2;return u>=0&&u<=L&&Math.abs(v)<=L/2}
  if(s.kind==='line')return u>=0&&u<=L&&Math.abs(v)<=2.5*fp; // ширина 5 фт
  if(s.kind==='cone')return u>0&&u<=L&&Math.abs(v)<=u/2+.01;   // ширина конуса равна расстоянию от точки начала
  return false}
function cellsOf(s,m){if(!m.grid)return[];const c=m.grid,R=s.size*ftpx(m)+c,x0=Math.max(0,Math.floor((s.x-R)/c)),x1=Math.min(Math.ceil(m.w/c),Math.ceil((s.x+R)/c)),y0=Math.max(0,Math.floor((s.y-R)/c)),y1=Math.min(Math.ceil(m.h/c),Math.ceil((s.y+R)/c));const out=[];
  for(let i=x0;i<x1;i++)for(let j=y0;j<y1;j++){const cx=(i+.5)*c,cy=(j+.5)*c;if(inside(s,m,cx,cy))out.push([i*c,j*c])}return out}
function outline(g,s,m){const fp=ftpx(m),L=s.size*fp;g.beginPath();
  if(s.kind==='sphere'){g.arc(s.x,s.y,L,0,7);return}
  const dx=s.dx||1,dy=s.dy||0,nx=-dy,ny=dx,P=(u,v)=>[s.x+u*dx+v*nx,s.y+u*dy+v*ny];let pts;
  if(s.kind==='cube'&&!s.dx&&!s.dy)pts=[[s.x-L/2,s.y-L/2],[s.x+L/2,s.y-L/2],[s.x+L/2,s.y+L/2],[s.x-L/2,s.y+L/2]];
  else if(s.kind==='cube')pts=[P(0,-L/2),P(L,-L/2),P(L,L/2),P(0,L/2)];
  else if(s.kind==='line')pts=[P(0,-2.5*fp),P(L,-2.5*fp),P(L,2.5*fp),P(0,2.5*fp)];
  else pts=[P(0,0),P(L,-L/2),P(L,L/2)];
  pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.closePath()}
const tokensIn=(s,m)=>V.tokList().filter(t=>t.map===s.map&&inside(s,m,t.x,t.y));

/* ---------- рисование ---------- */
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return`rgba(${n>>16&255},${n>>8&255},${n&255},${a})`}
function drawShape(g,s,m,z,preview){const col=s.color||'#e8734a';
  if(m.grid){const c=m.grid;g.fillStyle=rgba(col,preview?.22:.3);for(const [x,y] of cellsOf(s,m))g.fillRect(x+1/z,y+1/z,c-2/z,c-2/z)}
  else{outline(g,s,m);g.fillStyle=rgba(col,.2);g.fill()}
  outline(g,s,m);g.strokeStyle=rgba(col,.95);g.lineWidth=2/z;g.setLineDash(preview?[6/z,4/z]:[]);g.stroke();g.setLineDash([]);
  g.beginPath();g.arc(s.x,s.y,7/z,0,7);g.fillStyle=col;g.fill();g.strokeStyle='#fff';g.lineWidth=1.5/z;g.stroke();
  const lab=`${KNAME[s.kind]} ${s.size} фт`;g.font=`600 ${12/z}px "IBM Plex Mono",monospace`;const w=g.measureText(lab).width+8/z;g.fillStyle='rgba(0,0,0,.72)';g.fillRect(s.x+10/z,s.y-22/z,w,16/z);g.fillStyle='#fff';g.textBaseline='middle';g.fillText(lab,s.x+14/z,s.y-14/z)}
function drawRuler(g,pts,z,col,who,m){if(pts.length<2)return;g.strokeStyle='rgba(0,0,0,.6)';g.lineWidth=5/z;g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]));g.stroke();
  g.strokeStyle=col;g.lineWidth=2.5/z;g.setLineDash([8/z,5/z]);g.stroke();g.setLineDash([]);
  let tot=0;for(let i=1;i<pts.length;i++)tot+=segFt(m,pts[i-1],pts[i]);
  for(const p of pts){g.beginPath();g.arc(p[0],p[1],4/z,0,7);g.fillStyle=col;g.fill()}
  const e=pts[pts.length-1],lab=(who?who+': ':'')+tot+' фт';g.font=`700 ${15/z}px "IBM Plex Mono",monospace`;const w=g.measureText(lab).width+10/z;
  g.fillStyle='rgba(0,0,0,.78)';g.fillRect(e[0]+12/z,e[1]-26/z,w,22/z);g.fillStyle=col;g.textBaseline='middle';g.fillText(lab,e[0]+17/z,e[1]-15/z)}
V.onDraw('top',(g,m,cam)=>{const z=cam.z;
  for(const s of shapes)if(s.map===m.id)drawShape(g,s,m,z,false);
  if(aoe.preview&&aoe.preview.map===m.id)drawShape(g,aoe.preview,m,z,true);
  if(rul.pts.length)drawRuler(g,rul.pts.concat(rul.cur?[rul.cur]:[]),z,'#ffe08a','',m);
  const R=V.room;if(R&&R.peers)for(const p of R.peers()){const r=p.presence&&p.presence.ruler;if(!p.sameTab&&r&&r.map===m.id&&Array.isArray(r.pts))drawRuler(g,r.pts,z,'#8fd1c4',String(r.who||'').slice(0,20),m)}});
if(V.room&&V.room.onPeers)V.room.onPeers(()=>V.requestDraw());

/* ---------- линейка ---------- */
const rul={pts:[],cur:null,dragging:false,downAt:null,fadeT:0};
let presT=0;function sendRuler(){if(!V.room)return;clearTimeout(presT);presT=setTimeout(()=>{const pts=rul.pts.concat(rul.cur?[rul.cur]:[]);V.room.presence({ruler:pts.length>1?{map:V.st().map,pts:pts.map(p=>[Math.round(p[0]),Math.round(p[1])]),who:V.whoAmI()}:null}).catch(()=>{})},60)}
function clearRuler(){rul.pts=[];rul.cur=null;rul.dragging=false;clearTimeout(rul.fadeT);sendRuler();V.requestDraw()}
function scheduleFade(){clearTimeout(rul.fadeT);rul.fadeT=setTimeout(clearRuler,2600)}
V.addTool({id:'ruler',icon:'📏',title:'Линейка: расстояние в футах',get hint(){return onceHint('ruler','Тяните — расстояние в футах')},
  down(wx,wy,e){if(e&&e.isPrimary===false)return;const m=V.mapInfo();const p=snapCenter(m,wx,wy);clearTimeout(rul.fadeT);
    if(!rul.pts.length)rul.pts=[p];rul.cur=p;rul.dragging=true;rul.downAt=[e?e.clientX:0,e?e.clientY:0];sendRuler();V.requestDraw()},
  move(wx,wy){if(!rul.dragging)return;rul.cur=snapCenter(V.mapInfo(),wx,wy);sendRuler();V.requestDraw()},
  up(wx,wy){if(!rul.dragging)return;rul.dragging=false;const p=snapCenter(V.mapInfo(),wx,wy);const last=rul.pts[rul.pts.length-1];
    if(!last||Math.hypot(p[0]-last[0],p[1]-last[1])>1)rul.pts.push(p);rul.cur=null;sendRuler();V.requestDraw();scheduleFade()},
  cancel:clearRuler});

/* ---------- области ---------- */
const aoe={kind:'cone',size:15,color:'#e8734a',origin:null,preview:null,downAt:null,dragging:false};
let panel=null,menu=null;
const cvRect=()=>{const c=document.getElementById('cv');return c?c.getBoundingClientRect():{left:0,top:0,width:innerWidth,height:innerHeight}};
const toScreen=(x,y)=>{const r=cvRect(),c=V.cam;return[r.left+x*c.z+c.ox,r.top+y*c.z+c.oy]};
function mkPreview(ox,oy,tx,ty){const m=V.mapInfo();let dx=0,dy=0;if(tx!=null){const L=Math.hypot(tx-ox,ty-oy);if(L>4){dx=(tx-ox)/L;dy=(ty-oy)/L}}
  if((aoe.kind==='cone'||aoe.kind==='line')&&!dx&&!dy){dx=1;dy=0}
  return{map:m.id,kind:aoe.kind,x:Math.round(ox),y:Math.round(oy),dx:+dx.toFixed(4),dy:+dy.toFixed(4),size:aoe.size,color:aoe.color}}
function originFor(wx,wy){const m=V.mapInfo();if(!m.grid)return[wx,wy];
  // сфера/куб по центру — в центр клетки; конус/линия начинаются на пересечении линий сетки (как в Книге игрока)
  if(aoe.kind==='sphere')return[Math.round(wx/m.grid)*m.grid,Math.round(wy/m.grid)*m.grid];
  return[Math.round(wx/m.grid)*m.grid,Math.round(wy/m.grid)*m.grid]}
async function saveShape(p){if(V.readOnly)return;const id=V.store.newId('shapes');await V.store.set('shapes/'+id,{...p,by:V.myId,who:V.whoAmI(),ts:Date.now()});
  const n=tokensIn(p,V.mapInfo()).filter(t=>V.canSee(t)).length;V.toast(`${KNAME[p.kind]} ${p.size} фт ${p.kind==='sphere'||p.kind==='line'?'поставлена':'поставлен'}${n?` · в области: ${n}`:''}`)}
function hitShape(wx,wy){const r=18/V.cam.z,id=V.st().map;return shapes.slice().reverse().find(s=>s.map===id&&Math.hypot(s.x-wx,s.y-wy)<=r)}
function closeMenu(){if(menu){menu.remove();menu=null}}
function openMenu(s,sx,sy){closeMenu();const m=V.mapInfo(),mine=s.by===V.myId||V.isOwner;
  const kids=[h('div',{class:'mm-who'},`${KNAME[s.kind]} ${s.size} фт · ${s.who||'Игрок'}`)];
  if(V.isOwner){const ts=tokensIn(s,m);kids.push(h('b',{},ts.length?'В области:':'В области никого нет'));if(ts.length)kids.push(h('ul',{},...ts.map(t=>h('li',{},t.name+(t.hidden?' (скрыт)':'')))))}
  else{const ts=tokensIn(s,m).filter(t=>V.canSee(t));if(ts.length)kids.push(h('div',{},'Видно в области: '+ts.map(t=>t.name).join(', ')))}
  kids.push(h('div',{class:'mm-row',style:'margin-top:8px'},mine&&!V.readOnly?h('button',{class:'mm-b',type:'button',onclick:async()=>{await V.store.del('shapes/'+s.id);closeMenu()}},'Убрать'):null,h('button',{class:'mm-b',type:'button',onclick:closeMenu},'Закрыть')));
  menu=h('div',{class:'mm-menu'},...kids);menu.style.left=Math.min(Math.max(8,sx+12),innerWidth-270)+'px';menu.style.top=Math.min(Math.max(8,sy+12),innerHeight-220)+'px';(V.overlay()||document.body).append(menu)}
function dockPanel(){if(!panel)return;const r=cvRect(),nw=narrow();panel.classList.toggle('mm-dock',nw);
  if(nw){panel.style.left=(r.left+8)+'px';panel.style.top='auto';panel.style.bottom=Math.max(8,innerHeight-r.bottom+10)+'px';panel.style.maxWidth='none';panel.style.width=Math.max(150,r.width-206)+'px'}
  else{panel.style.left=(r.left+56)+'px';panel.style.top=(r.top+46)+'px';panel.style.bottom='auto';panel.style.width='';panel.style.maxWidth=Math.max(200,r.width-70)+'px'}}
addEventListener('resize',dockPanel);
function refreshPanel(){if(!panel)return;dockPanel();
  const sz=h('input',{class:'mm-in',type:'number',min:5,max:300,step:5,value:aoe.size,'aria-label':'Размер в футах'});sz.onchange=()=>{aoe.size=Math.max(5,Math.min(300,Number(sz.value)||5));refreshPanel()};
  const mineHere=shapes.filter(s=>s.map===V.st().map&&(s.by===V.myId||V.isOwner));
  const tip=aoe.origin?'Коснитесь, куда направить':(aoe.kind==='cone'||aoe.kind==='line')?'Коснитесь точки начала, потом направления (или тяните)':'Коснитесь центра области';panel.title=tip;
  panel.replaceChildren(
    h('div',{class:'mm-row'},...KINDS.map(([k,n])=>h('button',{class:'mm-b',type:'button','aria-pressed':String(aoe.kind===k),onclick:()=>{aoe.kind=k;aoe.origin=null;aoe.preview=null;refreshPanel();V.requestDraw()}},n))),
    h('div',{class:'mm-row'},...[10,15,20,30,60].map(n=>h('button',{class:'mm-b',type:'button','aria-pressed':String(aoe.size===n),onclick:()=>{aoe.size=n;refreshPanel()}},n)),sz,h('span',{},'фт')),
    h('div',{class:'mm-row'},...COLORS.map(([c,n])=>h('button',{class:'mm-c',type:'button',title:n,'aria-label':n,'aria-pressed':String(aoe.color===c),style:`background:${c}`,onclick:()=>{aoe.color=c;refreshPanel()}})),
      h('span',{class:'mm-tip',style:'color:#8e9e9b;font-size:12px'},tip)),
    h('button',{class:'mm-b mm-q',type:'button',title:tip,'aria-label':'Как ставить область',onclick:()=>V.toast(tip)},'?'),
    mineHere.length?h('div',{class:'mm-list'},...mineHere.map(s=>h('div',{class:'mm-li'},h('span',{},`${KNAME[s.kind]} ${s.size} фт · ${s.who||''}`),h('button',{class:'mm-b',type:'button',style:'min-height:28px;padding:3px 8px',onclick:()=>V.store.del('shapes/'+s.id)},'✕')))):null)}
V.addTool({id:'aoe',icon:'🔥',title:'Область заклинания: конус, сфера, линия, куб',get hint(){return onceHint('aoe','Коснитесь карты — область')},
  activate(){if(!panel){panel=h('div',{class:'mm-panel'});(V.overlay()||document.body).append(panel)}refreshPanel()},
  cancel(){aoe.origin=null;aoe.preview=null;closeMenu();if(panel){panel.remove();panel=null}V.requestDraw()},
  down(wx,wy,e){if(e&&e.isPrimary===false)return;closeMenu();aoe.downAt=[e?e.clientX:0,e?e.clientY:0];
    if(!aoe.origin){const hs=hitShape(wx,wy);if(hs){aoe.hit=hs;return}const o=originFor(wx,wy);aoe.origin=o;aoe.preview=mkPreview(o[0],o[1],null,null);aoe.dragging=true}
    else{aoe.dragging=true;aoe.preview=mkPreview(aoe.origin[0],aoe.origin[1],wx,wy)}V.requestDraw()},
  move(wx,wy){if(!aoe.origin)return;aoe.preview=mkPreview(aoe.origin[0],aoe.origin[1],wx,wy);V.requestDraw()},
  hover(wx,wy){if(!aoe.origin||aoe.dragging)return;aoe.preview=mkPreview(aoe.origin[0],aoe.origin[1],wx,wy);V.requestDraw()},
  up(wx,wy,e){const moved=e&&aoe.downAt?Math.hypot(e.clientX-aoe.downAt[0],e.clientY-aoe.downAt[1])>8:false;aoe.dragging=false;
    if(aoe.hit){const s=aoe.hit;aoe.hit=null;if(!moved){const [sx,sy]=toScreen(s.x,s.y);openMenu(s,sx,sy)}return}
    if(!aoe.origin)return;const directional=aoe.kind==='cone'||aoe.kind==='line';
    // тап по сфере/кубу — сразу ставим; конус/линия/куб с протяжкой — направление из протяжки; конус/линия без протяжки — ждём второе касание
    if(!moved&&directional&&!aoe.awaitDir){aoe.awaitDir=true;aoe.preview=mkPreview(aoe.origin[0],aoe.origin[1],null,null);refreshPanel();V.requestDraw();return}
    const p=moved||aoe.awaitDir?mkPreview(aoe.origin[0],aoe.origin[1],wx,wy):mkPreview(aoe.origin[0],aoe.origin[1],null,null);
    aoe.origin=null;aoe.awaitDir=false;aoe.preview=null;refreshPanel();V.requestDraw();saveShape(p)}});

/* ---------- Мастер: очистка ---------- */
V.addGmSection(()=>{const here=shapes.filter(s=>s.map===V.st().map);return[h('h3',{},'Области заклинаний'),
  h('div',{class:'row'},h('span',{class:'small muted'},here.length?`На этой карте: ${here.length}.`:'На этой карте областей нет.'),
    h('button',{class:'btn sm',type:'button',disabled:!here.length,onclick:async()=>{for(const s of here)await V.store.del('shapes/'+s.id);V.toast('Области убраны')}},'Очистить все области на карте'))]});
window.addEventListener('resize',()=>refreshPanel());
})();
