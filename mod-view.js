/* mod-view.js — камера и наглядность фишек (как в Roll20):
   «Все смотрят сюда», значки состояний, ауры, подсветка хода, двойной тап по своей фишке. */
(function boot(){if(!window.VTT)return setTimeout(boot,50);window.VTT_VIEW=true;
const V=window.VTT,h=V.h;

/* ---------- стили ---------- */
const css=document.createElement('style');
css.textContent=`
.mv-turn{position:fixed;left:50%;top:calc(env(safe-area-inset-top,0px) + 70px);transform:translateX(-50%) scale(.9);z-index:45;
  background:#231d10;border:1px solid rgba(217,179,108,.8);color:#ffe6a0;font-family:"Alegreya SC",Georgia,serif;font-size:26px;
  padding:10px 26px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.6);opacity:0;transition:opacity .25s,transform .25s;pointer-events:none}
.mv-turn.on{opacity:1;transform:translateX(-50%) scale(1)}
.mv-aura{display:grid;gap:6px;margin-top:6px}
.mv-aura .mv-pre{display:flex;flex-wrap:wrap;gap:4px}
.mv-aura .mv-pre button{font-size:12px}
`;document.head.append(css);

/* ---------- плавный перелёт камеры ---------- */
let anim=0;
function flyTo(x,y,z){const c=V.cam,from={ox:c.ox,oy:c.oy,z:c.z},tz=Math.max(.15,Math.min(6,z||c.z));
  const to={z:tz,ox:V.VW/2-x*tz,oy:V.VH/2-y*tz},t0=performance.now();cancelAnimationFrame(anim);
  const step=now=>{const k=Math.min(1,(now-t0)/600),e=k<.5?2*k*k:1-Math.pow(-2*k+2,2)/2;
    c.z=from.z+(to.z-from.z)*e;c.ox=from.ox+(to.ox-from.ox)*e;c.oy=from.oy+(to.oy-from.oy)*e;V.requestDraw();if(k<1)anim=requestAnimationFrame(step)};
  anim=requestAnimationFrame(step)}

/* ---------- 1) «Все смотрят сюда» ---------- */
function pullView(x,y,z){const r=V.room;const d={x:Math.round(x),y:Math.round(y),z:Math.round((z||V.cam.z)*100)/100,map:V.st().map};
  if(r)r.emit('view',d).catch(()=>{});V.toast('Все игроки смотрят на это место')}
V.addTool({id:'pullview',icon:'🎯',title:'Все смотрят сюда: коснитесь места на карте',gmOnly:true,
  hint:'Коснитесь места на карте — камера всех игроков переедет туда.',
  down(wx,wy){pullView(wx,wy,V.cam.z);V.setTool('select')}});
V.addGmSection(()=>[h('h3',{},'Камера игроков'),
  h('div',{class:'row'},h('button',{class:'btn sm pri',type:'button',onclick:()=>{const c=V.cam;pullView((V.VW/2-c.ox)/c.z,(V.VH/2-c.oy)/c.z,c.z)}},'🎯 Показать всем мою текущую область')),
  h('p',{class:'small muted'},'Или инструмент 🎯 слева на карте: коснитесь места — у всех игроков камера плавно переедет туда.')]);
let roomBound=false;
function bindRoom(){if(roomBound||!V.room)return;roomBound=true;
  V.room.on('view',m=>{const d=m.data||{};if(m.isMe&&m.sameTab)return;if(typeof d.x!=='number'||d.map!==V.st().map)return;flyTo(d.x,d.y,d.z)})}
bindRoom();setTimeout(bindRoom,1500);

/* ---------- 2) значки состояний ---------- */
const ICON={'Ослеплён':'✖','Очарован':'💗','Оглохший':'🔇','Испуган':'😱','Схвачен':'✊','Недееспособен':'💫','Невидим':'👻','Парализован':'⚡',
  'Окаменел':'🪨','Отравлен':'🤢','Сбит с ног':'⬇️','Опутан':'🕸️','Ошеломлён':'😵','Без сознания':'💤','Концентрация':'🔮'};
const tokR=(t,m)=>(t.size||1)*V.cellPx(m)/2*.9;
V.onDraw('top',(g,m,cam)=>{for(const t of V.tokList()){if(t.map!==m.id||!(t.cond||[]).length||!V.canSee(t))continue;
  const r=tokR(t,m),ir=Math.max(7,r*.32),list=t.cond.slice(0,4),more=t.cond.length-list.length;
  list.forEach((c,i)=>{const a=-Math.PI*0.85+i*(Math.PI*0.42),x=t.x+Math.cos(a)*(r+ir*.35),y=t.y+Math.sin(a)*(r+ir*.35);
    g.beginPath();g.arc(x,y,ir,0,7);g.fillStyle='rgba(20,14,12,.92)';g.fill();g.lineWidth=Math.max(1.5,ir*.15);g.strokeStyle='#e58a80';g.stroke();
    g.font=`${Math.round(ir*1.15)}px "Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillStyle='#fff';g.fillText(ICON[c]||'•',x,y+ir*.05)});
  if(more>0){const x=t.x+r*.95,y=t.y+r*.55;g.beginPath();g.arc(x,y,ir*.85,0,7);g.fillStyle='#e58a80';g.fill();g.fillStyle='#111';g.font=`700 ${Math.round(ir)}px sans-serif`;g.textAlign='center';g.textBaseline='middle';g.fillText('+'+more,x,y+1)}}});

/* ---------- 3) ауры ---------- */
V.onDraw('map',(g,m)=>{for(const t of V.tokList()){const a=t.aura;if(t.map!==m.id||!a||!(a.r>0)||!V.canSee(t))continue;
  const R=tokR(t,m)+a.r*V.ftPx(m),col=/^#[0-9a-f]{6}$/i.test(a.color||'')?a.color:'#d9b36c';
  g.beginPath();g.arc(t.x,t.y,R,0,7);g.globalAlpha=.16;g.fillStyle=col;g.fill();g.globalAlpha=.7;g.lineWidth=2/V.cam.z;g.strokeStyle=col;g.setLineDash([8/V.cam.z,6/V.cam.z]);g.stroke();g.setLineDash([]);g.globalAlpha=1}});
const PRESETS=[['Аура паладина',10,'#e8c46a'],['Свет факела',20,'#ffb35c'],['Тьма',15,'#5b3d8a'],['Святая аура',30,'#8fd1c4']];
function auraEditor(t){const can=V.isGM();// ауры ставит только Мастер
const a=t.aura||{};
  const r=h('input',{type:'number',min:0,max:120,step:5,value:a.r||'','aria-label':'Радиус ауры, фт',placeholder:'фт'}),col=h('input',{type:'color',value:/^#[0-9a-f]{6}$/i.test(a.color||'')?a.color:'#d9b36c','aria-label':'Цвет ауры'});
  const save=(rr,cc)=>V.store.update('tokens/'+t.id,{aura:rr>0?{r:Math.min(120,Math.round(rr)),color:cc}:null});
  return h('div',{class:'card mv-aura'},h('b',{},'Аура'+(a.r?` · ${a.r} фт`:'')),
    can?h('div',{class:'row'},'Радиус',r,'фт',col,h('button',{class:'btn sm pri',type:'button',onclick:()=>save(Number(r.value)||0,col.value)},'Сохранить'),a.r?h('button',{class:'btn sm',type:'button',onclick:()=>save(0)},'Убрать'):null):h('span',{class:'small muted'},a.r?`${a.r} фт вокруг фишки`:'Нет ауры'),
    can?h('div',{class:'mv-pre'},...PRESETS.map(([n,rr,cc])=>h('button',{class:'btn sm',type:'button',onclick:()=>save(rr,cc)},`${n} ${rr} фт`))):null)}
V.addHeroSection(t=>t?auraEditor(t):null);
V.addGmSection(()=>{const t=V.sel&&V.S.tokens[V.sel];if(!t)return null;return[h('h3',{},'Аура выбранной фишки · '+t.name),auraEditor(t)]});

/* ---------- 4) подсветка хода ---------- */
V.onDraw('tokens',(g,m)=>{const s=V.st();if(!s.combat||!s.combat.on)return;const t=V.S.tokens[s.combat.turn];if(!t||t.map!==m.id||!V.canSee(t))return;
  const r=tokR(t,m),k=(Math.sin(performance.now()/260)+1)/2;g.beginPath();g.arc(t.x,t.y,r+6+k*8,0,7);g.strokeStyle=`rgba(255,215,130,${.25+.45*(1-k)})`;g.lineWidth=(3+k*3)/V.cam.z;g.stroke()});
setInterval(()=>{const s=V.st();if(s.combat&&s.combat.on&&s.combat.turn)V.requestDraw()},90);
const plate=h('div',{class:'mv-turn',role:'status','aria-live':'polite'},'Ваш ход!');(V.overlay()||document.body).append(plate);
let lastTurn=null,plateT=0;
V.store.watchDoc('game/state',d=>{const c=d&&d.combat;const turn=c&&c.on?c.turn:null;if(turn===lastTurn)return;lastTurn=turn;if(!turn)return;
  const t=V.S.tokens[turn];if(!t||V.isOwner||t.owner!==V.myId)return;
  plate.textContent=`Ваш ход, ${t.name}!`;plate.classList.add('on');clearTimeout(plateT);plateT=setTimeout(()=>plate.classList.remove('on'),2000);
  if(t.map===V.st().map)flyTo(t.x,t.y,Math.max(V.cam.z,1))});

/* ---------- 5) двойной тап по своей фишке ---------- */
const cv=document.getElementById('cv');
function ownAt(sx,sy){const c=V.cam,m=V.mapInfo(),wx=(sx-c.ox)/c.z,wy=(sy-c.oy)/c.z;
  return V.tokList().find(t=>t.map===m.id&&t.owner===V.myId&&Math.hypot(wx-t.x,wy-t.y)<=(t.size||1)*V.cellPx(m)/2)}
const local=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top]};
cv.addEventListener('dblclick',e=>{const t=ownAt(...local(e));if(t)flyTo(t.x,t.y,Math.max(V.cam.z,1.2))});
let lastTap={t:0,x:0,y:0};
cv.addEventListener('pointerup',e=>{if(e.pointerType!=='touch')return;const [x,y]=local(e),now=performance.now();
  if(now-lastTap.t<320&&Math.hypot(x-lastTap.x,y-lastTap.y)<24){const t=ownAt(x,y);if(t)flyTo(t.x,t.y,Math.max(V.cam.z,1.2));lastTap.t=0}else lastTap={t:now,x,y}});
})();
