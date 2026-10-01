'use strict';
/* DEEP FIN — original arcade shark game. All graphics are procedural canvas drawings. */
const $=i=>document.getElementById(i),cv=$('c'),ctx=cv.getContext('2d');
const R=(a,b)=>a+Math.random()*(b-a),C=(v,a,b)=>Math.max(a,Math.min(b,v)),PI2=Math.PI*2;
let W=1,H=1,DPR=1,Z=1;
function resize(){DPR=Math.min(devicePixelRatio||1,2);W=innerWidth;H=innerHeight;cv.width=W*DPR;cv.height=H*DPR;cv.style.width=W+'px';cv.style.height=H+'px'}
addEventListener('resize',resize);resize();

/* ===== DATA ===== */
const WW=2200,WH=6400;
const ZONES=[{n:'Shallow Ocean',y:0},{n:'Coral Reef',y:1400},{n:'Deep Ocean',y:3000},{n:'Abyss',y:4700}];
const zoneAt=y=>y>=4700?3:y>=3000?2:y>=1400?1:0;
const zoneEnd=i=>i>=3?WH:ZONES[i+1].y;
const LV=[{n:'Baby Shark',xp:0,s:18,hp:60,sp:230,col:'#ffa94d'},{n:'Reef Shark',xp:400,s:26,hp:90,sp:255,col:'#4dabf7'},
 {n:'Hunter Shark',xp:1100,s:36,hp:130,sp:280,col:'#9775fa'},{n:'Apex Shark',xp:2400,s:48,hp:180,sp:305,col:'#f06595'},
 {n:'Ocean King',xp:4500,s:62,hp:250,sp:330,col:'#ffd43b'}];
const lvOf=xp=>{let l=0;LV.forEach((v,i)=>{if(xp>=v.xp)l=i});return l};
// size/hp/sp(speed)/dmg/score/coin per creature; hz = hazard (never edible)
const TY={
 sprat:{size:8,hp:1,sp:70,dmg:0,score:10,coin:0,col:'#9be7ff',beh:'wander',kind:'fish'},
 fish:{size:14,hp:1,sp:80,dmg:0,score:25,coin:1,col:'#ffd23f',beh:'wander',kind:'fish'},
 squid:{size:20,hp:1,sp:70,dmg:0,score:50,coin:2,col:'#ff7aa8',beh:'wander',kind:'squid'},
 bigfish:{size:28,hp:2,sp:90,dmg:0,score:90,coin:3,col:'#69db7c',beh:'wander',kind:'fish'},
 turtle:{size:34,hp:2,sp:55,dmg:0,score:130,coin:5,col:'#8ce99a',beh:'wander',kind:'turtle'},
 predator:{size:44,hp:3,sp:135,dmg:18,score:220,coin:8,col:'#c084fc',beh:'chase',kind:'fish'},
 shark:{size:52,hp:4,sp:150,dmg:25,score:400,coin:15,col:'#868e96',beh:'chase',kind:'shark'},
 angler:{size:56,hp:4,sp:110,dmg:30,score:500,coin:20,col:'#5f3dc4',beh:'chase',kind:'angler'},
 boss:{size:95,hp:8,sp:85,dmg:45,score:2500,coin:120,col:'#c2255c',beh:'chase',kind:'kraken'},
 jelly:{size:22,hp:9,sp:30,dmg:12,score:0,coin:0,col:'#f783ac',beh:'drift',kind:'jelly',hz:1},
 mine:{size:18,hp:9,sp:0,dmg:35,score:0,coin:0,col:'#495057',beh:'static',kind:'mine',hz:1},
 sub:{size:50,hp:9,sp:70,dmg:30,score:0,coin:0,col:'#fcc419',beh:'patrol',kind:'sub',hz:1},
 barrel:{size:16,hp:9,sp:0,dmg:30,score:0,coin:0,col:'#e8590c',beh:'drift',kind:'barrel',hz:1}};
const SP=[{sprat:6,fish:4,squid:1,jelly:1,mine:1,sub:1},{fish:4,squid:3,bigfish:3,turtle:2,jelly:2,mine:1,sub:1,predator:1},
 {bigfish:3,turtle:3,predator:3,shark:2,jelly:2,mine:2,barrel:2,sub:1},{predator:3,shark:3,angler:3,jelly:2,mine:2,barrel:2,boss:.4}];
const CAP={boss:1,sub:2,shark:3,angler:3,mine:6,barrel:4};
const PU={speed:{i:'💨',c:'#ffe066',t:8,n:'SPEED'},magnet:{i:'🧲',c:'#ff6b6b',t:10,n:'MAGNET'},frenzy:{i:'🔥',c:'#ff922b',t:8,n:'FRENZY'},
 shield:{i:'🛡️',c:'#74c0fc',t:10,n:'SHIELD'},dbl:{i:'×2',c:'#ffd43b',t:12,n:'2× COINS'}};
const UP={speed:{n:'Speed',i:'💨',b:60,d:'+6% swim speed'},health:{n:'Health',i:'❤️',b:70,d:'+15 max HP'},bite:{n:'Bite Power',i:'🦷',b:90,d:'+bite damage'},
 energy:{n:'Energy',i:'⚡',b:60,d:'+20 max energy'},coin:{n:'Coin Bonus',i:'🪙',b:100,d:'+20% coins'}};
const UPMAX=5;
const MIS=[{id:'fish',t:'Eat 20 Fish',stat:'fish',goal:20,coin:40},{id:'coins',t:'Collect 10 Coins',stat:'coins',goal:10,coin:30},
 {id:'large',t:'Eat 3 Large Creatures',stat:'large',goal:3,coin:70},{id:'time',t:'Survive 120 Seconds',stat:'time',goal:120,coin:60,max:1},
 {id:'deep',t:'Reach Deep Ocean',stat:'deep',goal:1,coin:100,max:1}];

/* ===== SAVE ===== */
const Save={k:'deepfin_v1',d:null,
 def(){return{coins:0,best:0,xp:0,up:{speed:0,health:0,bite:0,energy:0,coin:0},mis:{},zones:1}},
 load(){const df=this.def();try{this.d=Object.assign(df,JSON.parse(localStorage.getItem(this.k)||'{}'));this.d.up=Object.assign(this.def().up,this.d.up);this.d.mis=this.d.mis||{}}catch(e){this.d=df}},
 save(){try{localStorage.setItem(this.k,JSON.stringify(this.d))}catch(e){}}};
Save.load();
addEventListener('pagehide',()=>Save.save());document.addEventListener('visibilitychange',()=>{if(document.hidden)Save.save()});

/* ===== AUDIO (tiny synth placeholders) ===== */
let AC;function sfx(f,d=.08,type='square',v=.04){try{AC=AC||new(window.AudioContext||window.webkitAudioContext)();const o=AC.createOscillator(),g=AC.createGain(),n=AC.currentTime;o.type=type;o.frequency.value=f;g.gain.setValueAtTime(v,n);g.gain.exponentialRampToValueAtTime(.001,n+d);o.connect(g);g.connect(AC.destination);o.start();o.stop(n+d)}catch(e){}}

/* ===== STATE ===== */
const G={st:'menu',t:0,cr:[],pk:[],pa:[],tx:[],p:null,run:null,cam:{x:0,y:0},shake:0,paused:false,spT:0,pkT:6,hintT:0,tbT:0,bg:[],decor:[]};
const IN={on:false,pid:-1,ox:0,oy:0,x:0,y:0,k:{},bo:false};
const wallW=y=>60+28*Math.sin(y/170)+18*Math.sin(y/63);

/* ===== PLAYER ===== */
function newPlayer(){const lv=lvOf(Save.d.xp),L=LV[lv],u=Save.d.up,mh=L.hp+u.health*15,me=100+u.energy*20;
 return{x:WW/2,y:300,vx:0,vy:0,ang:0,lv,sz:L.s,tsz:L.s,hp:mh,mh,en:me,me,inv:0,hit:0,mouth:0,sq:0,fx:{speed:0,magnet:0,frenzy:0,shield:0,dbl:0},boosting:false}}
function dirVec(){let x,y;if(IN.on){x=(IN.x-IN.ox)/60;y=(IN.y-IN.oy)/60}else{const k=IN.k;x=(k.ArrowRight||k.KeyD?1:0)-(k.ArrowLeft||k.KeyA?1:0);y=(k.ArrowDown||k.KeyS?1:0)-(k.ArrowUp||k.KeyW?1:0)}
 const m=Math.hypot(x,y);return m>1?[x/m,y/m]:m<.12?[0,0]:[x,y]}
function movePlayer(dt,dir,live){const p=G.p,u=Save.d.up,L=LV[p.lv];
 p.boosting=live&&(IN.bo||IN.k.Space||IN.k.ShiftLeft)&&p.en>2&&(dir[0]||dir[1]);
 const sp=L.sp*(1+u.speed*.06)*(p.fx.speed>0?1.35:1)*(p.boosting?1.6:1),a=Math.min(1,5*dt);
 p.vx+=(dir[0]*sp-p.vx)*a;p.vy+=(dir[1]*sp-p.vy)*a;
 p.x=C(p.x+p.vx*dt,115,WW-115);
 const lim=live?zoneEnd(Math.min(3,Save.d.zones-1))-25:900;
 p.y=C(p.y+p.vy*dt,30,lim);
 if(live&&p.y>=lim-2&&dir[1]>.3&&G.hintT<=0&&Save.d.zones<4){G.hintT=3;txt(p.x,p.y-p.sz*2,'🔒 Reach '+LV[Save.d.zones].n,'#ffd43b')}
 if(Math.hypot(p.vx,p.vy)>25){let d=Math.atan2(p.vy,p.vx)-p.ang;d=Math.atan2(Math.sin(d),Math.cos(d));p.ang+=d*Math.min(1,8*dt)}
 p.sz+=(p.tsz-p.sz)*Math.min(1,6*dt);p.mouth=Math.max(0,p.mouth-dt);p.sq*=Math.pow(.02,dt);p.inv-=dt;p.hit-=dt;
 for(const k in p.fx)p.fx[k]=Math.max(0,p.fx[k]-dt);
 if(live){p.en-=(p.boosting?22:1.5)*dt;if(p.boosting&&Math.random()<.5)part(p.x-Math.cos(p.ang)*p.sz,p.y-Math.sin(p.ang)*p.sz,1,'#fff',40,3,.6,'b');
  if(p.en<=0){p.en=0;p.hp-=4*dt;if(p.hp<=0)gameOver()}}}
function bitePow(){const p=G.p;return 1+Save.d.up.bite*.7+p.lv*.4}
function hurt(d){const p=G.p;if(p.inv>0||G.st!=='play')return;
 if(p.fx.shield>0){p.inv=.6;txt(p.x,p.y-p.sz,'BLOCKED','#74c0fc');sfx(520);return}
 p.hp-=d;p.inv=1;p.hit=.3;G.shake=Math.max(G.shake,9);txt(p.x,p.y-p.sz,'-'+Math.round(d),'#ff5a5a');part(p.x,p.y,10,'#ff5a5a',160,4,.5);sfx(110,.2,'sawtooth',.06);
 if(p.hp<=0)gameOver()}
function stat(k,v){for(const m of MIS){if(m.stat!==k)continue;const s=Save.d.mis[m.id]||(Save.d.mis[m.id]={p:0,done:false});if(s.done)continue;
 s.p=m.max?Math.max(s.p,v):s.p+v;if(s.p>=m.goal){s.done=true;s.p=m.goal;Save.d.coins+=m.coin;if(G.run)G.run.score+=100;banner('MISSION COMPLETE!\n'+m.t+'  +'+m.coin+'🪙');sfx(880,.25,'triangle',.06);Save.save()}}}
function eat(c){const p=G.p,T=c.d,fr=p.fx.frenzy>0;c.dead=true;
 const sc=Math.round(T.score*(fr?2:1)),co=Math.round(T.coin*(1+Save.d.up.coin*.2)*(p.fx.dbl>0?2:1));
 G.run.score+=sc;G.run.coins+=co;Save.d.xp+=sc;p.en=Math.min(p.me,p.en+6+T.size*.5);p.hp=Math.min(p.mh,p.hp+.5+T.size*.08);
 part(c.x,c.y,10,T.col,170,4,.5);txt(c.x,c.y-T.size,'+'+sc,'#fff');if(T.size>=28)G.shake=Math.max(G.shake,6+T.size*.05);else G.shake=Math.max(G.shake,1.5);
 for(let i=0;i<co&&i<8;i++)part(c.x,c.y,1,'#ffd43b',120,5,2,'coin');
 sfx(300+Math.random()*200,.09);
 if(T.kind==='fish'||T.kind==='squid')stat('fish',1);if(T.size>=34)stat('large',1);if(co)stat('coins',co);
 const nl=lvOf(Save.d.xp);if(nl>p.lv)levelUp(nl)}
function levelUp(nl){const p=G.p,L=LV[nl];p.lv=nl;p.tsz=L.s;p.mh=L.hp+Save.d.up.health*15;p.hp=p.mh;p.en=p.me;G.shake=12;
 for(let i=0;i<24;i++){const a=i/24*PI2;G.pa.push({x:p.x,y:p.y,vx:Math.cos(a)*260,vy:Math.sin(a)*260,l:.8,m:.8,r:5,c:L.col,t:'p'})}
 let m='LEVEL UP!\n'+L.n;if(nl+1>Save.d.zones&&nl<4){Save.d.zones=Math.min(4,nl+1);m+='\nNEW ZONE: '+ZONES[Save.d.zones-1].n}
 banner(m);sfx(520,.3,'triangle',.06);setTimeout(()=>sfx(780,.3,'triangle',.06),150);Save.save()}

/* ===== CREATURES ===== */
function spawn(k,x,y){const T=TY[k];G.cr.push({k,d:T,x,y,hp:T.hp,ang:Math.random()<.5?0:Math.PI,ta:0,wt:0,t:Math.random()*9,cd:0,fl:0,dir:Math.random()<.5?1:-1,dead:false})}
function pick(z){const t=SP[z];let s=0;for(const k in t)s+=t[k];let r=Math.random()*s;for(const k in t){r-=t[k];if(r<=0)return k}return 'fish'}
function fill(init){const p=G.p;if(G.cr.length>=72&&!init)return;const cnt={};G.cr.forEach(c=>cnt[c.k]=(cnt[c.k]||0)+1);
 const lim=Math.min(zoneEnd(Math.min(3,Save.d.zones-1))+250,WH-30);
 for(let i=0;i<(init?72:2);i++){const y=init?R(60,lim):C(p.y+R(-1000,1000),30,lim),x=R(130,WW-130);
  if(Math.hypot(x-p.x,y-p.y)<(init?220:Math.max(W,H)/Z*.65))continue;
  const k=pick(zoneAt(y));if(CAP[k]&&(cnt[k]||0)>=CAP[k])continue;cnt[k]=(cnt[k]||0)+1;spawn(k,x,y);
  if(k==='sprat')for(let j=0;j<5;j++)spawn('sprat',x+R(-40,40),y+R(-30,30))}}
function updCr(c,dt,live){const p=G.p,T=c.d;c.t+=dt;c.cd-=dt;c.fl-=dt;
 const dx=p.x-c.x,dy=p.y-c.y,d=Math.hypot(dx,dy)||1,edible=!T.hz&&T.size<=LV[p.lv].s*(p.fx.frenzy>0?1.7:1.1);
 if(T.beh==='static'){c.y+=Math.sin(c.t*1.5)*4*dt;return}
 if(T.beh==='drift'){c.x+=Math.sin(c.t*1.3+c.dir)*20*dt;c.y+=(T.kind==='barrel'?22:Math.sin(c.t+c.dir)*16)*dt;
  c.x=C(c.x,130,WW-130);if(c.y>WH-40)c.y=WH-40;return}
 if(T.beh==='patrol'){c.x+=c.dir*T.sp*dt;if(c.x<170||c.x>WW-170)c.dir*=-1;return}
 let sp=T.sp;c.wt-=dt;
 if(live&&T.dmg>0&&!edible&&d<460){c.ta=Math.atan2(dy,dx)}                 // hunters chase when player is smaller
 else if(live&&edible&&d<230&&T.size>1){c.ta=Math.atan2(-dy,-dx);sp*=1.35} // prey flees
 else if(c.wt<=0){c.wt=R(1,3);c.ta=(Math.random()<.5?0:Math.PI)+R(-.5,.5);if(T.dmg>0&&Math.random()<.5)c.ta=R(0,PI2)}
 if(live&&p.fx.magnet>0&&edible&&d<320){c.ta=Math.atan2(dy,dx);sp=170}
 let df=c.ta-c.ang;df=Math.atan2(Math.sin(df),Math.cos(df));c.ang+=df*Math.min(1,4*dt);
 c.x+=Math.cos(c.ang)*sp*dt;c.y+=Math.sin(c.ang)*sp*dt;
 if(c.x<130||c.x>WW-130){c.x=C(c.x,130,WW-130);c.ang=Math.PI-c.ang;c.ta=c.ang}
 if(c.y<20||c.y>WH-40){c.y=C(c.y,20,WH-40);c.ang=-c.ang;c.ta=c.ang}}
function collide(){const p=G.p,s=p.sz,hx=p.x+Math.cos(p.ang)*s*.55,hy=p.y+Math.sin(p.ang)*s*.55,hr=s*.75;
 for(const c of G.cr){if(c.dead)continue;const T=c.d;if(Math.hypot(c.x-hx,c.y-hy)>hr+T.size*.8)continue;
  const can=!T.hz&&T.size<=LV[p.lv].s*(p.fx.frenzy>0?1.7:1.1);
  if(can){if(c.cd>0)continue;c.cd=.25;c.fl=.12;c.hp-=bitePow();p.mouth=.25;p.sq=.3;
   if(c.hp<=0)eat(c);else{part(c.x,c.y,4,'#fff',100,3,.3);G.shake=Math.max(G.shake,3);sfx(200,.06);if(T.dmg)hurt(T.dmg*.4)}}
  else if(T.kind==='mine'||T.kind==='barrel'){c.dead=true;part(c.x,c.y,18,'#ffa94d',280,6,.6);part(c.x,c.y,8,'#fff',200,4,.4);G.shake=14;hurt(T.dmg)}
  else if(T.dmg){hurt(T.dmg);const a=Math.atan2(p.y-c.y,p.x-c.x);p.vx+=Math.cos(a)*300;p.vy+=Math.sin(a)*300}
  else if(G.tbT<=0){G.tbT=.8;txt(c.x,c.y-T.size,'TOO BIG','#ff8787')}}}
function pickups(dt){const p=G.p;G.pkT-=dt;
 if(G.pkT<=0){G.pkT=R(7,12);if(G.pk.length<3){const ks=Object.keys(PU),lim=zoneEnd(Math.min(3,Save.d.zones-1))-40;G.pk.push({k:ks[Math.floor(Math.random()*ks.length)],x:C(p.x+R(-400,400),130,WW-130),y:C(p.y+R(-500,500),40,lim),t:0})}}
 for(const o of G.pk){o.t+=dt;const d=Math.hypot(p.x-o.x,p.y-o.y);if(p.fx.magnet>0&&d<350){o.x+=(p.x-o.x)/d*220*dt;o.y+=(p.y-o.y)/d*220*dt}
  if(d<p.sz+24){o.dead=true;const U=PU[o.k];p.fx[o.k]=U.t;banner(U.n+'!');part(o.x,o.y,12,U.c,200,4,.5);sfx(660,.2,'triangle',.06)}
  if(o.t>28)o.dead=true}
 G.pk=G.pk.filter(o=>!o.dead)}

/* ===== PARTICLES / TEXT ===== */
function part(x,y,n,c,sp,r,l,t){for(let i=0;i<n;i++){const a=R(0,PI2),s=R(.3,1)*sp;G.pa.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,l,m:l,r:R(r*.5,r),c,t:t||'p'});if(G.pa.length>400)G.pa.shift()}}
function txt(x,y,s,c){G.tx.push({x,y,s,c,l:1})}
function updFx(dt){const p=G.p;
 for(const q of G.pa){q.l-=dt;if(q.t==='coin'){const age=q.m-q.l;if(age>.35){const dx=p.x-q.x,dy=p.y-q.y,d=Math.hypot(dx,dy)||1;q.vx=dx/d*520;q.vy=dy/d*520;if(d<p.sz){q.l=0;if(G.st==='play')$('co').animate([{transform:'scale(1.35)'},{transform:'scale(1)'}],{duration:200})}}else{q.vx*=.92;q.vy*=.92}}
  else if(q.t==='b'){q.vy-=30*dt;q.vx+=Math.sin(q.l*6)*.5}else q.vy+=60*dt*0;
  q.x+=q.vx*dt;q.y+=q.vy*dt;if(q.t==='p'){q.vx*=.95;q.vy*=.95}}
 G.pa=G.pa.filter(q=>q.l>0);
 for(const t of G.tx){t.y-=45*dt;t.l-=dt*1.1}G.tx=G.tx.filter(t=>t.l>0);
 if(Math.random()<dt*14){const cx=G.cam.x,cy=G.cam.y,deep=zoneAt(cy)>=2;G.pa.push({x:cx+R(0,W/Z),y:cy+R(0,H/Z),vx:0,vy:deep?-4:-25,l:R(3,6),m:5,r:deep?1.5:R(2,5),c:'#fff',t:'b'})}
 for(const f of G.bg){f.x+=f.sp*dt;if(f.x>WW+300)f.x=-300;if(f.x<-300)f.x=WW+300}}

/* ===== CAMERA ===== */
function camUpdate(dt){const p=G.p,tz=Math.min(W,H*.56)/(300+p.sz*7);Z+=(tz-Z)*Math.min(1,3*dt);
 const vw=W/Z,vh=H/Z;let tx=p.x+p.vx*.25-vw/2,ty=p.y+p.vy*.25-vh/2;
 tx=C(tx,0,Math.max(0,WW-vw));ty=C(ty,-120,WH-vh+20);const a=Math.min(1,6*dt);G.cam.x+=(tx-G.cam.x)*a;G.cam.y+=(ty-G.cam.y)*a;G.shake*=Math.pow(.003,dt)}

/* ===== GAME LOOP ===== */
function step(dt){if(G.paused)return;G.t+=dt;G.hintT-=dt;G.tbT-=dt;const live=G.st==='play',p=G.p;
 movePlayer(dt,live?dirVec():[Math.cos(G.t*.35),Math.sin(G.t*.5)*.4],live);
 for(const c of G.cr)updCr(c,dt,live);
 if(live){collide();pickups(dt);const r=G.run;r.time+=dt;if(Math.floor(r.time)!==r.ts){r.ts=Math.floor(r.time);stat('time',r.ts)}
  const z=zoneAt(p.y);if(z>r.zone){r.zone=z;banner('ENTERING\n'+ZONES[z].n);if(z>=2)stat('deep',1)}}
 G.spT-=dt;if(G.spT<=0){G.spT=.12;fill(false)}
 G.cr=G.cr.filter(c=>!c.dead&&Math.abs(c.y-p.y)<1700);
 updFx(dt);camUpdate(dt);if(live)hud()}
let last=0;function loop(ts){const dt=Math.min(.05,(ts-last)/1000||0);last=ts;try{step(dt);render()}catch(e){console.error(e)}requestAnimationFrame(loop)}

/* ===== RENDER ===== */
function sh(s,col,t,mouth,wht){const w=Math.sin(t*10)*s*.25;ctx.fillStyle=wht?'#fff':col;
 ctx.beginPath();ctx.moveTo(-s*.8,0);ctx.lineTo(-s*1.5,-s*.55+w);ctx.lineTo(-s*1.25,w*.6);ctx.lineTo(-s*1.5,s*.5+w);ctx.closePath();ctx.fill();
 ctx.beginPath();ctx.moveTo(-s*.1,-s*.5);ctx.lineTo(-s*.55,-s*1.05);ctx.lineTo(-s*.65,-s*.4);ctx.fill();
 ctx.beginPath();ctx.moveTo(s*1.3,0);ctx.quadraticCurveTo(s*.3,-s*.85,-s*.9,-s*.15+w*.2);ctx.lineTo(-s*.9,s*.15+w*.2);ctx.quadraticCurveTo(s*.3,s*.75,s*1.3,s*.05);ctx.fill();
 ctx.fillStyle=wht?'#fff':'#fff4e0';ctx.beginPath();ctx.moveTo(s*1.25,s*.08);ctx.quadraticCurveTo(s*.2,s*.7,-s*.8,s*.12);ctx.quadraticCurveTo(s*.2,s*.32,s*1.25,s*.08);ctx.fill();
 ctx.fillStyle=wht?'#fff':col;ctx.beginPath();ctx.moveTo(s*.3,s*.3);ctx.lineTo(-s*.2,s*.85+w*.3);ctx.lineTo(-s*.3,s*.3);ctx.fill();
 if(mouth>0){const m=Math.min(1,mouth/.25);ctx.fillStyle='#6b0f24';ctx.beginPath();ctx.moveTo(s*1.28,s*.06);ctx.lineTo(s*.5,s*.1+s*.7*m);ctx.lineTo(s*.45,s*.08);ctx.fill();ctx.fillStyle='#fff';
  for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(s*(1.1-i*.2),s*.07);ctx.lineTo(s*(1.02-i*.2),s*.07+s*.16*m);ctx.lineTo(s*(.94-i*.2),s*.07);ctx.fill()}}
 ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*.75,-s*.18,s*.14,0,PI2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(s*.79,-s*.18,s*.07,0,PI2);ctx.fill()}
function drawPlayer(){const p=G.p;ctx.save();ctx.translate(p.x,p.y);ctx.rotate(p.ang);if(Math.cos(p.ang)<0)ctx.scale(1,-1);
 ctx.scale(1+p.sq*.25,1-p.sq*.2);if(p.inv>0&&Math.floor(G.t*20)%2)ctx.globalAlpha=.45;
 if(p.fx.frenzy>0){ctx.shadowColor='#ff922b';ctx.shadowBlur=25}
 sh(p.sz,LV[p.lv].col,G.t,p.mouth,p.hit>0);ctx.restore();
 if(p.fx.shield>0){ctx.strokeStyle='rgba(116,192,252,.8)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.sz*1.5,0,PI2);ctx.stroke()}}
function drawCr(c){const T=c.d,s=T.size,k=T.kind,w=Math.sin(c.t*8)*s*.15,col=c.fl>0?'#fff':T.col;ctx.save();ctx.translate(c.x,c.y);ctx.fillStyle=col;ctx.strokeStyle=col;
 if(k==='mine'){ctx.fillStyle=col;ctx.beginPath();ctx.arc(0,0,s*.7,0,PI2);ctx.fill();ctx.lineWidth=4;for(let i=0;i<8;i++){const a=i*PI2/8;ctx.beginPath();ctx.moveTo(Math.cos(a)*s*.6,Math.sin(a)*s*.6);ctx.lineTo(Math.cos(a)*s,Math.sin(a)*s);ctx.stroke()}
  ctx.fillStyle=Math.floor(c.t*3)%2?'#ff3b3b':'#661111';ctx.beginPath();ctx.arc(0,0,s*.22,0,PI2);ctx.fill()}
 else if(k==='jelly'){const pl=Math.sin(c.t*3)*.12;ctx.globalAlpha=.85;ctx.beginPath();ctx.ellipse(0,0,s*(1+pl),s*(.8-pl),0,Math.PI,0);ctx.fill();ctx.lineWidth=3;for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(i*s*.35,0);ctx.quadraticCurveTo(i*s*.35+Math.sin(c.t*4+i)*s*.3,s*.8,i*s*.35,s*1.5);ctx.stroke()}}
 else if(k==='sub'){ctx.scale(c.dir,1);ctx.beginPath();ctx.ellipse(0,0,s,s*.45,0,0,PI2);ctx.fill();ctx.fillRect(-s*.15,-s*.7,s*.3,s*.35);ctx.fillStyle='#74c0fc';for(let i=-1;i<=1;i++){ctx.beginPath();ctx.arc(i*s*.4,0,s*.1,0,PI2);ctx.fill()}
  ctx.fillStyle='#495057';ctx.fillRect(-s*1.15,-s*.05+Math.sin(c.t*20)*s*.15,s*.18,s*.2)}
 else if(k==='barrel'){ctx.fillRect(-s*.6,-s*.8,s*1.2,s*1.6);ctx.fillStyle='#fff3bf';ctx.fillRect(-s*.6,-s*.2,s*1.2,s*.3);ctx.fillStyle='#212529';ctx.font='bold '+s+'px sans-serif';ctx.textAlign='center';ctx.fillText('!',0,s*.1)}
 else if(k==='kraken'){ctx.beginPath();ctx.ellipse(0,-s*.2,s*.9,s*.8,0,0,PI2);ctx.fill();ctx.lineWidth=s*.14;ctx.lineCap='round';for(let i=-3;i<=3;i++){ctx.beginPath();ctx.moveTo(i*s*.25,s*.4);ctx.quadraticCurveTo(i*s*.4+Math.sin(c.t*3+i)*s*.3,s*1.1,i*s*.3+Math.sin(c.t*2+i)*s*.4,s*1.7);ctx.stroke()}
  ctx.fillStyle='#fff';[-1,1].forEach(e=>{ctx.beginPath();ctx.arc(e*s*.35,-s*.25,s*.2,0,PI2);ctx.fill()});ctx.fillStyle='#e03131';[-1,1].forEach(e=>{ctx.beginPath();ctx.arc(e*s*.35,-s*.22,s*.1,0,PI2);ctx.fill()})}
 else{ctx.rotate(c.ang);if(Math.cos(c.ang)<0)ctx.scale(1,-1);
  if(k==='shark')sh(s,col==='#fff'?'#fff':'#868e96',c.t,0,0);
  else if(k==='turtle'){ctx.beginPath();ctx.ellipse(0,0,s,s*.7,0,0,PI2);ctx.fill();ctx.fillStyle='#2f9e44';ctx.beginPath();ctx.ellipse(-s*.1,0,s*.7,s*.5,0,0,PI2);ctx.fill();ctx.fillStyle=col;ctx.beginPath();ctx.arc(s*1.05,0,s*.28,0,PI2);ctx.fill();ctx.beginPath();ctx.ellipse(s*.3,s*.6,s*.4,s*.15,w*.05,0,PI2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(s*1.15,-s*.08,s*.06,0,PI2);ctx.fill()}
  else if(k==='squid'){ctx.beginPath();ctx.ellipse(-s*.1,0,s*.9,s*.45,0,0,PI2);ctx.fill();ctx.lineWidth=s*.12;for(let i=-1;i<=1;i++){ctx.beginPath();ctx.moveTo(s*.6,i*s*.2);ctx.quadraticCurveTo(s*1.1,i*s*.3+w,s*1.5,i*s*.4+w*2);ctx.stroke()}ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(s*.4,-s*.12,s*.14,0,PI2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(s*.43,-s*.12,s*.07,0,PI2);ctx.fill()}
  else{ctx.beginPath();ctx.ellipse(0,0,s,s*(k==='angler'?.8:.55),0,0,PI2);ctx.fill();ctx.beginPath();ctx.moveTo(-s*.8,0);ctx.lineTo(-s*1.5,-s*.5+w);ctx.lineTo(-s*1.5,s*.5+w);ctx.fill();
   if(T.score<=50){ctx.fillStyle='rgba(255,255,255,.35)';ctx.fillRect(-s*.1,-s*.5,s*.18,s)}
   if(k==='angler'){ctx.strokeStyle='#ffe066';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s*.4,-s*.7);ctx.quadraticCurveTo(s*1.2,-s*1.4,s*1.4,-s*.9);ctx.stroke();ctx.fillStyle='#fff3a0';ctx.shadowColor='#ffe066';ctx.shadowBlur=20;ctx.beginPath();ctx.arc(s*1.4,-s*.9,s*.12,0,PI2);ctx.fill();ctx.shadowBlur=0}
   if(T.dmg){ctx.fillStyle='#fff';for(let i=0;i<4;i++){ctx.beginPath();ctx.moveTo(s*(.9-i*.17),s*.15);ctx.lineTo(s*(.82-i*.17),s*.4);ctx.lineTo(s*(.74-i*.17),s*.15);ctx.fill()}}
   ctx.fillStyle=T.dmg?'#ff6b6b':'#fff';ctx.beginPath();ctx.arc(s*.55,-s*.15,s*.17,0,PI2);ctx.fill();ctx.fillStyle='#111';ctx.beginPath();ctx.arc(s*.6,-s*.15,s*.08,0,PI2);ctx.fill()}}
 ctx.restore()}
function genDecor(){G.decor=[];for(let i=0;i<170;i++){const y=R(60,WH-60),side=Math.random()<.5?-1:1,z=zoneAt(y),r=Math.random(),ty=z===0?(r<.6?'kelp':'rock'):z===1?(r<.5?'coral':r<.75?'kelp':'rock'):z===2?(r<.4?'coral':'rock'):(r<.5?'rock':'coral');
 G.decor.push({ty,side,y,s:R(22,55),h:R(0,360),ph:R(0,6)})}
 G.bg=[];for(let i=0;i<9;i++)G.bg.push({x:R(0,WW),y:R(100,WH-300),s:R(40,160),sp:R(-60,60)||30})}
function drawDecor(top,bot){for(const d of G.decor){if(d.y<top-120||d.y>bot+120)continue;const x=d.side<0?wallW(d.y)-6:WW-wallW(d.y)+6,z=zoneAt(d.y),dim=z>=3?'28%':z>=2?'42%':'55%';ctx.save();ctx.translate(x,d.y);
 if(d.ty==='kelp'){ctx.strokeStyle='hsl(130,50%,'+(z?30:40)+'%)';ctx.lineWidth=6;ctx.lineCap='round';for(let i=0;i<3;i++){ctx.beginPath();ctx.moveTo(0,i*6);ctx.quadraticCurveTo(-d.side*d.s*.6+Math.sin(G.t*1.5+d.ph+i)*d.s*.3,-d.s*1.2,-d.side*d.s*.5+Math.sin(G.t*1.5+d.ph+i)*d.s*.5,-d.s*2.4);ctx.stroke()}}
 else if(d.ty==='coral'){ctx.strokeStyle='hsl('+d.h+',70%,'+dim+')';ctx.fillStyle=ctx.strokeStyle;ctx.lineWidth=7;ctx.lineCap='round';for(let i=-2;i<=2;i++){ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(-d.side*d.s*.5+i*d.s*.25,-d.s*(1-Math.abs(i)*.2));ctx.stroke();ctx.beginPath();ctx.arc(-d.side*d.s*.5+i*d.s*.25,-d.s*(1-Math.abs(i)*.2),5,0,PI2);ctx.fill()}}
 else{ctx.fillStyle='hsl(210,15%,'+(z>=2?16:26)+'%)';ctx.beginPath();ctx.ellipse(-d.side*d.s*.3,0,d.s*.8,d.s*.55,0,0,PI2);ctx.fill()}
 ctx.restore()}}
function render(){ctx.setTransform(DPR,0,0,DPR,0,0);const cam=G.cam,p=G.p;
 const g=ctx.createLinearGradient(0,-cam.y*Z,0,(WH-cam.y)*Z);[[0,'#6fdcff'],[.22,'#1c9ad6'],[.47,'#0b5fa8'],[.73,'#08285c'],[1,'#02040f']].forEach(s=>g.addColorStop(s[0],s[1]));ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 const ra=C(1-cam.y/1800,0,1)*.16;if(ra>0){ctx.fillStyle='rgba(255,255,255,'+ra+')';for(let i=0;i<5;i++){const x=(i*.24+.05)*W+Math.sin(G.t*.3+i)*30;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x+50,0);ctx.lineTo(x+200,H);ctx.lineTo(x+60,H);ctx.fill()}}
 const sx=G.shake?R(-1,1)*G.shake:0,sy=G.shake?R(-1,1)*G.shake:0;
 ctx.save();ctx.translate(-cam.x*Z+sx,-cam.y*Z+sy);ctx.scale(Z,Z);
 const top=cam.y,bot=cam.y+H/Z;
 if(top<0){ctx.fillStyle='#d4f3ff';ctx.fillRect(0,-400,WW,400);ctx.fillStyle='#8be3ff';ctx.beginPath();ctx.moveTo(0,0);for(let x=0;x<=WW;x+=40)ctx.lineTo(x,Math.sin(x/60+G.t*2)*5);ctx.lineTo(WW,30);ctx.lineTo(0,30);ctx.fill()}
 ctx.fillStyle='rgba(255,255,255,.08)';for(const f of G.bg){if(f.y<top-200||f.y>bot+200)continue;ctx.save();ctx.translate(f.x,f.y);if(f.sp<0)ctx.scale(-1,1);ctx.beginPath();ctx.ellipse(0,0,f.s,f.s*.35,0,0,PI2);ctx.fill();ctx.beginPath();ctx.moveTo(-f.s*.8,0);ctx.lineTo(-f.s*1.4,-f.s*.35);ctx.lineTo(-f.s*1.4,f.s*.35);ctx.fill();ctx.restore()}
 const wc=bot>4700?'#05060f':bot>3000?'#0a1a30':'#0e3a5c';ctx.fillStyle=wc;
 ctx.beginPath();ctx.moveTo(0,top-20);for(let y=Math.floor(top/40)*40-40;y<=bot+40;y+=40)ctx.lineTo(wallW(y),y);ctx.lineTo(0,bot+40);ctx.fill();
 ctx.beginPath();ctx.moveTo(WW,top-20);for(let y=Math.floor(top/40)*40-40;y<=bot+40;y+=40)ctx.lineTo(WW-wallW(y),y);ctx.lineTo(WW,bot+40);ctx.fill();
 if(bot>WH-200){ctx.fillStyle='#07101c';ctx.fillRect(0,WH-30,WW,200)}
 drawDecor(top,bot);
 for(const o of G.pk){const U=PU[o.k],r=20+Math.sin(G.t*5)*2;ctx.fillStyle=U.c;ctx.globalAlpha=.3;ctx.beginPath();ctx.arc(o.x,o.y,r*1.7,0,PI2);ctx.fill();ctx.globalAlpha=1;ctx.beginPath();ctx.arc(o.x,o.y,r,0,PI2);ctx.fill();ctx.fillStyle='#222';ctx.font='bold 20px sans-serif';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(U.i,o.x,o.y+1)}
 for(const c of G.cr)if(c.x>cam.x-250&&c.x<cam.x+W/Z+250&&c.y>top-250&&c.y<bot+250)drawCr(c);
 drawPlayer();
 for(const q of G.pa){const a=C(q.l/q.m,0,1);if(q.t==='b'){ctx.strokeStyle='rgba(255,255,255,'+a*.5+')';ctx.lineWidth=1.2;ctx.beginPath();ctx.arc(q.x,q.y,q.r,0,PI2);ctx.stroke()}else{ctx.globalAlpha=a;ctx.fillStyle=q.c;ctx.beginPath();ctx.arc(q.x,q.y,q.r*(q.t==='coin'?1:a+.3),0,PI2);ctx.fill();ctx.globalAlpha=1}}
 ctx.restore();
 const dp=C((cam.y-1500)/3500,0,.7);if(dp>0){const px=(p.x-cam.x)*Z,py=(p.y-cam.y)*Z,rg=ctx.createRadialGradient(px,py,40,px,py,Math.max(W,H)*.75);rg.addColorStop(0,'rgba(0,0,10,0)');rg.addColorStop(1,'rgba(0,0,10,'+dp+')');ctx.fillStyle=rg;ctx.fillRect(0,0,W,H)}
 ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='900 20px sans-serif';ctx.lineWidth=4;ctx.strokeStyle='rgba(0,0,0,.6)';
 for(const t of G.tx){const x=(t.x-cam.x)*Z,y=(t.y-cam.y)*Z;ctx.globalAlpha=C(t.l*1.5,0,1);ctx.strokeText(t.s,x,y);ctx.fillStyle=t.c;ctx.fillText(t.s,x,y)}ctx.globalAlpha=1;
 if(G.st==='play'&&IN.on){ctx.strokeStyle='rgba(255,255,255,.5)';ctx.lineWidth=3;ctx.beginPath();ctx.arc(IN.ox,IN.oy,48,0,PI2);ctx.stroke();const dx=IN.x-IN.ox,dy=IN.y-IN.oy,d=Math.hypot(dx,dy),k=d>48?48/d:1;ctx.fillStyle='rgba(255,255,255,.45)';ctx.beginPath();ctx.arc(IN.ox+dx*k,IN.oy+dy*k,22,0,PI2);ctx.fill()}}

/* ===== UI ===== */
function banner(m){const b=$('banner');b.innerHTML=m.split('\n').join('<br>');b.classList.remove('show');void b.offsetWidth;b.classList.add('show')}
function hud(){const p=G.p,r=G.run,L=LV[p.lv],nx=LV[p.lv+1];
 $('hpF').style.width=C(p.hp/p.mh*100,0,100)+'%';$('hpT').textContent='❤️ '+Math.ceil(p.hp)+' / '+p.mh;
 $('enF').style.width=C(p.en/p.me*100,0,100)+'%';$('enT').textContent='⚡ ENERGY';
 $('sc').textContent=r.score;$('cn').textContent=r.coins;$('lv').textContent='Lv'+(p.lv+1)+' '+L.n;
 $('xpF').style.width=(nx?C((Save.d.xp-L.xp)/(nx.xp-L.xp)*100,0,100):100)+'%';$('zn').textContent=ZONES[zoneAt(p.y)].n+' • '+Math.floor(r.time)+'s';
 let f='';for(const k in p.fx)if(p.fx[k]>0)f+=PU[k].i+Math.ceil(p.fx[k])+' ';$('fx').textContent=f}
function show(id){document.querySelectorAll('.scr').forEach(s=>s.classList.add('hide'));if(id)$(id).classList.remove('hide');
 document.querySelectorAll('.coins').forEach(e=>e.textContent=Save.d.coins);$('bestM').textContent=Save.d.best}
function renderShark(){const xp=Save.d.xp,cur=lvOf(xp);$('sharkList').innerHTML=LV.map((l,i)=>'<div class="row2 '+(i===cur?'on':i>cur?'lock':'')+'"><span>'+(i>cur?'🔒 ':i===cur?'✔ ':'')+l.n+'<small>HP '+l.hp+' • Speed '+l.sp+' • Zone: '+ZONES[Math.min(i,3)].n+'</small></span><em>'+(i>cur?l.xp+' XP':'Lv'+(i+1))+'</em></div>').join('')+'<div class="cn">XP '+xp+(LV[cur+1]?' / '+LV[cur+1].xp:' (MAX)')+'</div>'}
function renderUpg(){$('upList').innerHTML=Object.keys(UP).map(k=>{const u=UP[k],l=Save.d.up[k],cost=Math.round(u.b*Math.pow(1.7,l)),mx=l>=UPMAX;
 return '<div class="row2"><span>'+u.i+' '+u.n+'<small>'+u.d+'</small><em>'+'■'.repeat(l)+'□'.repeat(UPMAX-l)+'</em></span><button data-up="'+k+'" '+(mx||Save.d.coins<cost?'disabled':'')+'>'+(mx?'MAX':'🪙 '+cost)+'</button></div>'}).join('');
 document.querySelectorAll('.coins').forEach(e=>e.textContent=Save.d.coins)}
function renderMis(){$('misList').innerHTML=MIS.map(m=>{const s=Save.d.mis[m.id]||{p:0,done:false};return '<div class="row2"><span>'+(s.done?'✔ ':'')+m.t+'<small>Reward 🪙 '+m.coin+' • '+Math.floor(s.p)+' / '+m.goal+'</small><div class="pb"><i style="width:'+s.p/m.goal*100+'%"></i></div></span></div>'}).join('')}
function startRun(){G.st='play';G.p=newPlayer();G.cr=[];G.pk=[];G.pa=[];G.tx=[];G.paused=false;G.run={score:0,coins:0,time:0,ts:0,zone:0};G.shake=0;
 G.cam.x=G.p.x-W/Z/2;G.cam.y=0;show(null);$('hud').classList.remove('hide');$('boost').classList.remove('hide');fill(true);banner('SWIM!');$('pause').textContent='⏸'}
function gameOver(){if(G.st!=='play')return;G.st='over';const r=G.run,p=G.p,earn=r.coins+Math.floor(r.time/10);
 part(p.x,p.y,24,'#ff5a5a',260,5,.8);G.shake=14;sfx(90,.5,'sawtooth',.07);
 const nb=r.score>Save.d.best;if(nb)Save.d.best=r.score;Save.d.coins+=earn;Save.save();
 $('hud').classList.add('hide');$('boost').classList.add('hide');IN.on=false;
 $('oScore').textContent=r.score;$('oBest').textContent=Save.d.best;$('oNew').textContent=nb?'NEW!':'';$('oCoins').textContent='+'+earn;
 setTimeout(()=>{if(G.st==='over')show('over')},800)}
function go(x){sfx(440,.06,'triangle');
 if(x==='play')startRun();
 else if(x==='menu'){G.st='menu';G.p=newPlayer();G.p.y=400;G.cr=[];fill(true);$('hud').classList.add('hide');$('boost').classList.add('hide');Save.save();show('menu')}
 else{if(x==='shark')renderShark();if(x==='upg')renderUpg();if(x==='mis')renderMis();show(x)}}
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;
 if(b.dataset.go)go(b.dataset.go);
 else if(b.dataset.up){const k=b.dataset.up,l=Save.d.up[k],cost=Math.round(UP[k].b*Math.pow(1.7,l));if(l<UPMAX&&Save.d.coins>=cost){Save.d.coins-=cost;Save.d.up[k]++;Save.save();sfx(700,.15,'triangle');renderUpg()}}
 else if(b.id==='pause'&&G.st==='play'){G.paused=!G.paused;b.textContent=G.paused?'▶':'⏸'}});

/* ===== INPUT ===== */
cv.addEventListener('pointerdown',e=>{if(G.st!=='play'||IN.on)return;e.preventDefault();IN.on=true;IN.pid=e.pointerId;IN.ox=IN.x=e.clientX;IN.oy=IN.y=e.clientY;try{cv.setPointerCapture(e.pointerId)}catch(_){}});
cv.addEventListener('pointermove',e=>{if(!IN.on||e.pointerId!==IN.pid)return;IN.x=e.clientX;IN.y=e.clientY;const dx=IN.x-IN.ox,dy=IN.y-IN.oy,d=Math.hypot(dx,dy);if(d>90){IN.ox=IN.x-dx/d*90;IN.oy=IN.y-dy/d*90}});
const up=e=>{if(e.pointerId===IN.pid)IN.on=false};cv.addEventListener('pointerup',up);cv.addEventListener('pointercancel',up);
const bo=$('boost');bo.addEventListener('pointerdown',e=>{e.preventDefault();IN.bo=true});['pointerup','pointercancel','pointerleave'].forEach(t=>bo.addEventListener(t,()=>IN.bo=false));
addEventListener('keydown',e=>{IN.k[e.code]=true;if(e.code==='Space'||e.code.startsWith('Arrow'))e.preventDefault();if((e.code==='KeyP'||e.code==='Escape')&&G.st==='play'){G.paused=!G.paused;$('pause').textContent=G.paused?'▶':'⏸'}});
addEventListener('keyup',e=>IN.k[e.code]=false);addEventListener('blur',()=>{IN.k={};IN.bo=false;IN.on=false});
document.addEventListener('contextmenu',e=>e.preventDefault());document.addEventListener('touchmove',e=>{if(!e.target.closest('.scr'))e.preventDefault()},{passive:false});

/* ===== INIT ===== */
genDecor();G.p=newPlayer();G.p.y=400;Z=Math.min(W,H*.56)/(300+G.p.sz*7);fill(true);show('menu');requestAnimationFrame(loop);
