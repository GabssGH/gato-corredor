(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  // =============== i18n ===============
  const STR = {
    pt: {
      title:'CORREDOR FELINO',
      menuStart:'Começar o jogo', menuControls:'Comandos', menuLeaderboard:'Placar Global',
      controlsTitle:'COMANDOS',
      ctrlJumpLabel:'PULAR', ctrlJumpDesc:'Toque na tela, aperte ESPAÇO ou a seta ↑',
      ctrlDuckLabel:'ABAIXAR', ctrlDuckDesc:'Segure o botão, a seta ↓ ou a tecla S',
      ctrlCoinLabel:'MOEDAS', ctrlCoinDesc:'Colete para ganhar pontos extras',
      ctrlCycleLabel:'CICLO DO DIA', ctrlCycleDesc:'Dia, tarde e noite se alternam durante a corrida',
      backBtn:'Voltar',
      leaderboardTitle:'PLACAR GLOBAL',
      loadingLb:'Carregando...',
      lbNote:'Visível para todos os jogadores. Seu nome é gerado automaticamente.',
      lbEmpty:'Ainda não há pontuações. Seja o primeiro a correr!',
      lbRank:'#', lbName:'Nome', lbScore:'Pontos', lbCoins:'Moedas',
      gameOverTitle:'Fim de jogo',
      coinsCollectedSuffix:'moedas coletadas',
      recordLabel:'Recorde',
      scoreSentNote:'Sua pontuação foi enviada ao placar global como',
      playAgainBtn:'Jogar de novo', menuBtn:'Menu',
      duckShort:'ABAIXAR', jumpShort:'PULAR',
      lbError:'Não foi possível carregar o placar agora.',
    },
    en: {
      title:'FELINE RUNNER',
      menuStart:'Start game', menuControls:'Controls', menuLeaderboard:'Global Leaderboard',
      controlsTitle:'CONTROLS',
      ctrlJumpLabel:'JUMP', ctrlJumpDesc:'Tap the screen, press SPACE or the ↑ arrow',
      ctrlDuckLabel:'DUCK', ctrlDuckDesc:'Hold the button, ↓ arrow or the S key',
      ctrlCoinLabel:'COINS', ctrlCoinDesc:'Collect them for bonus points',
      ctrlCycleLabel:'DAY CYCLE', ctrlCycleDesc:'Day, afternoon and night alternate as you run',
      backBtn:'Back',
      leaderboardTitle:'GLOBAL LEADERBOARD',
      loadingLb:'Loading...',
      lbNote:'Visible to every player. Your name is generated automatically.',
      lbEmpty:'No scores yet. Be the first to run!',
      lbRank:'#', lbName:'Name', lbScore:'Score', lbCoins:'Coins',
      gameOverTitle:'Game over',
      coinsCollectedSuffix:'coins collected',
      recordLabel:'Best',
      scoreSentNote:'Your score was sent to the global leaderboard as',
      playAgainBtn:'Play again', menuBtn:'Menu',
      duckShort:'DUCK', jumpShort:'JUMP',
      lbError:'Could not load the leaderboard right now.',
    }
  };
  let lang = 'pt';
  function t(key){ return (STR[lang] && STR[lang][key]) || STR.pt[key] || key; }
  function applyLanguage(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      // keep any nested elements (like #playerNameShown) intact
      const nested = el.querySelector('span[id]');
      if(nested){
        el.childNodes[0].textContent = t(key) + ' ';
      } else {
        el.textContent = t(key);
      }
    });
    document.title = t('title');
    document.getElementById('langPt').classList.toggle('active', lang==='pt');
    document.getElementById('langEn').classList.toggle('active', lang==='en');
    if(!leaderboardPanel.classList.contains('hidden')) renderLeaderboard(lastLbData, lastLbError);
  }
  document.getElementById('langPt').addEventListener('click', ()=>{ lang='pt'; applyLanguage(); savePersonal('lang','pt'); });
  document.getElementById('langEn').addEventListener('click', ()=>{ lang='en'; applyLanguage(); savePersonal('lang','en'); });

  // =============== storage helpers ===============
  async function savePersonal(key, value){
    try{ await window.storage.set(key, value, false); }catch(e){ /* best effort */ }
  }
  async function loadPersonal(key){
    try{
      const res = await window.storage.get(key, false);
      return res ? res.value : null;
    }catch(e){ return null; }
  }

  const ADJ = ['Veloz','Ágil','Sortudo','Corajoso','Sonhador','Travesso','Esperto','Faminto','Dourado','Sombrio','Elétrico','Silencioso'];
  const NOUN = ['Gato','Felino','Bigode','Miau','Patinha','Rajado','Sorriso','Ronron'];
  function generateRandomName(){
    const a = ADJ[Math.floor(Math.random()*ADJ.length)];
    const n = NOUN[Math.floor(Math.random()*NOUN.length)];
    const num = Math.floor(Math.random()*900+100);
    return `${n}${a}${num}`;
  }
  let playerName = null;
  async function ensurePlayerIdentity(){
    let name = await loadPersonal('playerName');
    if(!name){ name = generateRandomName(); await savePersonal('playerName', name); }
    playerName = name;
    const savedLang = await loadPersonal('lang');
    if(savedLang === 'pt' || savedLang === 'en'){ lang = savedLang; applyLanguage(); }
  }
  ensurePlayerIdentity();

  async function submitScore(name, scoreVal, coinsVal){
    try{
      let list = [];
      try{
        const res = await window.storage.get('leaderboard', true);
        if(res && res.value) list = JSON.parse(res.value);
      }catch(e){ list = []; }
      list.push({ name, score: Math.floor(scoreVal), coins: coinsVal, ts: Date.now() });
      list.sort((a,b)=>b.score-a.score);
      list = list.slice(0, 50);
      await window.storage.set('leaderboard', JSON.stringify(list), true);
      return list;
    }catch(e){ return null; }
  }

  let lastLbData = null, lastLbError = false;
  async function fetchLeaderboard(){
    lastLbData = null; lastLbError = false;
    renderLeaderboard(null, false);
    try{
      const res = await window.storage.get('leaderboard', true);
      lastLbData = res && res.value ? JSON.parse(res.value) : [];
    }catch(e){
      lastLbData = [];
      lastLbError = true;
    }
    renderLeaderboard(lastLbData, lastLbError);
  }

  function renderLeaderboard(list, err){
    const el = document.getElementById('lbContent');
    if(list === null){ el.innerHTML = `<div class="lb-loading">${t('loadingLb')}</div>`; return; }
    if(err){ el.innerHTML = `<div class="lb-empty">${t('lbError')}</div>`; return; }
    if(!list.length){ el.innerHTML = `<div class="lb-empty">${t('lbEmpty')}</div>`; return; }
    let rows = '';
    list.slice(0,10).forEach((entry, i)=>{
      const mine = entry.name === playerName;
      rows += `<tr class="${mine?'me':''}"><td>${i+1}</td><td>${escapeHtml(entry.name)}</td><td>${entry.score}</td><td>🪙${entry.coins}</td></tr>`;
    });
    el.innerHTML = `<table id="lbTable"><thead><tr><th>${t('lbRank')}</th><th>${t('lbName')}</th><th>${t('lbScore')}</th><th>${t('lbCoins')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  // =============== canvas sizing ===============
  let W=0,H=0,scale=1, PXU=4;
  let dpr = Math.max(1, Math.min(window.devicePixelRatio||1, 2));
  let groundY = 480;

  function resize(){
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = false;
    scale = H/600;
    PXU = Math.max(2, Math.round(4*scale));
    groundY = H*0.78;
  }

  // =============== pixel drawing primitives ===============
  function pxSnap(v, unit){ return Math.round(v/unit)*unit; }

  function pixelRect(x,y,w,h,unit,color){
    ctx.fillStyle = color;
    const gx = pxSnap(x,unit), gy = pxSnap(y,unit);
    const gw = Math.max(unit, pxSnap(w,unit)), gh = Math.max(unit, pxSnap(h,unit));
    ctx.fillRect(gx,gy,gw,gh);
  }

  function pixelBlob(cx,cy,rx,ry,unit,color){
    ctx.fillStyle = color;
    const steps = Math.max(1, Math.round(ry/unit));
    for(let j=-steps;j<=steps;j++){
      const yy = j*unit;
      if(Math.abs(yy) > ry) continue;
      const frac = Math.max(0, 1-(yy*yy)/(ry*ry));
      const xr = rx*Math.sqrt(frac);
      const stepsX = Math.round(xr/unit);
      const w = (stepsX*2+1)*unit;
      ctx.fillRect(Math.round(cx-stepsX*unit-unit/2), Math.round(cy+yy-unit/2), w, unit);
    }
  }

  function pixelBlobOutlined(cx,cy,rx,ry,unit,fill,outline){
    pixelBlob(cx,cy,rx+unit,ry+unit,unit,outline);
    pixelBlob(cx,cy,rx,ry,unit,fill);
  }

  function pixelTriangleStack(x,y,w,h,unit,color){
    const rows = Math.max(1, Math.round(h/unit));
    for(let r=0;r<rows;r++){
      const rowW = Math.max(unit, w*(1-r/rows));
      const rx = x + (w-rowW)/2;
      pixelRect(rx, y+r*unit, rowW, unit, unit, color);
    }
  }

  // =============== day/night cycle ===============
  const CYCLE_LENGTH = 72;
  let cycleTime = 6;
  const PHASES = [
    { t:0,                sky:['#7ec8ff','#cdeeff'], sun:'#ffe38a', glow:'rgba(255,230,150,0.35)', far:'#8fae63', near:'#4f7942', ground:'#5fae3b', dirt:'#8a5a2c', windowOn:0.1, stars:0 },
    { t:CYCLE_LENGTH*0.34,sky:['#ff9d5c','#ffd8a0'], sun:'#ff7a3d', glow:'rgba(255,140,70,0.45)', far:'#a3835f', near:'#6b5638', ground:'#9c8a3f', dirt:'#7a4a24', windowOn:0.4, stars:0 },
    { t:CYCLE_LENGTH*0.62,sky:['#0d1240','#2a2f66'], sun:'#e9ecff', glow:'rgba(160,180,255,0.25)', far:'#2a3550', near:'#1a2038', ground:'#2f4a2a', dirt:'#3a2818', windowOn:0.9, stars:1 },
    { t:CYCLE_LENGTH,     sky:['#7ec8ff','#cdeeff'], sun:'#ffe38a', glow:'rgba(255,230,150,0.35)', far:'#8fae63', near:'#4f7942', ground:'#5fae3b', dirt:'#8a5a2c', windowOn:0.1, stars:0 },
  ];
  function lerp(a,b,f){ return a+(b-a)*f; }
  function hexToRgb(h){ h=h.replace('#',''); return [parseInt(h.substr(0,2),16),parseInt(h.substr(2,2),16),parseInt(h.substr(4,2),16)]; }
  function lerpColor(c1,c2,f){
    const a=hexToRgb(c1), b=hexToRgb(c2);
    return `rgb(${Math.round(lerp(a[0],b[0],f))},${Math.round(lerp(a[1],b[1],f))},${Math.round(lerp(a[2],b[2],f))})`;
  }
  function getSky(){
    let p0=PHASES[0], p1=PHASES[1];
    for(let i=0;i<PHASES.length-1;i++){ if(cycleTime>=PHASES[i].t && cycleTime<=PHASES[i+1].t){ p0=PHASES[i]; p1=PHASES[i+1]; break; } }
    const f = (cycleTime-p0.t)/((p1.t-p0.t)||1);
    return {
      topColor:lerpColor(p0.sky[0],p1.sky[0],f), bottomColor:lerpColor(p0.sky[1],p1.sky[1],f),
      sunColor:lerpColor(p0.sun,p1.sun,f), glow: f<0.5?p0.glow:p1.glow,
      far:lerpColor(p0.far,p1.far,f), near:lerpColor(p0.near,p1.near,f),
      ground:lerpColor(p0.ground,p1.ground,f), dirt:lerpColor(p0.dirt,p1.dirt,f),
      windowOn:lerp(p0.windowOn,p1.windowOn,f), stars:lerp(p0.stars,p1.stars,f),
      progress: cycleTime/CYCLE_LENGTH
    };
  }

  // =============== game state ===============
  let state = 'start'; // start | controls | leaderboard | playing | gameover
  let lastTime = 0, elapsed = 0;
  let score=0, coins=0, best=0, speed=0;
  const BASE_SPEED_REF = 6.2;
  let cat, obstacles=[], coinList=[], particles=[];
  let spawnTimer=0, coinTimer=0;
  let farOffset=0, nearOffset=0;
  let starsField=[];

  function initStars(){
    starsField = [];
    for(let i=0;i<50;i++) starsField.push({x:Math.random(), y:Math.random()*0.5, r:Math.random()*1.6+0.6, tw:Math.random()*Math.PI*2});
  }

  function makeCat(){
    return {
      x: () => W*0.16,
      y: groundY - 54*scale,
      vy:0, w:46*scale, h:54*scale,
      ducking:false, grounded:true,
      legPhase:0, blink:0, tailPhase:0, idle:true,
    };
  }

  function resetGame(){
    score=0; coins=0; elapsed=0;
    speed = BASE_SPEED_REF*scale;
    obstacles=[]; coinList=[]; particles=[];
    spawnTimer=900; coinTimer=600;
    cat = makeCat();
    cat.idle = false;
  }

  // =============== input ===============
  function doJump(){
    if(state !== 'playing') return;
    if(cat.ducking) return;
    if(cat.grounded){ cat.vy = -15.6*scale; cat.grounded=false; }
  }
  function setDuck(v){
    if(state !== 'playing') return;
    cat.ducking = v && cat.grounded;
  }
  window.addEventListener('keydown',(e)=>{
    if(['Space','ArrowUp','KeyW'].includes(e.code)){ e.preventDefault(); doJump(); }
    if(['ArrowDown','KeyS'].includes(e.code)){ e.preventDefault(); setDuck(true); }
    if(state==='start'){
      if(e.code==='ArrowDown'){ moveSelection(1); }
      if(e.code==='ArrowUp'){ moveSelection(-1); }
      if(e.code==='Enter'){ activateSelection(); }
    }
  });
  window.addEventListener('keyup',(e)=>{ if(['ArrowDown','KeyS'].includes(e.code)) setDuck(false); });

  function bindHold(el,onDown,onUp){
    const down=(e)=>{ e.preventDefault(); el.classList.add('active'); onDown(); };
    const up=(e)=>{ e.preventDefault(); el.classList.remove('active'); onUp(); };
    el.addEventListener('pointerdown',down);
    el.addEventListener('pointerup',up);
    el.addEventListener('pointerleave',up);
    el.addEventListener('pointercancel',up);
  }
  bindHold(document.getElementById('btnJump'), doJump, ()=>{});
  bindHold(document.getElementById('btnDuck'), ()=>setDuck(true), ()=>setDuck(false));
  canvas.addEventListener('pointerdown', ()=>{ if(state==='playing') doJump(); });

  // =============== screens ===============
  const startScreen = document.getElementById('startScreen');
  const controlsPanel = document.getElementById('controlsPanel');
  const leaderboardPanel = document.getElementById('leaderboardPanel');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const hud = document.getElementById('hud');
  const cycleWrap = document.getElementById('cycleWrap');
  const touchControls = document.getElementById('controls');
  const langToggle = document.getElementById('langToggle');

  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  let selIndex = 0;
  function renderSelection(){
    menuItems.forEach((it,i)=> it.classList.toggle('selected', i===selIndex));
  }
  function moveSelection(d){ selIndex = (selIndex + d + menuItems.length) % menuItems.length; renderSelection(); }
  function activateSelection(){ handleMenuAction(menuItems[selIndex].dataset.action); }
  menuItems.forEach((it,i)=>{
    it.addEventListener('click', ()=>{ selIndex=i; renderSelection(); handleMenuAction(it.dataset.action); });
    it.addEventListener('mouseenter', ()=>{ selIndex=i; renderSelection(); });
  });
  renderSelection();

  function showScreen(which){
    startScreen.classList.toggle('hidden', which!=='start');
    controlsPanel.classList.toggle('hidden', which!=='controls');
    leaderboardPanel.classList.toggle('hidden', which!=='leaderboard');
    gameOverScreen.classList.toggle('hidden', which!=='gameover');
    hud.classList.toggle('hidden', which!=='playing');
    touchControls.classList.toggle('hidden', which!=='playing');
    langToggle.classList.toggle('hidden', which==='playing');
  }

  function handleMenuAction(action){
    if(action==='start'){ startGame(); }
    else if(action==='controls'){ state='controls'; showScreen('controls'); }
    else if(action==='leaderboard'){ state='leaderboard'; showScreen('leaderboard'); fetchLeaderboard(); }
  }

  document.getElementById('controlsBack').addEventListener('click', ()=>{ state='start'; showScreen('start'); });
  document.getElementById('leaderboardBack').addEventListener('click', ()=>{ state='start'; showScreen('start'); });
  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('toMenuBtn').addEventListener('click', ()=>{ state='start'; cat = makeCat(); showScreen('start'); });

  function startGame(){
    resetGame();
    state='playing';
    showScreen('playing');
  }

  async function endGame(){
    state='gameover';
    best = Math.max(best, Math.floor(score));
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('finalCoins').textContent = coins;
    document.getElementById('bestScore').textContent = best;
    document.getElementById('playerNameShown').textContent = playerName || '...';
    showScreen('gameover');
    submitScore(playerName, score, coins);
  }

  // =============== obstacles & coins ===============
  function spawnObstacle(){
    const roll = Math.random();
    let type;
    if(roll < 0.38) type='house'; else if(roll < 0.72) type='person'; else type='bridge';
    let ob;
    if(type==='house'){
      const h=(64+Math.random()*26)*scale, w=(52+Math.random()*16)*scale;
      ob = { type, x:W+20, y:groundY-h, w, h };
    } else if(type==='person'){
      const h=(44+Math.random()*8)*scale, w=20*scale;
      ob = { type, x:W+20, y:groundY-h, w, h };
    } else {
      const gap=40*scale, beamH=22*scale, w=110*scale;
      ob = { type, x:W+20, y:groundY-gap-beamH, w, h:beamH, gap };
    }
    obstacles.push(ob);
    if(Math.random() < 0.75){
      if(type==='bridge'){
        for(let i=0;i<3;i++) coinList.push({ x:ob.x+18*scale+i*26*scale, y:groundY-ob.gap*0.55-6*scale, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
      } else {
        const n=4, peakY=groundY-116*scale;
        for(let i=0;i<n;i++){
          const f=i/(n-1);
          const arcY = lerp(groundY-28*scale, peakY, Math.sin(f*Math.PI));
          coinList.push({ x: ob.x-36*scale+f*(ob.w+72*scale), y:arcY, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
        }
      }
    }
  }
  function spawnGroundCoins(){
    const n=2+Math.floor(Math.random()*3);
    for(let i=0;i<n;i++) coinList.push({ x:W+20+i*24*scale, y:groundY-24*scale, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
  }

  // =============== drawing: world ===============
  function drawSky(sky){
    const g = ctx.createLinearGradient(0,0,0,groundY);
    g.addColorStop(0, sky.topColor); g.addColorStop(1, sky.bottomColor);
    ctx.fillStyle = g; ctx.fillRect(0,0,W,groundY);

    if(sky.stars > 0.05){
      ctx.save(); ctx.globalAlpha = sky.stars;
      for(const s of starsField){
        const tw = 0.6+0.4*Math.sin(elapsed*0.002+s.tw);
        ctx.globalAlpha = sky.stars*tw;
        pixelRect(s.x*W, s.y*groundY, s.r*scale*2, s.r*scale*2, PXU, '#ffffff');
      }
      ctx.restore();
    }
    const sunX=W*0.78, sunY=groundY*0.24+10, r=26*scale;
    ctx.save();
    ctx.shadowColor = sky.glow; ctx.shadowBlur = 30*scale;
    pixelBlob(sunX, sunY, r, r, PXU, sky.sunColor);
    ctx.restore();
    if(sky.stars > 0.5){
      pixelBlob(sunX-r*0.35, sunY-r*0.2, r*0.28, r*0.28, PXU, lerpColor(sky.sunColor,'#000000',0.15));
    }
  }

  function drawCloud(cx,cy,size,color){
    pixelBlob(cx, cy, size, size*0.6, PXU, color);
    pixelBlob(cx-size*0.7, cy+size*0.1, size*0.55, size*0.4, PXU, color);
    pixelBlob(cx+size*0.7, cy+size*0.1, size*0.6, size*0.42, PXU, color);
  }

  function drawTree(x, baseY, h, colorNear){
    const trunkW = h*0.14, trunkH = h*0.28;
    pixelRect(x-trunkW/2, baseY-trunkH, trunkW, trunkH, PXU, '#5a3a1c');
    const canopyH = h*0.78, canopyW = h*0.62;
    pixelTriangleStack(x-canopyW/2, baseY-trunkH-canopyH*0.55, canopyW, canopyH*0.55, PXU, colorNear);
    pixelTriangleStack(x-canopyW*0.42, baseY-trunkH-canopyH*0.85, canopyW*0.84, canopyH*0.4, PXU, colorNear);
    pixelTriangleStack(x-canopyW*0.3, baseY-trunkH-canopyH*1.05, canopyW*0.6, canopyH*0.3, PXU, colorNear);
  }

  function drawParallax(sky){
    // clouds (slow, independent of ground offsets)
    ctx.globalAlpha = 0.85;
    for(let i=0;i<3;i++){
      const cx = ((i*260 + elapsed*0.012) % (W+200)) - 100;
      drawCloud(cx, H*0.14 + i*30*scale, 30*scale, sky.stars>0.5 ? 'rgba(200,210,240,0.5)' : 'rgba(255,255,255,0.85)');
    }
    ctx.globalAlpha = 1;

    // far trees
    const unitFar = 90*scale;
    const countFar = Math.ceil(W/unitFar)+2;
    for(let i=-1;i<countFar;i++){
      const bx = (i*unitFar) - (farOffset % unitFar);
      const seed = Math.abs(Math.floor((bx+farOffset)/unitFar + i*7));
      const h = (60 + (seed*29)%40) * scale;
      drawTree(bx + unitFar*0.5, groundY-2*scale, h, sky.far);
    }
    // near trees
    const unitNear = 130*scale;
    const countNear = Math.ceil(W/unitNear)+2;
    for(let i=-1;i<countNear;i++){
      const bx = (i*unitNear) - (nearOffset % unitNear);
      const seed = Math.abs(Math.floor((bx+nearOffset)/unitNear + i*13));
      const h = (86 + (seed*31)%54) * scale;
      drawTree(bx + unitNear*0.5, groundY, h, sky.near);
    }
  }

  function drawGround(sky){
    // dirt band
    pixelRect(0, groundY, W, H-groundY, PXU, sky.dirt);
    // dark bottom band
    const bottomH = (H-groundY)*0.32;
    pixelRect(0, H-bottomH, W, bottomH, PXU, lerpColor(sky.dirt,'#1c1220',0.6));
    // dirt texture dots
    ctx.globalAlpha = 0.35;
    const dotUnit = PXU*2;
    for(let i=0;i<26;i++){
      const seed = i*971;
      const dx = ((seed*37 - nearOffset*1.6) % W + W) % W;
      const dy = groundY + PXU*2 + (seed % Math.max(1,Math.floor((H-groundY)*0.5)));
      pixelRect(dx, dy, dotUnit, dotUnit, PXU, lerpColor(sky.dirt,'#000000',0.3));
    }
    ctx.globalAlpha = 1;
    // grass band with jagged edge
    const grassH = 14*scale;
    pixelRect(0, groundY-grassH, W, grassH, PXU, sky.ground);
    const zig = PXU*2;
    for(let x=0; x<W; x+=zig*2){
      const off = ((x - nearOffset*1.6) % (zig*4) + zig*4) % (zig*4);
      const up = off < zig*2;
      pixelRect(x, groundY-grassH-(up?PXU:0), zig, PXU, PXU, sky.ground);
    }
  }

  function drawCoin(c){
    if(c.taken) return;
    const bobY = Math.sin(elapsed*0.006+c.bob)*3*scale;
    const spin = Math.abs(Math.cos(elapsed*0.005+c.bob));
    const rx = Math.max(2*scale, c.r*spin);
    ctx.save();
    ctx.translate(c.x, c.y+bobY);
    pixelBlobOutlined(0,0, rx, c.r, PXU, '#ffd166', '#b56a1c');
    pixelRect(-rx*0.3, -c.r*0.4, Math.max(PXU,rx*0.4), PXU, PXU, '#fff6cf');
    ctx.restore();
  }

  function drawObstacle(ob){
    if(ob.type==='house'){
      const wallH = ob.h*0.62;
      pixelRect(ob.x, ob.y+ob.h-wallH, ob.w, wallH, PXU, '#d9a066');
      pixelTriangleStack(ob.x-6*scale, ob.y, ob.w+12*scale, ob.h-wallH, PXU, '#b8433f');
      const dw = ob.w*0.3, dh = wallH*0.55;
      pixelRect(ob.x+ob.w/2-dw/2, ob.y+ob.h-dh, dw, dh, PXU, '#5a3a1c');
      pixelRect(ob.x+ob.w*0.16, ob.y+ob.h-wallH+6*scale, ob.w*0.2, ob.w*0.2, PXU, '#2b2140');
    } else if(ob.type==='person'){
      const cx = ob.x+ob.w/2;
      pixelRect(ob.x, ob.y+ob.h*0.35, ob.w, ob.h*0.65, PXU, '#3d6a9e');
      pixelBlobOutlined(cx, ob.y+ob.h*0.2, ob.h*0.2, ob.h*0.2, PXU, '#e8b48a', '#7a4a2e');
    } else {
      pixelRect(ob.x, ob.y, ob.w, ob.h, PXU, '#8a5a2c');
      for(let px=ob.x; px<ob.x+ob.w; px+=14*scale) pixelRect(px, ob.y, PXU, ob.h, PXU, '#5a3a1c');
      pixelRect(ob.x+6*scale, ob.y+ob.h, 10*scale, groundY-(ob.y+ob.h), PXU, '#6b4423');
      pixelRect(ob.x+ob.w-16*scale, ob.y+ob.h, 10*scale, groundY-(ob.y+ob.h), PXU, '#6b4423');
    }
  }

  // =============== cat sprite (procedural pixel, parametric animation) ===============
  function drawCat(){
    const x = cat.x(), y = cat.y, w = cat.w, h = cat.h;
    const unit = Math.max(2, Math.round(w/11));
    ctx.save();
    ctx.translate(x,y);

    const body='#e8873a', dark='#b85f22', belly='#fff3e0', outline='#2b1710';

    // tail
    const tailStep = cat.grounded ? Math.round(Math.sin(cat.tailPhase))*unit : unit;
    pixelRect(-unit*2, h*0.32, unit*3, unit, unit, outline);
    pixelRect(-unit*3, h*0.32-tailStep, unit*2, unit, unit, body);

    // back leg
    const legSwing = cat.grounded ? Math.sin(cat.legPhase) : -0.6;
    const legLen = cat.ducking ? h*0.12 : h*0.26;
    pixelRect(w*0.2 + legSwing*unit, h-legLen, unit*2, legLen, unit, dark);
    // front leg
    pixelRect(w*0.6 - legSwing*unit, h-legLen, unit*2, legLen, unit, dark);

    // body
    pixelBlobOutlined(w*0.48, h*0.5, w*0.34, h*0.32, unit, body, outline);
    // belly
    pixelBlob(w*0.5, h*0.66, w*0.2, h*0.18, unit, belly);

    // stripes
    for(let i=0;i<3;i++){
      pixelRect(w*(0.28+i*0.13), h*0.24, unit, h*0.16, unit, dark);
    }

    // head
    const headR = w*0.26, headX=w*0.82, headY=h*0.3;
    pixelBlobOutlined(headX, headY, headR, headR, unit, body, outline);

    // ears
    pixelTriangleStack(headX-headR*0.9, headY-headR*1.7, headR*0.7, headR*0.9, unit, outline);
    pixelTriangleStack(headX-headR*0.75, headY-headR*1.5, headR*0.45, headR*0.6, unit, body);
    pixelTriangleStack(headX+headR*0.25, headY-headR*1.7, headR*0.7, headR*0.9, unit, outline);
    pixelTriangleStack(headX+headR*0.35, headY-headR*1.5, headR*0.45, headR*0.6, unit, body);

    // eye
    if(cat.blink <= 0){
      pixelRect(headX+headR*0.15, headY-unit*0.5, unit, unit, unit, outline);
    } else {
      pixelRect(headX+headR*0.05, headY, unit*1.4, Math.max(1,unit*0.4), unit, outline);
    }
    // nose
    pixelRect(headX+headR*0.85, headY+unit*0.3, unit, unit, unit, '#b85f22');
    // whiskers
    pixelRect(headX+headR*0.9, headY-unit*0.2, unit*2, Math.max(1,unit*0.3), unit, 'rgba(43,23,16,0.5)');
    pixelRect(headX+headR*0.9, headY+unit*0.8, unit*2, Math.max(1,unit*0.3), unit, 'rgba(43,23,16,0.5)');

    ctx.restore();
  }

  // =============== decorative start-screen mushroom house ===============
  function drawHomeHouse(sky){
    const baseX = W*0.16, baseY = groundY;
    const s = Math.min(W,H)*0.34;
    const unit = Math.max(2, Math.round(s/22));
    ctx.save();
    ctx.translate(baseX, baseY);
    // chimney smoke
    for(let i=0;i<3;i++){
      const phase = (elapsed*0.001 + i*0.9) % 3;
      const sy = -s*0.9 - phase*20*scale;
      const alpha = Math.max(0, 1-phase/3);
      ctx.globalAlpha = alpha*0.5;
      pixelBlob(s*0.22 + Math.sin(phase*3)*4*scale, sy, 7*scale+phase*3*scale, 7*scale+phase*3*scale, unit, '#d9d9d9');
    }
    ctx.globalAlpha = 1;
    // chimney
    pixelRect(s*0.14, -s*0.95, unit*3, s*0.35, unit, '#6b6f7a');
    // cap (dome)
    pixelBlobOutlined(0, -s*0.55, s*0.62, s*0.4, unit, '#b8433f', '#5a1f1c');
    // spots
    pixelBlob(-s*0.2, -s*0.65, s*0.08, s*0.08, unit, '#f2e9d8');
    pixelBlob(s*0.15, -s*0.7, s*0.07, s*0.07, unit, '#f2e9d8');
    pixelBlob(s*0.32, -s*0.5, s*0.06, s*0.06, unit, '#f2e9d8');
    // walls (cover lower cap to form dome silhouette)
    pixelRect(-s*0.42, -s*0.3, s*0.84, s*0.5, unit, '#d9a066');
    // door
    pixelRect(-unit*3, -s*0.06, unit*6, s*0.24, unit, '#5a3a1c');
    pixelRect(-unit*1, s*0.05, unit*1.4, unit*1.4, unit, '#ffd166');
    // window
    pixelRect(s*0.12, -s*0.22, s*0.18, s*0.16, unit, '#2b2140');
    pixelRect(s*0.12+ (s*0.18)/2 - unit*0.3, -s*0.22, unit*0.6, s*0.16, unit, '#5a3a1c');
    ctx.restore();
  }

  function updateCycleIndicator(sky){
    const dot = document.getElementById('cycleDot');
    dot.setAttribute('cx', 10 + 200*sky.progress);
    dot.setAttribute('cy', 30 - Math.sin(sky.progress*Math.PI)*26);
    dot.setAttribute('fill', sky.stars>0.5 ? '#e9ecff' : '#FFD65C');
  }

  // =============== update ===============
  function update(dt){
    const f = dt/16.6667;
    elapsed += dt;
    cycleTime = (cycleTime + dt/1000) % CYCLE_LENGTH;
    const sky = getSky();
    updateCycleIndicator(sky);

    const running = (state === 'playing');
    const parallaxSpeed = running ? speed : BASE_SPEED_REF*scale*0.4;
    farOffset += parallaxSpeed*0.25*f;
    nearOffset += parallaxSpeed*0.55*f;

    if(cat){
      if(running){
        const GRAV = 0.92*scale;
        if(!cat.grounded){
          cat.vy += GRAV*f; cat.y += cat.vy*f;
          const standY = groundY - cat.h;
          if(cat.y >= standY){ cat.y = standY; cat.vy = 0; cat.grounded = true; }
        } else {
          cat.legPhase += 0.35*f*(speed/(BASE_SPEED_REF*scale));
          cat.y = groundY - (cat.ducking ? cat.h*0.55 : cat.h);
        }
      } else {
        cat.grounded = true; cat.ducking = false;
        cat.legPhase += 0.03*f;
        cat.y = groundY - cat.h;
      }
      cat.tailPhase += 0.12*f;
      cat.blink = Math.max(0, cat.blink - dt);
      if(Math.random() < 0.006*f) cat.blink = 140;
    }

    if(!running) return;

    const tSec = elapsed/1000;
    speed = (BASE_SPEED_REF + Math.min(tSec*0.045, 6.5)) * scale;
    score += f*0.14*(speed/scale);
    document.getElementById('scoreVal').textContent = Math.floor(score);
    document.getElementById('coinVal').textContent = coins;

    spawnTimer -= dt;
    if(spawnTimer <= 0){ spawnObstacle(); spawnTimer = Math.max(650, 1500-tSec*8) + Math.random()*500; }
    coinTimer -= dt;
    if(coinTimer <= 0){ if(Math.random()<0.5) spawnGroundCoins(); coinTimer = 900+Math.random()*900; }

    for(const ob of obstacles) ob.x -= speed*f;
    obstacles = obstacles.filter(ob => ob.x+ob.w > -20);
    for(const c of coinList) c.x -= speed*f;
    coinList = coinList.filter(c => c.x > -20 && !c.taken);

    const catX = cat.x();
    const curH = cat.ducking ? cat.h*0.55 : cat.h;
    const hb = { x: catX+cat.w*0.18, y: cat.y+curH*0.1, w: cat.w*0.64, h: curH*0.8 };
    for(const ob of obstacles){
      const overlap = hb.x < ob.x+ob.w && hb.x+hb.w > ob.x && hb.y < ob.y+ob.h && hb.y+hb.h > ob.y;
      if(overlap){ endGame(); break; }
    }
    for(const c of coinList){
      const dx = (catX+cat.w*0.5)-c.x, dy=(cat.y+curH*0.5)-c.y;
      if(Math.sqrt(dx*dx+dy*dy) < c.r+cat.w*0.35){
        c.taken=true; coins+=1; score+=10;
        particles.push({x:c.x,y:c.y,life:400,maxLife:400});
      }
    }
    particles = particles.filter(p => (p.life -= dt) > 0);
  }

  function drawParticles(){
    for(const p of particles){
      const f = p.life/p.maxLife;
      ctx.save(); ctx.globalAlpha=f; ctx.fillStyle='#ffd166';
      ctx.font = `${12*scale}px 'Press Start 2P', monospace`;
      ctx.fillText('+10', p.x, p.y-(1-f)*20*scale);
      ctx.restore();
    }
  }

  function render(){
    const sky = getSky();
    ctx.clearRect(0,0,W,H);
    drawSky(sky);
    drawParallax(sky);
    drawGround(sky);
    if(state!=='playing') drawHomeHouse(sky);
    for(const c of coinList) drawCoin(c);
    for(const ob of obstacles) drawObstacle(ob);
    if(cat) drawCat();
    drawParticles();
    if(sky.stars > 0.1){
      ctx.save(); ctx.globalAlpha = sky.stars*0.22;
      const vg = ctx.createRadialGradient(W/2,H/2,H*0.2, W/2,H/2,H*0.9);
      vg.addColorStop(0,'rgba(0,0,0,0)'); vg.addColorStop(1,'rgba(0,0,10,0.6)');
      ctx.fillStyle = vg; ctx.fillRect(0,0,W,H);
      ctx.restore();
    }
  }

  function loop(ts){
    if(!lastTime) lastTime = ts;
    const dt = Math.min(48, ts-lastTime);
    lastTime = ts;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  window.addEventListener('resize', resize);
  resize();
  initStars();
  cat = makeCat();
  applyLanguage();
  requestAnimationFrame(loop);
})();