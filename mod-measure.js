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
.mm-dock .mm-li{white-space:nowrap}
/* панель «В области» и окно эффекта */
.mm-hit{position:fixed;z-index:6;background:var(--panel,#111819);border:1px solid var(--brass,#d9b36c);border-radius:10px;padding:8px 10px;display:grid;gap:6px;box-shadow:0 6px 20px rgba(0,0,0,.5);font-size:13px;color:var(--ink,#e3ebe8);max-width:calc(100vw - 16px);box-sizing:border-box}
.mm-hh{display:flex;align-items:center;gap:8px;min-width:0}
.mm-hh>b{white-space:nowrap}
.mm-sub{color:var(--muted,#8e9e9b);font-size:12px;min-width:0;overflow-wrap:anywhere}
.mm-hh .mm-sub{flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.mm-x{margin-left:auto;flex:0 0 auto}
.mm-names{display:flex;flex-wrap:wrap;gap:4px;max-height:84px;overflow:auto}
.mm-chip{border:1px solid var(--line,#243235);border-radius:999px;padding:2px 8px;font-size:12px;background:var(--panel2,#162022);max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-chip.mon{border-color:rgba(229,138,128,.5)}
.mm-ov{position:fixed;inset:0;z-index:60;background:rgba(0,0,0,.55);display:flex;align-items:center;justify-content:center;padding:8px;box-sizing:border-box}
.mm-dlg{width:min(440px,100%);max-height:calc(100vh - 16px);max-height:calc(100dvh - 16px);overflow:auto;background:var(--panel,#111819);border:1px solid var(--brass,#d9b36c);border-radius:12px;padding:12px;display:grid;gap:10px;box-shadow:0 10px 30px rgba(0,0,0,.6);color:var(--ink,#e3ebe8);font-size:14px;box-sizing:border-box}
.mm-dlg .mm-hh>b{font-size:16px;white-space:normal}
.mm-db{display:grid;gap:8px;min-width:0}
.mm-form{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.mm-fl{display:grid;gap:3px;min-width:0;font-size:12px;color:var(--muted,#8e9e9b)}
.mm-fl input,.mm-fl select{width:100%;box-sizing:border-box;color:var(--ink,#e3ebe8);min-height:34px}
.mm-foot{justify-content:flex-end}
.mm-sum{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap;color:var(--muted,#8e9e9b);font-size:13px}
.mm-big{font-family:var(--f-mono,monospace);font-size:26px;color:var(--brass,#d9b36c)}
.mm-res{display:grid;gap:2px;margin-top:4px;min-width:0}
.mm-tr{display:grid;grid-template-columns:minmax(0,1fr) 34px 54px 38px;gap:6px;align-items:center;padding:4px 2px;border-top:1px solid var(--line,#243235);font-size:13px}
.mm-res.gm .mm-tr{grid-template-columns:22px minmax(0,1fr) 34px 54px 38px}
.mm-tr.mm-th{border-top:0;color:var(--muted,#8e9e9b);font-size:11px;text-transform:uppercase;letter-spacing:.04em;padding-top:0}
.mm-tr.off{opacity:.45}
.mm-tr input[type=checkbox]{width:18px;height:18px;margin:0;accent-color:var(--brass,#d9b36c)}
.mm-nm{min-width:0;display:grid}.mm-nm>span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.mm-nm small{color:var(--warn,#e8c46a);font-size:11px;overflow-wrap:anywhere}
.mm-n{font-family:var(--f-mono,monospace);text-align:right}
.mm-ok{color:var(--ok,#8fcf8a)}.mm-bad{color:var(--danger,#e58a80)}
.mm-log .mm-res{margin-top:6px}
.mm-cnd{color:var(--sea,#8fd1c4)!important}
.mm-cond{font-size:13px;color:var(--muted,#8e9e9b);border:1px dashed var(--line,#243235);border-radius:8px;padding:6px 8px}.mm-cond b{color:var(--sea,#8fd1c4)}
.mm-pick{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:4px;max-height:200px;overflow:auto}
.mm-pk{display:flex;align-items:center;gap:6px;border:1px solid var(--line,#243235);border-radius:8px;padding:4px 8px;min-height:36px;cursor:pointer;min-width:0}
.mm-pk span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.mm-pk input{width:18px;height:18px;margin:0;accent-color:var(--brass,#d9b36c);flex:0 0 auto}
@media (max-width:600px){.mm-pk{min-height:40px}.mm-pk input{width:22px;height:22px}}.mm-log .mm-row{margin-top:6px}
@media (max-width:600px){.mm-hit .btn,.mm-dlg .btn,.mm-log .btn{min-height:40px;min-width:40px}.mm-fl input,.mm-fl select{min-height:40px;font-size:16px}
  .mm-tr input[type=checkbox]{width:22px;height:22px}.mm-res.gm .mm-tr{grid-template-columns:26px minmax(0,1fr) 30px 50px 36px}.mm-tr{grid-template-columns:minmax(0,1fr) 30px 50px 36px;min-height:36px}
  .mm-dlg{padding:10px;align-self:flex-end}.mm-ov{align-items:flex-end}}`;
document.head.append(css);

const narrow=()=>innerWidth<600;
const onceHint=(key,txt)=>{let seen=false;try{seen=localStorage.getItem('vtt-hint-'+key)==='1';localStorage.setItem('vtt-hint-'+key,'1')}catch(e){}if(seen)return'';setTimeout(()=>{const el=document.getElementById('hint');if(el&&el.textContent===txt)V.setHint('')},3000);return txt};
const KINDS=[['cone','Конус'],['sphere','Сфера'],['line','Линия'],['cube','Куб']];
const COLORS=[['#e8734a','огонь'],['#6fb7e8','холод'],['#9fd36a','яд'],['#c79bf0','магия']];
const KNAME=Object.fromEntries(KINDS);
let shapes=[];V.watch('shapes',a=>{shapes=a.filter(s=>KNAME[s.kind]);// shapes/<id> kind:'light' — источники света заклинаний (mod-spells.js), тут не рисуются
  V.requestDraw();refreshPanel();if(hl.shape&&!a.some(s=>s.id===hl.shape.id))closeHits()});
const hl={shape:null,ids:[]};// подсветка существ в только что поставленной области

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
// Кто в области (Книга игрока 2014, гл. 10 «Области действия» + вариант сетки из Руководства Мастера):
// существо задето, если шаблон накрывает хотя бы одну клетку, которую оно занимает; клетка накрыта,
// если её центр внутри фигуры (это те же клетки, что подсвечены на карте, — «накрыта хотя бы половина клетки»).
// Большая фишка (2×2, 3×3…) задета, если накрыта любая её клетка. Без сетки — центр фишки или точка на её краю.
// Заклинатель, из которого исходит область «на себя» (конус, линия, аура), сам в неё не входит.
function covers(s,m,t){const c=m.grid||cellOf(m),n=Math.max(1,t.size||1),half=n*c/2;
  if(m.grid){for(let i=0;i<n;i++)for(let j=0;j<n;j++)if(inside(s,m,t.x-half+(i+.5)*c,t.y-half+(j+.5)*c))return true;return false}
  if(inside(s,m,t.x,t.y))return true;const r=half*.7;for(let k=0;k<8;k++){const a=k*Math.PI/4;if(inside(s,m,t.x+Math.cos(a)*r,t.y+Math.sin(a)*r))return true}return false}
const tokensIn=(s,m)=>V.tokList().filter(t=>t.map===s.map&&t.id!==s.from&&covers(s,m,t));

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
  if(hl.ids.length){const c=m.grid||cellOf(m);g.lineWidth=3/z;g.setLineDash([7/z,4/z]);g.strokeStyle='#ffe08a';
    for(const id of hl.ids){const t=V.S.tokens[id];if(!t||t.map!==m.id||!V.canSee(t))continue;g.beginPath();g.arc(t.x,t.y,(t.size||1)*c/2+3/z,0,7);g.stroke()}g.setLineDash([])}
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
  if((aoe.kind==='cone'||aoe.kind==='line'||aoe.self)&&!dx&&!dy){dx=1;dy=0}
  // область «на себя» (конус, линия, куб) начинается от края фишки заклинателя в сторону направления
  if(aoe.self){ox=aoe.self.x+dx*aoe.self.r;oy=aoe.self.y+dy*aoe.self.r}
  const p={map:m.id,kind:aoe.kind,x:Math.round(ox),y:Math.round(oy),dx:+dx.toFixed(4),dy:+dy.toFixed(4),size:aoe.size,color:aoe.color};if(aoe.self)p.from=aoe.self.tid;return p}
function originFor(wx,wy){const m=V.mapInfo();if(!m.grid)return[wx,wy];
  // сфера/куб по центру — в центр клетки; конус/линия начинаются на пересечении линий сетки (как в Книге игрока)
  if(aoe.kind==='sphere')return[Math.round(wx/m.grid)*m.grid,Math.round(wy/m.grid)*m.grid];
  return[Math.round(wx/m.grid)*m.grid,Math.round(wy/m.grid)*m.grid]}
async function saveShape(p){if(V.readOnly)return null;const id=V.store.newId('shapes');const s={...p,by:V.myId,who:V.whoAmI(),ts:Date.now()};await V.store.set('shapes/'+id,s);
  const n=tokensIn(p,V.mapInfo()).filter(t=>V.canSee(t)).length;V.toast(`${KNAME[p.kind]} ${p.size} фт ${p.kind==='sphere'||p.kind==='line'?'поставлена':'поставлен'}${n?` · в области: ${n}`:''}`);
  const shape={...s,id},eff=aoe.pending;aoe.pending=null;aoe.self=null;
  if(eff&&(eff.dice||eff.save||eff.cond))openEffect(shape,eff);else showHits(shape);return shape}
function hitShape(wx,wy){const r=18/V.cam.z,id=V.st().map;return shapes.slice().reverse().find(s=>s.map===id&&Math.hypot(s.x-wx,s.y-wy)<=r)}
function closeMenu(){if(menu){menu.remove();menu=null}}
function openMenu(s,sx,sy){closeMenu();const m=V.mapInfo(),mine=s.by===V.myId||V.isOwner;
  const kids=[h('div',{class:'mm-who'},`${KNAME[s.kind]} ${s.size} фт · ${s.who||'Игрок'}`)];
  if(V.isOwner){const ts=tokensIn(s,m);kids.push(h('b',{},ts.length?'В области:':'В области никого нет'));if(ts.length)kids.push(h('ul',{},...ts.map(t=>h('li',{},t.name+(t.hidden?' (скрыт)':'')))))}
  else{const ts=tokensIn(s,m).filter(t=>V.canSee(t));if(ts.length)kids.push(h('div',{},'Видно в области: '+ts.map(t=>t.name).join(', ')))}
  kids.push(h('div',{class:'mm-row',style:'margin-top:8px'},!V.readOnly?h('button',{class:'mm-b',type:'button',onclick:()=>{closeMenu();openEffect(s,{})}},'Применить эффект…'):null,mine&&!V.readOnly?h('button',{class:'mm-b',type:'button',onclick:async()=>{await V.store.del('shapes/'+s.id);closeMenu()}},'Убрать'):null,h('button',{class:'mm-b',type:'button',onclick:closeMenu},'Закрыть')));
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
    h('div',{class:'mm-row'},...KINDS.map(([k,n])=>h('button',{class:'mm-b',type:'button','aria-pressed':String(aoe.kind===k),onclick:()=>{aoe.kind=k;aoe.origin=null;aoe.self=null;aoe.awaitDir=false;aoe.preview=null;refreshPanel();V.requestDraw()}},n))),
    h('div',{class:'mm-row'},...[10,15,20,30,60].map(n=>h('button',{class:'mm-b',type:'button','aria-pressed':String(aoe.size===n),onclick:()=>{aoe.size=n;refreshPanel()}},n)),sz,h('span',{},'фт')),
    h('div',{class:'mm-row'},...COLORS.map(([c,n])=>h('button',{class:'mm-c',type:'button',title:n,'aria-label':n,'aria-pressed':String(aoe.color===c),style:`background:${c}`,onclick:()=>{aoe.color=c;refreshPanel()}})),
      h('span',{class:'mm-tip',style:'color:#8e9e9b;font-size:12px'},tip)),
    h('button',{class:'mm-b mm-q',type:'button',title:tip,'aria-label':'Как ставить область',onclick:()=>V.toast(tip)},'?'),
    mineHere.length?h('div',{class:'mm-list'},...mineHere.map(s=>h('div',{class:'mm-li'},h('span',{},`${KNAME[s.kind]} ${s.size} фт · ${s.who||''}`),h('button',{class:'mm-b',type:'button',style:'min-height:28px;padding:3px 8px',onclick:()=>V.store.del('shapes/'+s.id)},'✕')))):null)}
V.addTool({id:'aoe',icon:'🔥',title:'Область заклинания: конус, сфера, линия, куб',get hint(){return onceHint('aoe','Коснитесь карты — область')},
  activate(){if(!panel){panel=h('div',{class:'mm-panel'});(V.overlay()||document.body).append(panel)}refreshPanel()},
  cancel(){aoe.origin=null;aoe.preview=null;aoe.self=null;aoe.pending=null;aoe.awaitDir=false;closeMenu();if(panel){panel.remove();panel=null}V.requestDraw()},
  down(wx,wy,e){if(e&&e.isPrimary===false)return;closeMenu();aoe.downAt=[e?e.clientX:0,e?e.clientY:0];
    if(!aoe.origin){const hs=hitShape(wx,wy);closeHits();if(hs){aoe.hit=hs;return}const o=originFor(wx,wy);aoe.origin=o;aoe.preview=mkPreview(o[0],o[1],null,null);aoe.dragging=true}
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

/* ---------- кто в области: панель «В области: N» ---------- */
let hitBox=null;
function closeHits(){if(hitBox){hitBox.remove();hitBox=null}if(!effBox){hl.shape=null;hl.ids=[]}V.requestDraw()}
function placeHits(){if(!hitBox)return;const r=cvRect(),nw=narrow(),left=r.left+(nw?54:56),w=Math.min(360,r.right-left-(nw?54:12));hitBox.style.left=left+'px';hitBox.style.top=(r.top+8)+'px';hitBox.style.width=Math.max(200,w)+'px'}
addEventListener('resize',placeHits);
function showHits(s){const m=V.mapInfo();const all=tokensIn(s,m);const vis=V.isGM()?all:all.filter(t=>V.canSee(t));
  hl.shape=s;hl.ids=vis.map(t=>t.id);V.requestDraw();if(hitBox)hitBox.remove();
  hitBox=h('div',{class:'mm-hit',role:'region','aria-label':'Существа в области'},
    h('div',{class:'mm-hh'},h('b',{},`В области: ${vis.length}`),h('span',{class:'mm-sub'},`${KNAME[s.kind]} ${s.size} фт`),h('button',{class:'btn sm mm-x',type:'button','aria-label':'Закрыть',onclick:closeHits},'✕')),
    vis.length?h('div',{class:'mm-names'},...vis.map(t=>h('span',{class:'mm-chip'+(t.kind==='monster'?' mon':'')},t.name+(t.hidden?' (скрыт)':'')))):h('div',{class:'mm-sub'},'Никого — уберите область и поставьте заново.'),
    V.readOnly?null:h('div',{class:'mm-row'},h('button',{class:'btn pri sm',type:'button',disabled:!all.length,onclick:()=>openEffect(s,{})},'Применить эффект…'),h('button',{class:'btn sm',type:'button',onclick:async()=>{await V.store.del('shapes/'+s.id);closeHits()}},'Убрать область')));
  (V.overlay()||document.body).append(hitBox);placeHits()}

/* ---------- эффект по области: спасброски и урон ---------- */
const SAVES=[['str','Сил'],['dex','Лов'],['con','Тел'],['int','Инт'],['wis','Мдр'],['cha','Хар']],SAVEN=Object.fromEntries(SAVES);
const AUTO_FAIL=['Парализован','Ошеломлён','Без сознания','Окаменел'];
const md=v=>Math.floor((Number(v||10)-10)/2),sg=n=>(n>=0?'+':'')+n;
const lc=x=>String(x||'').toLowerCase().replace(/ё/g,'е');
const DT=[['fire',/огон|огн|пламен/],['cold',/холод|мороз/],['lightning',/электр|молни/],['thunder',/звук|гром/],['acid',/кислот/],['poison',/(^|[^а-я])яд|отрав/],['necrotic',/некрот/],['radiant',/излуч|сиян|свят/],['force',/силов/],['psychic',/психи/],['bludgeoning',/дробя/],['piercing',/колю/],['slashing',/рубя/]];
const dtKeys=x=>{const s=lc(x);return DT.filter(([k,r])=>r.test(s)||s.includes(k)).map(([k])=>k)};
const bestOf=t=>{const B=window.BESTIARY||{};return t.kind==='monster'?(B[t.monster]||B[t.name]||null):null};
function saveBonus(t,ab){
  if(t.kind==='monster'){const bx=bestOf(t);if(bx&&bx.saves&&bx.saves[ab]!=null)return Number(bx.saves[ab])||0;const b=(V.BEST||{})[t.monster];return ab==='dex'&&b?Number(b.dex)||0:0}
  const c=V.S.chars[t.id];if(!c)return 0;return md(c[ab])+((c.saves||[]).includes(ab)?(Number(c.prof)||2):0)}
// сопротивление/иммунитет/уязвимость: у монстров — из window.BESTIARY, у героев — поля resist/immune/vuln листа, если есть
function defenses(t,type,magic){const src=t.kind==='monster'?bestOf(t):V.S.chars[t.id];const keys=dtKeys(type);if(!src||!keys.length)return{mult:1,note:''};
  const hit=f=>keys.filter(k=>[].concat(src[f]||[]).some(x=>!(magic&&/немагич|nonmagic/.test(lc(x)))&&dtKeys(x).includes(k)));
  for(const [f,mult,n] of [['immune',0,'иммунитет'],['resist',.5,'сопротивление'],['vuln',2,'уязвимость']]){const hk=hit(f);if(!hk.length)continue;
    if(hk.length===keys.length)return{mult,note:n};return{mult:1,note:`${n} к части урона — учтите вручную`}}
  return{mult:1,note:''}}
// состояние при провале (eff.cond): иммунитет по BESTIARY.condImmune (там русские слова), фильтр по типу существа (eff.only, напр. «гуманоид»)
const CIMM={'Без сознания':/бессозн/,'Опутан':/опутан/,'Парализован':/парал/,'Испуган':/испуг/,'Ослеплён':/ослеп/,'Очарован':/очаров/,'Отравлен':/отравл/,'Сбит с ног':/сбива/,'Ошеломлён':/ошелом/,'Схвачен':/захват/,'Недееспособен':/недеесп/};
function condBlock(t,eff){const bx=bestOf(t),ci=lc([].concat(bx&&bx.condImmune||[]).join(' ')),ty=lc(bx&&bx.type);
  if(eff.only&&t.kind==='monster'&&ty&&!ty.includes(eff.only))return'не '+eff.only+' — не действует';
  if(CIMM[eff.cond]&&CIMM[eff.cond].test(ci))return'иммунитет к состоянию';
  if(eff.charm&&/очаров/.test(ci))return'иммунитет к очарованию';
  if(eff.noUndead&&/нежить/.test(ty))return'нежить — не действует';
  if(V.has(t,eff.cond))return'уже: '+eff.cond.toLowerCase();
  return''}
const hideOf=t=>!!(t.hidden||V.has(t,'Невидим')||!V.canSee(t));// скрыт от игроков: в журнале его видит только Мастер
function resolveEffect(eff,targets){const dr=eff.dice?V.roll(eff.dice):null;if(eff.dice&&!dr){V.toast('Не понял кубы: '+eff.dice);return null}
  const base=dr?Math.max(0,dr.total):0;
  const rows=targets.map(t=>{const r={tid:t.id,name:t.name,h:hideOf(t)};
    if(eff.save){const auto=(eff.save==='str'||eff.save==='dex')&&AUTO_FAIL.find(c=>V.has(t,c));
      if(auto){r.ok=false;r.roll=null;r.note=auto+' — авто-провал'}
      else{const b=saveBonus(t,eff.save),mode=eff.save==='dex'&&V.has(t,'Опутан')?'dis':null,x=V.roll('1d20'+sg(b),mode);r.roll=x.total;r.det=x.det+(mode?' помеха (опутан)':'');r.ok=x.total>=eff.dc}}
    if(eff.dice){let d=base;if(eff.save&&r.ok)d=eff.half?Math.floor(base/2):0;const df=defenses(t,eff.type,!!eff.spell);if(df.mult!==1)d=Math.floor(d*df.mult);if(df.note)r.note=(r.note?r.note+'; ':'')+df.note;r.dmg=d}
    if(eff.cond&&(!eff.save||r.ok===false)){const why=condBlock(t,eff);if(why)r.note=(r.note?r.note+'; ':'')+why;else{r.cond=true;r.note=(r.note?r.note+'; ':'')+'→ '+eff.cond}}
    return r});
  return{base,det:dr?dr.det:'',rows}}
// «Сон», «Сверкающие брызги»: пул хитов, начиная с существа с наименьшими текущими хитами. Хиты монстров знает только Мастер.
const hpOf=t=>t.kind==='monster'?(V.S.gm&&V.S.gm[t.id]?Number(V.S.gm[t.id].hp):null):Number(t.hp);
const needGM=(eff,targets)=>!!eff.pool&&!V.isGM()&&targets.some(t=>t.kind==='monster');
function poolRows(eff,targets,pool){let left=pool,stop=false;const rows=targets.map(t=>({tid:t.id,name:t.name,h:hideOf(t),t}));const cand=[];
  for(const r of rows){const t=r.t,hp=hpOf(t);const why=condBlock(t,eff)||(hp==null?'хиты неизвестны':hp<=0||V.has(t,'Без сознания')?'без сознания — не действует':'');if(why)r.note=why;else cand.push(r)}
  cand.sort((a,b)=>hpOf(a.t)-hpOf(b.t));
  for(const r of cand){const hp=hpOf(r.t);if(!stop&&hp<=left){left-=hp;r.cond=true;r.note='→ '+eff.cond}else{stop=true;r.note='пула не хватило'}}
  for(const r of rows)delete r.t;return rows}
function fxOf(eff,rows){const ids=rows.filter(r=>r.cond).map(r=>r.tid);return eff.cond&&ids.length?{targets:ids,cond:eff.cond,glow:eff.glow||0,src:eff.src||null,spell:eff.spell||null}:null}
async function resolvePoolGM(m){if(!V.isGM())return;const cur=(V.S.log||[]).find(x=>x.id===m.id)||m;if(!cur.aoe.pending)return V.toast('Уже распределено.');
  const a=cur.aoe,targets=(a.tids||[]).map(id=>V.S.tokens[id]).filter(Boolean),rows=poolRows(a,targets,a.base),fx=fxOf(a,rows);
  await V.store.update('log/'+m.id,{aoe:{...a,rows,pending:false}});
  await V.post({kind:'sys',text:`${a.spell?'«'+a.spell+'»':'Эффект'}: ${rows.filter(r=>r.cond).map(r=>r.name).join(', ')||'никто'} — ${a.cond.toLowerCase()}`,...(fx?{fx}:{})})}
function effText(e){if(e.pool)return`пул хитов ${e.dice} → ${e.cond.toLowerCase()}`;return[e.dice?`урон ${e.dice}${e.type?' '+e.type:''}`:null,e.save?`спасбросок ${SAVEN[e.save]} СЛ ${e.dc}${e.dice?', при успехе '+(e.half?'половина':'урона нет'):''}`:'без спасброска',e.cond?`при провале — ${e.cond}${e.glow?`, свечение ${e.glow} фт`:''}`:null].filter(Boolean).join(' · ')}
const skips=new Map();// снятые Мастером галочки: id записи журнала → Set(id фишек)
const skipOf=id=>{if(!skips.has(id))skips.set(id,new Set());return skips.get(id)};
async function applyAoe(m){if(!V.isGM())return V.toast('Урон наносит Мастер.');const cur=(V.S.log||[]).find(x=>x.id===m.id)||m;if(cur.aoeDone)return V.toast('Урон по этой области уже нанесён.');
  const sk=skipOf(m.id),rows=m.aoe.rows.filter(r=>!sk.has(r.tid)&&r.dmg>0&&V.S.tokens[r.tid]);m.aoeDone=true;
  await V.store.update('log/'+m.id,{aoeDone:true,aoeApplied:rows.map(r=>r.tid)});
  for(const r of rows)await V.applyHp(r.tid,r.dmg,'dmg');V.toast(rows.length?`Урон нанесён: ${rows.length}`:'Некому наносить урон')}
function resultView(m){const a=m.aoe,gm=V.isGM(),done=!!m.aoeDone,sk=skipOf(m.id);
  if(a.pending)return h('div',{class:'mm-res'},h('div',{class:'mm-sub'},`Пул ${a.base} хитов: кто ${a.cond==='Без сознания'?'уснёт':'поддастся'}, решит Мастер — он знает хиты существ.`),
    gm&&!V.readOnly?h('div',{class:'mm-row'},h('button',{class:'btn pri',type:'button',onclick:async e=>{e.currentTarget.disabled=true;await resolvePoolGM(m);if(effBox&&effBox.dataset.mid===m.id)closeEffect()}},'Распределить пул')):null);
  const rows=gm?a.rows:a.rows.filter(r=>!r.h);const hidden=a.rows.length-rows.length;
  const box=h('div',{class:'mm-res'+(gm&&!done&&a.dice&&!a.pool?' gm':'')}),chk=gm&&!done&&a.dice&&!a.pool;
  box.append(h('div',{class:'mm-tr mm-th'},chk?h('span',{}):null,h('span',{},'Кто'),h('span',{},a.save?'к20':''),h('span',{},a.save?'Итог':''),h('span',{},a.dice&&!a.pool?'Урон':'')));
  for(const r of rows){const cb=chk?h('input',{type:'checkbox',checked:!sk.has(r.tid),'aria-label':'Наносить урон: '+r.name,onchange:e=>{e.target.checked?sk.delete(r.tid):sk.add(r.tid)}}):null;
    box.append(h(chk?'label':'div',{class:'mm-tr'+(done&&a.dice&&!(m.aoeApplied||[]).includes(r.tid)?' off':'')},cb,h('span',{class:'mm-nm',title:r.det||''},h('span',{},r.name+(r.h&&gm?' (скрыт)':'')),r.note?h('small',{class:r.cond?'mm-cnd':''},r.note):null),
      h('span',{class:'mm-n',title:r.det||''},a.save?(r.roll==null?'—':String(r.roll)):''),h('span',{class:a.save?(r.ok?'mm-ok':'mm-bad'):''},a.save?(r.ok?'успех':'провал'):''),h('b',{class:'mm-n'},a.dice&&!a.pool?String(r.dmg):'')))}
  if(hidden>0)box.append(h('div',{class:'mm-sub'},`и ещё ${hidden} — видит Мастер`));
  if(a.cond&&rows.some(r=>r.cond))box.append(h('div',{class:'mm-sub'},`Состояние «${a.cond}» Мастер ставит автоматически${a.src?' — снимется, когда заклинатель потеряет концентрацию':''}.`));
  if(a.pool);else if(gm&&a.dice&&!V.readOnly)box.append(done?h('div',{class:'mm-sub'},'✔ Урон нанесён'):h('div',{class:'mm-row'},h('button',{class:'btn pri',type:'button',onclick:async e=>{e.currentTarget.disabled=true;await applyAoe(m);if(effBox&&effBox.dataset.mid===m.id)closeEffect()}},'Нанести всем')));
  else if(a.dice&&!done)box.append(h('div',{class:'mm-sub'},'Урон нанесёт Мастер.'));
  return box}
V.addLogRenderer(m=>{if(!m||!m.aoe||!Array.isArray(m.aoe.rows))return null;
  return h('div',{class:'msg roll mm-log'},h('div',{class:'who'},`${m.who||''} · ${new Date(m.ts||Date.now()).toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})}`),h('div',{},String(m.text||'')),
    m.aoe.dice?h('div',{},h('span',{class:'tot'},String(m.total)),' ',h('span',{class:'det'},String(m.det||''))):h('div',{class:'det'},String(m.det||'')),resultView(m))});

let effBox=null;
function closeEffect(){if(effBox){effBox.remove();effBox=null}if(!hitBox){hl.shape=null;hl.ids=[]}V.requestDraw()}
addEventListener('keydown',e=>{if(e.key==='Escape'&&effBox)closeEffect()});
// s — шаблон области; s=null — цели выбираются из списка видимых (pre.maxTargets, по умолчанию 1)
function openEffect(s,pre){closeEffect();closeHits();const m=V.mapInfo();pre=pre||{};
  const pickList=s?null:V.tokList().filter(t=>t.map===m.id&&V.canSee(t)&&t.id!==pre.src);const maxT=Math.max(1,pre.maxTargets||1);const picked=new Set();
  const areaT=s?tokensIn(s,m):[];const getTargets=()=>s?areaT:pickList.filter(t=>picked.has(t.id));
  const vis=V.isGM()?areaT:areaT.filter(t=>V.canSee(t));
  hl.shape=s;hl.ids=vis.map(t=>t.id);V.requestDraw();
  const pool=!!pre.pool;
  const dice=h('input',{type:'text',value:pre.dice||'',placeholder:pool?'5d8':'8d6',autocomplete:'off','aria-label':pool?'Пул хитов, кубы':'Урон, кубы'});
  const type=h('input',{type:'text',value:pre.type||'',placeholder:'огонь','aria-label':'Тип урона'});
  const sv=h('select',{'aria-label':'Спасбросок'},h('option',{value:''},'без спасброска'),...SAVES.map(([k,n])=>h('option',{value:k,selected:pre.save===k},n)));
  const dc=h('input',{type:'number',min:1,max:30,value:pre.dc||13,'aria-label':'Сложность'});
  const half=h('select',{'aria-label':'При успехе'},h('option',{value:'1',selected:pre.half!==false},'половина'),h('option',{value:'0',selected:pre.half===false},'ничего'));
  const lab=(t,el,cls)=>h('label',{class:'mm-fl'+(cls?' '+cls:'')},h('span',{},t),el);
  const sync=()=>{const on=!!sv.value;dc.disabled=!on;half.disabled=!on||!!pre.cond&&!dice.value.trim()};sv.onchange=sync;dice.oninput=sync;sync();
  const title=pre.spell?`«${pre.spell}»`:'Эффект по области';
  const body=h('div',{class:'mm-db'});
  const go=h('button',{class:'btn pri',type:'button',disabled:true},'🎲 Бросить');
  const canGo=()=>{go.disabled=V.readOnly||!getTargets().length};
  const form=pool?h('div',{class:'mm-form'},lab('Пул хитов (кубы)',dice,'w2')):pre.cond&&!pre.dice?h('div',{class:'mm-form'},lab('Спасбросок',sv),lab('СЛ',dc)):h('div',{class:'mm-form'},lab('Урон (кубы)',dice),lab('Тип урона',type),lab('Спасбросок',sv),lab('СЛ',dc),pre.cond?null:lab('При успехе',half,'w2'));
  body.append(form);
  if(pre.cond)body.append(h('div',{class:'mm-cond'},`${pool?'Поддаются':'При провале'}: `,h('b',{},pre.cond),pre.glow?` · тусклое свечение ${pre.glow} фт`:'',pre.only?` · только: ${pre.only}`:'',pre.src?' · концентрация':''));
  if(pickList){const cnt=h('span',{class:'mm-sub'},`выбрано 0 из ${maxT}`);
    body.append(h('div',{class:'mm-sub'},maxT>1?`Цели (до ${maxT}):`:'Цель:'),pickList.length?h('div',{class:'mm-pick'},...pickList.map(t=>h('label',{class:'mm-pk'},h('input',{type:maxT>1?'checkbox':'radio',name:'mm-tg',onchange:e=>{if(maxT===1)picked.clear();if(e.target.checked){if(picked.size>=maxT){e.target.checked=false;return V.toast(`Не больше ${maxT}.`)}picked.add(t.id)}else picked.delete(t.id);cnt.textContent=`выбрано ${picked.size} из ${maxT}`;canGo()}}),h('span',{},t.name)))):h('div',{class:'mm-sub'},'На карте нет видимых целей.'),...(maxT>1?[cnt]:[]))}
  else body.append(h('div',{class:'mm-sub'},vis.length?'Цели: '+vis.map(t=>t.name).join(', '):'В области никого нет.'));
  canGo();
  const foot=h('div',{class:'mm-row mm-foot'},go,h('button',{class:'btn',type:'button',onclick:closeEffect},'Отмена'));
  go.onclick=async()=>{const targets=getTargets();
    const eff={dice:dice.value.trim().replace(/к/gi,'d').replace(/\s+/g,''),type:pool?'':type.value.trim().slice(0,40),save:pool?null:sv.value||null,dc:Math.max(1,Math.min(30,Number(dc.value)||10)),half:half.value==='1',spell:pre.spell||null,caster:pre.caster||null,
      cond:pre.cond||null,glow:pre.glow||0,src:pre.src||null,only:pre.only||null,charm:!!pre.charm,noUndead:!!pre.noUndead,pool};
    if(pool&&!eff.dice)return V.toast('Укажите кубы пула хитов.');
    if(!eff.dice&&!eff.save&&!eff.cond)return V.toast('Укажите урон или спасбросок.');
    if(V.readOnly||!targets.length)return;let res,fx=null,pending=false;
    if(pool){const r=V.roll(eff.dice);if(!r)return V.toast('Не понял кубы: '+eff.dice);pending=needGM(eff,targets);res={base:r.total,det:r.det,rows:pending?[]:poolRows(eff,targets,r.total)}}
    else{res=resolveEffect(eff,targets);if(!res)return}
    if(!pending)fx=fxOf(eff,res.rows);go.disabled=true;
    const id=V.store.newId('log'),seen=res.rows.filter(r=>!r.h),where=s?`${KNAME[s.kind].toLowerCase()} ${s.size} фт, в области ${s?areaT.filter(t=>!hideOf(t)).length:0}`:`цели: ${targets.filter(t=>!hideOf(t)).map(t=>t.name).join(', ')}`;
    const entry={ts:Date.now(),who:V.whoAmI(),by:V.myId,kind:'roll',
      text:`🎯 ${pre.caster?pre.caster+': ':''}${title} — ${where}${eff.save?` · провалили ${seen.filter(r=>r.ok===false).length}`:''}${eff.cond&&!pending?` · ${eff.cond.toLowerCase()}: ${seen.filter(r=>r.cond).length}`:''}`,
      total:eff.dice?res.base:eff.dc,det:pool?`пул хитов ${res.det}`:(eff.dice?`${res.det}${eff.type?' '+eff.type:''} · `:'')+(eff.save?`спасбросок ${SAVEN[eff.save]} СЛ ${eff.dc}${eff.dice?', при успехе '+(eff.half?'половина':'урона нет'):''}`:'без спасброска'),
      aoe:{...eff,base:res.base,rows:res.rows,shape:s?s.id:null,pending,tids:targets.map(t=>t.id)}};
    if(fx)entry.fx=fx;
    await V.store.set('log/'+id,entry);
    const msg={...entry,id};if(!effBox)return;effBox.dataset.mid=id;
    body.replaceChildren(h('div',{class:'mm-sum'},eff.dice?h('b',{class:'mm-big'},String(res.base)):null,h('span',{},effText(eff))),resultView(msg));
    foot.replaceChildren(h('button',{class:'btn',type:'button',onclick:closeEffect},'Закрыть'));
    if(!V.isGM())V.toast(pending?'Результат в журнале — пул распределит Мастер.':eff.dice?'Результат в журнале — урон нанесёт Мастер.':'Результат в журнале.')};
  effBox=h('div',{class:'mm-ov',onclick:e=>{if(e.target===effBox)closeEffect()}},h('div',{class:'mm-dlg',role:'dialog','aria-modal':'true','aria-label':'Применить эффект'},
    h('div',{class:'mm-hh'},h('b',{},title),h('span',{class:'mm-sub'},s?`${KNAME[s.kind]} ${s.size} фт · в области ${vis.length}`:maxT>1?`до ${maxT} целей`:'одна цель'),h('button',{class:'btn sm mm-x',type:'button','aria-label':'Закрыть',onclick:closeEffect},'✕')),body,foot));
  document.body.append(effBox);setTimeout(()=>{try{(pre.dice||pre.cond?go:dice).focus({preventScroll:true})}catch(e){}},30)}

/* ---------- для других модулей: V.aoe.start({kind,size,from,effect}) ---------- */
const TYPE_COL=[[/огон|огн|пламен|излуч/,'#e8734a'],[/холод|мороз/,'#6fb7e8'],[/яд|кислот|некрот/,'#9fd36a']];
function startAoe(o){if(V.readOnly)return;V.setTool('aoe');
  aoe.kind=KNAME[o.kind]?o.kind:'sphere';aoe.size=Math.max(5,Math.min(300,Number(o.size)||20));aoe.color=(TYPE_COL.find(([r])=>r.test(lc(o.effect&&o.effect.type)))||[0,'#c79bf0'])[1];
  aoe.pending=o.effect||null;aoe.self=null;aoe.origin=null;aoe.awaitDir=false;aoe.preview=null;closeHits();
  const m=V.mapInfo(),t=o.from&&V.S.tokens[o.from];
  if(t&&t.map===m.id){try{V.centerOn(t.x,t.y)}catch(e){}const r=(t.size||1)*(m.grid||cellOf(m))/2;
    if(aoe.kind==='sphere'){// аура «на себя»: радиус считается от края фишки заклинателя
      const sz=aoe.size;aoe.size=sz+(t.size||1)*2.5;const p=mkPreview(t.x,t.y,null,null);p.from=t.id;aoe.size=sz;refreshPanel();saveShape(p);return}
    aoe.self={tid:t.id,x:t.x,y:t.y,r};aoe.origin=[t.x,t.y];aoe.awaitDir=true;aoe.preview=mkPreview(t.x,t.y,null,null);V.toast('Коснитесь карты — куда направить: '+KNAME[aoe.kind].toLowerCase())}
  else V.toast(aoe.kind==='sphere'||aoe.kind==='cube'?'Коснитесь карты — центр области':'Коснитесь точки начала, потом направления');
  refreshPanel();V.requestDraw()}
V.aoe={start:startAoe,openEffect,tokensIn:s=>tokensIn(s,V.mapInfo())};

/* ---------- Мастер: очистка ---------- */
V.addGmSection(()=>{const here=shapes.filter(s=>s.map===V.st().map);return[h('h3',{},'Области заклинаний'),
  h('div',{class:'row'},h('span',{class:'small muted'},here.length?`На этой карте: ${here.length}.`:'На этой карте областей нет.'),
    h('button',{class:'btn sm',type:'button',disabled:!here.length,onclick:async()=>{for(const s of here)await V.store.del('shapes/'+s.id);V.toast('Области убраны')}},'Очистить все области на карте'))]});
window.addEventListener('resize',()=>refreshPanel());
})();
