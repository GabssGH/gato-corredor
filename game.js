(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  // =============== i18n ===============
  const STR = {
    pt: {
      title:'CORREDOR FELINO',
      menuStart:'Começar o jogo', menuControls:'Comandos', menuShop:'Loja', menuLeaderboard:'Placar Global',
      controlsTitle:'COMANDOS',
      ctrlJumpLabel:'PULAR', ctrlJumpDesc:'Segure para carregar o pulo — quanto mais tempo segurar, mais alto o gato pula. Não precisa carregar tudo!',
      ctrlDuckLabel:'ABAIXAR', ctrlDuckDesc:'Segure o botão, a seta ↓ ou a tecla S',
      backBtn:'Voltar',
      shopTitle:'LOJA', buyBtn:'Comprar', selectBtn:'Selecionar', selectedLabel:'Selecionado', ownedLabel:'Adquirido',
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
      menuStart:'Start game', menuControls:'Controls', menuShop:'Shop', menuLeaderboard:'Global Leaderboard',
      controlsTitle:'CONTROLS',
      ctrlJumpLabel:'JUMP', ctrlJumpDesc:'Hold to charge the jump — the longer you hold, the higher the cat jumps. You don\'t need to fill the whole bar!',
      ctrlDuckLabel:'DUCK', ctrlDuckDesc:'Hold the button, ↓ arrow or the S key',
      backBtn:'Back',
      shopTitle:'SHOP', buyBtn:'Buy', selectBtn:'Select', selectedLabel:'Selected', ownedLabel:'Owned',
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

  const startScreen = document.getElementById('startScreen');
  const controlsPanel = document.getElementById('controlsPanel');
  const shopPanel = document.getElementById('shopPanel');
  const leaderboardPanel = document.getElementById('leaderboardPanel');
  const gameOverScreen = document.getElementById('gameOverScreen');
  const hud = document.getElementById('hud');
  const touchControls = document.getElementById('controls');
  const topBar = document.getElementById('topBar');

  function applyLanguage(){
    document.querySelectorAll('[data-i18n]').forEach(el=>{
      const key = el.getAttribute('data-i18n');
      const nested = el.querySelector('span[id]');
      if(nested){ el.childNodes[0].textContent = t(key) + ' '; }
      else { el.textContent = t(key); }
    });
    document.title = t('title');
    document.getElementById('langPt').classList.toggle('active', lang==='pt');
    document.getElementById('langEn').classList.toggle('active', lang==='en');
    if(!leaderboardPanel.classList.contains('hidden')) renderLeaderboard(lastLbData, lastLbError);
    if(!shopPanel.classList.contains('hidden')) renderShop();
  }
  document.getElementById('langPt').addEventListener('click', ()=>{ lang='pt'; applyLanguage(); savePersonal('lang','pt'); });
  document.getElementById('langEn').addEventListener('click', ()=>{ lang='en'; applyLanguage(); savePersonal('lang','en'); });

  // =============== storage helpers ===============
  async function savePersonal(key, value){ try{ await window.storage.set(key, value, false); }catch(e){} }
  async function loadPersonal(key){ try{ const res = await window.storage.get(key, false); return res ? res.value : null; }catch(e){ return null; } }

  const ADJ = ['Veloz','Ágil','Sortudo','Corajoso','Sonhador','Travesso','Esperto','Faminto','Dourado','Sombrio','Elétrico','Silencioso'];
  const NOUN = ['Gato','Felino','Bigode','Miau','Patinha','Rajado','Sorriso','Ronron'];
  function generateRandomName(){
    const a = ADJ[Math.floor(Math.random()*ADJ.length)];
    const n = NOUN[Math.floor(Math.random()*NOUN.length)];
    return `${n}${a}${Math.floor(Math.random()*900+100)}`;
  }

  // skins / shop
  const SKINS = [
    { id:'tabby',  name_pt:'Malhado Laranja', name_en:'Orange Tabby', price:0,   body:'#e8873a', dark:'#b85f22', belly:'#fff3e0' },
    { id:'gray',   name_pt:'Cinza Malhado',   name_en:'Gray Tabby',   price:80,  body:'#9aa0a8', dark:'#6b7178', belly:'#e8ecef' },
    { id:'tuxedo', name_pt:'Preto e Branco',  name_en:'Black & White',price:150, body:'#2b2b2b', dark:'#000000', belly:'#ffffff' },
    { id:'black',  name_pt:'Totalmente Preto',name_en:'All Black',    price:300, body:'#1c1c1c', dark:'#000000', belly:'#3a3a3a' },
    { id:'golden', name_pt:'Dourado',         name_en:'Golden',       price:500, body:'#ffd166', dark:'#c99a2e', belly:'#fff6d9' },
  ];

  let playerName=null, totalCoins=0, ownedSkins=['tabby'], selectedSkinId='tabby', musicMuted=false;

  async function ensurePlayerIdentity(){
    let name = await loadPersonal('playerName');
    if(!name){ name = generateRandomName(); await savePersonal('playerName', name); }
    playerName = name;

    const savedLang = await loadPersonal('lang');
    if(savedLang==='pt' || savedLang==='en') lang = savedLang;

    const savedTotal = await loadPersonal('totalCoins');
    totalCoins = savedTotal ? (parseInt(savedTotal,10)||0) : 0;

    const savedOwned = await loadPersonal('ownedSkins');
    try{ ownedSkins = savedOwned ? JSON.parse(savedOwned) : ['tabby']; }catch(e){ ownedSkins=['tabby']; }
    if(!ownedSkins.includes('tabby')) ownedSkins.unshift('tabby');

    const savedSkin = await loadPersonal('selectedSkin');
    selectedSkinId = (savedSkin && ownedSkins.includes(savedSkin)) ? savedSkin : 'tabby';

    const savedMuted = await loadPersonal('musicMuted');
    musicMuted = savedMuted === '1';
    document.getElementById('musicToggle').textContent = musicMuted ? '🔇' : '🔊';
    if(masterGain) masterGain.gain.value = musicMuted ? 0 : 0.16;

    document.getElementById('coinVal').textContent = totalCoins;
    applyLanguage();
  }

  async function submitScore(name, scoreVal, coinsVal){
    try{
      let list = [];
      try{
        const res = await window.storage.get('leaderboard', true);
        if(res && res.value) list = JSON.parse(res.value);
      }catch(e){ list = []; }
      list.push({ name, score: Math.floor(scoreVal), coins: coinsVal, ts: Date.now() });
      list.sort((a,b)=>b.score-a.score);
      list = list.slice(0,50);
      await window.storage.set('leaderboard', JSON.stringify(list), true);
    }catch(e){}
  }

  let lastLbData=null, lastLbError=false;
  async function fetchLeaderboard(){
    lastLbData=null; lastLbError=false;
    renderLeaderboard(null,false);
    try{
      const res = await window.storage.get('leaderboard', true);
      lastLbData = res && res.value ? JSON.parse(res.value) : [];
    }catch(e){ lastLbData=[]; lastLbError=true; }
    renderLeaderboard(lastLbData, lastLbError);
  }
  function renderLeaderboard(list, err){
    const el = document.getElementById('lbContent');
    if(list === null){ el.innerHTML = `<div class="lb-loading">${t('loadingLb')}</div>`; return; }
    if(err){ el.innerHTML = `<div class="lb-empty">${t('lbError')}</div>`; return; }
    if(!list.length){ el.innerHTML = `<div class="lb-empty">${t('lbEmpty')}</div>`; return; }
    let rows='';
    list.slice(0,10).forEach((entry,i)=>{
      const mine = entry.name === playerName;
      rows += `<tr class="${mine?'me':''}"><td>${i+1}</td><td>${escapeHtml(entry.name)}</td><td>${entry.score}</td><td>🪙${entry.coins}</td></tr>`;
    });
    el.innerHTML = `<table id="lbTable"><thead><tr><th>${t('lbRank')}</th><th>${t('lbName')}</th><th>${t('lbScore')}</th><th>${t('lbCoins')}</th></tr></thead><tbody>${rows}</tbody></table>`;
  }
  function escapeHtml(s){ return String(s).replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

  function renderShop(){
    document.getElementById('walletLine').textContent = `🪙 ${totalCoins}`;
    const el = document.getElementById('shopContent');
    el.innerHTML = '';
    SKINS.forEach(sk=>{
      const owned = ownedSkins.includes(sk.id);
      const isSelected = selectedSkinId === sk.id;
      const row = document.createElement('div');
      row.className = 'cmd-row';

      const swatch = document.createElement('div');
      swatch.className = 'swatch';
      swatch.style.background = sk.body;
      swatch.style.border = `3px solid ${sk.dark}`;

      const textWrap = document.createElement('div');
      textWrap.className = 'cmd-text';
      const b = document.createElement('b');
      b.textContent = lang==='pt' ? sk.name_pt : sk.name_en;
      const span = document.createElement('span');
      span.textContent = owned ? (isSelected ? t('selectedLabel') : t('ownedLabel')) : `${sk.price} 🪙`;
      textWrap.appendChild(b); textWrap.appendChild(span);

      const btn = document.createElement('button');
      btn.className = 'btn secondary';
      if(owned){
        btn.textContent = isSelected ? t('selectedLabel') : t('selectBtn');
        btn.disabled = isSelected;
        btn.addEventListener('click', ()=>{
          selectedSkinId = sk.id;
          savePersonal('selectedSkin', sk.id);
          renderShop();
        });
      } else {
        btn.textContent = t('buyBtn');
        btn.disabled = totalCoins < sk.price;
        btn.addEventListener('click', ()=>{
          if(totalCoins >= sk.price){
            totalCoins -= sk.price;
            ownedSkins.push(sk.id);
            selectedSkinId = sk.id;
            savePersonal('totalCoins', String(totalCoins));
            savePersonal('ownedSkins', JSON.stringify(ownedSkins));
            savePersonal('selectedSkin', sk.id);
            document.getElementById('coinVal').textContent = totalCoins;
            renderShop();
          }
        });
      }
      row.appendChild(swatch); row.appendChild(textWrap); row.appendChild(btn);
      el.appendChild(row);
    });
  }

  // =============== canvas sizing ===============
  let W=0,H=0,scale=1,hScale=1,PXU=4;
  let dpr = Math.max(1, Math.min(window.devicePixelRatio||1, 2));
  let groundY = 480;

  function resize(){
    const rect = stage.getBoundingClientRect();
    W = rect.width; H = rect.height;
    canvas.width = W*dpr; canvas.height = H*dpr;
    ctx.setTransform(dpr,0,0,dpr,0,0);
    ctx.imageSmoothingEnabled = false;
    scale = H/600;
    hScale = Math.max(0.5, Math.min(1.5, W/800));
    PXU = Math.max(2, Math.round(4*scale));
    groundY = H*0.78;
  }

  // =============== pixel primitives ===============
  function pxSnap(v,unit){ return Math.round(v/unit)*unit; }
  function pixelRect(x,y,w,h,unit,color){
    ctx.fillStyle = color;
    const gx=pxSnap(x,unit), gy=pxSnap(y,unit);
    const gw=Math.max(unit,pxSnap(w,unit)), gh=Math.max(unit,pxSnap(h,unit));
    ctx.fillRect(gx,gy,gw,gh);
  }
  function pixelBlob(cx,cy,rx,ry,unit,color){
    ctx.fillStyle = color;
    const steps = Math.max(1, Math.round(ry/unit));
    for(let j=-steps;j<=steps;j++){
      const yy=j*unit;
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
    { t:0,                sky:['#7ec8ff','#cdeeff'], sun:'#ffe38a', glow:'rgba(255,230,150,0.35)', far:'#8fa8c9', near:'#5f7fa6', ground:'#5fae3b', dirt:'#8a5a2c', windowOn:0.1, stars:0 },
    { t:CYCLE_LENGTH*0.34,sky:['#ff9d5c','#ffd8a0'], sun:'#ff7a3d', glow:'rgba(255,140,70,0.45)', far:'#a37e8a', near:'#6b4d5c', ground:'#9c8a3f', dirt:'#7a4a24', windowOn:0.45, stars:0 },
    { t:CYCLE_LENGTH*0.62,sky:['#0d1240','#2a2f66'], sun:'#e9ecff', glow:'rgba(160,180,255,0.25)', far:'#242c4a', near:'#141a30', ground:'#2f4a2a', dirt:'#3a2818', windowOn:0.9, stars:1 },
    { t:CYCLE_LENGTH,     sky:['#7ec8ff','#cdeeff'], sun:'#ffe38a', glow:'rgba(255,230,150,0.35)', far:'#8fa8c9', near:'#5f7fa6', ground:'#5fae3b', dirt:'#8a5a2c', windowOn:0.1, stars:0 },
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
  let state = 'start';
  let lastTime=0, elapsed=0;
  let score=0, runCoins=0, best=0, speed=0;
  const BASE_SPEED_REF = 6.2;
  const CHARGE_TIME = 550;
  const MIN_JUMP_VEL = -11, MAX_JUMP_VEL = -19;
  let cat, obstacles=[], coinList=[], particles=[];
  let spawnTimer=0, coinTimer=0;
  let farOffset=0, nearOffset=0;
  let starsField=[];

  function initStars(){
    starsField=[];
    for(let i=0;i<50;i++) starsField.push({x:Math.random(), y:Math.random()*0.5, r:Math.random()*1.6+0.6, tw:Math.random()*Math.PI*2});
  }

  function makeCat(){
    return {
      x: () => W*0.14,
      y: groundY - 54*scale,
      vy:0, w:40*scale, h:54*scale, curH:54*scale,
      ducking:false, grounded:true, charging:false, chargeTimer:0,
      legPhase:0, blink:0, tailPhase:0,
    };
  }

  function resetGame(){
    score=0; runCoins=0; elapsed=0;
    speed = BASE_SPEED_REF*hScale;
    obstacles=[]; coinList=[]; particles=[];
    spawnTimer=900; coinTimer=600;
    cat = makeCat();
  }

  // =============== input ===============
  function startCharge(){
    if(state!=='playing') return;
    if(!cat.grounded || cat.ducking || cat.charging) return;
    cat.charging = true; cat.chargeTimer = 0;
  }
  function releaseJump(){
    if(!cat || !cat.charging) return;
    const charge = Math.min(1, cat.chargeTimer/CHARGE_TIME);
    cat.charging = false; cat.chargeTimer = 0;
    if(cat.grounded){
      cat.vy = (MIN_JUMP_VEL + (MAX_JUMP_VEL-MIN_JUMP_VEL)*charge) * scale;
      cat.grounded = false;
    }
  }
  function setDuck(v){
    if(state !== 'playing') return;
    if(cat.charging) return;
    cat.ducking = v && cat.grounded;
  }

  window.addEventListener('keydown',(e)=>{
    if(['Space','ArrowUp','KeyW'].includes(e.code)){ e.preventDefault(); startCharge(); }
    if(['ArrowDown','KeyS'].includes(e.code)){ e.preventDefault(); setDuck(true); }
    if(state==='start'){
      if(e.code==='ArrowDown'){ moveSelection(1); }
      if(e.code==='ArrowUp'){ moveSelection(-1); }
      if(e.code==='Enter'){ activateSelection(); }
    }
  });
  window.addEventListener('keyup',(e)=>{
    if(['Space','ArrowUp','KeyW'].includes(e.code)){ releaseJump(); }
    if(['ArrowDown','KeyS'].includes(e.code)){ setDuck(false); }
  });

  function bindHold(el,onDown,onUp){
    const down=(e)=>{ e.preventDefault(); e.stopPropagation(); el.classList.add('active'); onDown(); };
    const up=(e)=>{ e.preventDefault(); e.stopPropagation(); el.classList.remove('active'); onUp(); };
    el.addEventListener('pointerdown',down);
    el.addEventListener('pointerup',up);
    el.addEventListener('pointerleave',up);
    el.addEventListener('pointercancel',up);
  }
  bindHold(document.getElementById('btnJump'), startCharge, releaseJump);
  bindHold(document.getElementById('btnDuck'), ()=>setDuck(true), ()=>setDuck(false));
  canvas.addEventListener('pointerdown', ()=>{ if(state==='playing') startCharge(); });
  canvas.addEventListener('pointerup', ()=>{ if(state==='playing') releaseJump(); });
  canvas.addEventListener('pointerleave', ()=>{ if(state==='playing') releaseJump(); });

  // start music / audio context on first user gesture (autoplay policy)
  document.addEventListener('pointerdown', function once(){
    startMusic();
    document.removeEventListener('pointerdown', once);
  }, { once:true });

  // =============== screens ===============
  const menuItems = Array.from(document.querySelectorAll('.menu-item'));
  let selIndex = 0;
  function renderSelection(){ menuItems.forEach((it,i)=> it.classList.toggle('selected', i===selIndex)); }
  function moveSelection(d){ selIndex = (selIndex+d+menuItems.length)%menuItems.length; renderSelection(); }
  function activateSelection(){ handleMenuAction(menuItems[selIndex].dataset.action); }
  menuItems.forEach((it,i)=>{
    it.addEventListener('click', ()=>{ selIndex=i; renderSelection(); handleMenuAction(it.dataset.action); });
    it.addEventListener('mouseenter', ()=>{ selIndex=i; renderSelection(); });
  });
  renderSelection();

  function showScreen(which){
    startScreen.classList.toggle('hidden', which!=='start');
    controlsPanel.classList.toggle('hidden', which!=='controls');
    shopPanel.classList.toggle('hidden', which!=='shop');
    leaderboardPanel.classList.toggle('hidden', which!=='leaderboard');
    gameOverScreen.classList.toggle('hidden', which!=='gameover');
    hud.classList.toggle('hidden', which!=='playing');
    touchControls.classList.toggle('hidden', which!=='playing');
    topBar.classList.toggle('hidden', which==='playing');
  }

  function handleMenuAction(action){
    if(action==='start') startGame();
    else if(action==='controls'){ state='controls'; showScreen('controls'); }
    else if(action==='shop'){ state='shop'; showScreen('shop'); renderShop(); }
    else if(action==='leaderboard'){ state='leaderboard'; showScreen('leaderboard'); fetchLeaderboard(); }
  }
  document.getElementById('controlsBack').addEventListener('click', ()=>{ state='start'; showScreen('start'); });
  document.getElementById('shopBack').addEventListener('click', ()=>{ state='start'; showScreen('start'); });
  document.getElementById('leaderboardBack').addEventListener('click', ()=>{ state='start'; showScreen('start'); });
  document.getElementById('restartBtn').addEventListener('click', startGame);
  document.getElementById('toMenuBtn').addEventListener('click', ()=>{ state='start'; cat=makeCat(); showScreen('start'); });

  function startGame(){ resetGame(); state='playing'; showScreen('playing'); }

  async function endGame(){
    state='gameover';
    best = Math.max(best, Math.floor(score));
    document.getElementById('finalScore').textContent = Math.floor(score);
    document.getElementById('finalCoins').textContent = runCoins;
    document.getElementById('bestScore').textContent = best;
    document.getElementById('playerNameShown').textContent = playerName || '...';
    showScreen('gameover');
    submitScore(playerName, score, runCoins);
  }

  // =============== obstacles & coins ===============
  function spawnObstacle(){
    const roll = Math.random();
    let type;
    if(roll < 0.42) type='house'; else if(roll < 0.75) type='walker'; else type='bridge';
    let ob;
    if(type==='house'){
      const h=(34+Math.random()*16)*scale, w=(38+Math.random()*14)*scale;
      ob = { type, x:W+20, y:groundY-h, w, h };
    } else if(type==='walker'){
      const isDog = Math.random() < 0.5;
      const h = isDog ? (24+Math.random()*6)*scale : (42+Math.random()*8)*scale;
      const w = isDog ? 30*scale : 20*scale;
      ob = { type, kind:isDog?'dog':'person', x:W+20, y:groundY-h, w, h, selfSpeed:(16+Math.random()*20)*hScale, legPhase:Math.random()*Math.PI*2 };
    } else {
      const gap=42*scale, beamH=20*scale, w=110*scale;
      ob = { type, x:W+20, y:groundY-gap-beamH, w, h:beamH, gap };
    }
    obstacles.push(ob);
    if(Math.random() < 0.8){
      if(type==='bridge'){
        for(let i=0;i<3;i++) coinList.push({ x:ob.x+18*scale+i*26*scale, y:groundY-ob.gap*0.55-6*scale, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
      } else {
        const n=3;
        for(let i=0;i<n;i++){
          const fx = ob.x + (i+0.5)*(ob.w/n);
          coinList.push({ x:fx, y:ob.y-14*scale, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
        }
      }
    }
  }
  function spawnGroundCoins(){
    const n = 2+Math.floor(Math.random()*3);
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
    ctx.save(); ctx.shadowColor = sky.glow; ctx.shadowBlur = 30*scale;
    pixelBlob(sunX, sunY, r, r, PXU, sky.sunColor);
    ctx.restore();
    if(sky.stars > 0.5) pixelBlob(sunX-r*0.35, sunY-r*0.2, r*0.28, r*0.28, PXU, lerpColor(sky.sunColor,'#000000',0.15));
  }

  function drawCloud(cx,cy,size,color){
    pixelBlob(cx, cy, size, size*0.6, PXU, color);
    pixelBlob(cx-size*0.7, cy+size*0.1, size*0.55, size*0.4, PXU, color);
    pixelBlob(cx+size*0.7, cy+size*0.1, size*0.6, size*0.42, PXU, color);
  }

  function drawBuildingRow(offset, baseY, unit, wallColor, seedBase, windowFactor, sky){
    const bw = unit;
    const count = Math.ceil(W/bw)+2;
    for(let i=-1;i<count;i++){
      const bx = (i*bw) - (offset % bw);
      const seed = Math.abs(Math.floor((bx+offset)/bw + i*7 + seedBase));
      const h = (unit*1.3 + (seed*37 % (unit*2.2)));
      pixelRect(bx, baseY-h, bw*0.8, h, PXU, wallColor);
      const rows = Math.max(1, Math.floor(h/(16*scale)));
      const cols = 3;
      for(let r=1;r<rows;r++){
        for(let c=0;c<cols;c++){
          const wseed = seed+r*3+c*5;
          if(wseed%5===0) continue;
          const flicker = 0.5+0.5*Math.sin(elapsed*0.0012 + wseed*1.7);
          ctx.globalAlpha = sky.windowOn*windowFactor*(0.35+0.65*flicker);
          pixelRect(bx+6*scale+c*((bw*0.8-12*scale)/cols), baseY-h+r*16*scale, 6*scale, 8*scale, PXU, '#ffd27a');
        }
      }
      ctx.globalAlpha = 1;
    }
  }

  function drawParallax(sky){
    ctx.globalAlpha = 0.85;
    for(let i=0;i<3;i++){
      const cx = ((i*260+elapsed*0.012)%(W+200))-100;
      drawCloud(cx, H*0.14+i*30*scale, 30*scale, sky.stars>0.5?'rgba(200,210,240,0.5)':'rgba(255,255,255,0.85)');
    }
    ctx.globalAlpha = 1;
    drawBuildingRow(farOffset, groundY-2*scale, 70*scale, sky.far, 11, 0.6, sky);
    drawBuildingRow(nearOffset, groundY, 100*scale, sky.near, 29, 1, sky);
  }

  function drawGround(sky){
    pixelRect(0, groundY, W, H-groundY, PXU, sky.dirt);
    const bottomH = (H-groundY)*0.32;
    pixelRect(0, H-bottomH, W, bottomH, PXU, lerpColor(sky.dirt,'#1c1220',0.6));
    ctx.globalAlpha = 0.35;
    const dotUnit = PXU*2;
    for(let i=0;i<26;i++){
      const seed = i*971;
      const dx = ((seed*37 - nearOffset*1.6) % W + W) % W;
      const dy = groundY + PXU*2 + (seed % Math.max(1,Math.floor((H-groundY)*0.5)));
      pixelRect(dx, dy, dotUnit, dotUnit, PXU, lerpColor(sky.dirt,'#000000',0.3));
    }
    ctx.globalAlpha = 1;
    const grassH = 14*scale;
    pixelRect(0, groundY-grassH, W, grassH, PXU, sky.ground);
    const zig = PXU*2;
    for(let x=0; x<W; x+=zig*2){
      const off = ((x - nearOffset*1.6) % (zig*4) + zig*4) % (zig*4);
      const up = off < zig*2;
      pixelRect(x, groundY-grassH-(up?PXU:0), zig, PXU, PXU, sky.ground);
    }
  }

  function drawBridgeWater(ob, sky){
    const waterColor = lerpColor('#2a6f97','#0d3b52', sky.stars);
    pixelRect(ob.x-6*scale, groundY, ob.w+12*scale, H-groundY, PXU, waterColor);
    ctx.globalAlpha = 0.5;
    for(let i=0;i<3;i++){
      const wy = groundY + 8*scale + i*14*scale;
      const off = (elapsed*0.03 + i*20) % (24*scale);
      for(let wx=ob.x-6*scale+off; wx<ob.x+ob.w+6*scale; wx+=24*scale){
        pixelRect(wx, wy, 10*scale, PXU, PXU, 'rgba(255,255,255,0.5)');
      }
    }
    ctx.globalAlpha = 1;
    pixelRect(ob.x-4*scale, groundY-6*scale, ob.w+8*scale, 6*scale, PXU, '#8a5a2c');
  }

  function drawCoin(c){
    if(c.taken) return;
    const bobY = Math.sin(elapsed*0.006+c.bob)*3*scale;
    const spin = Math.abs(Math.cos(elapsed*0.005+c.bob));
    const rx = Math.max(2*scale, c.r*spin);
    ctx.save(); ctx.translate(c.x, c.y+bobY);
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
    } else if(ob.type==='walker'){
      const legPhase = ob.legPhase + elapsed*0.012;
      if(ob.kind==='dog'){
        const body='#8a5a3c', dark='#5a3a22';
        pixelRect(ob.x, ob.y+ob.h*0.3, ob.w, ob.h*0.5, PXU, body);
        pixelBlobOutlined(ob.x+ob.w*0.85, ob.y+ob.h*0.25, ob.h*0.22, ob.h*0.22, PXU, body, dark);
        const swing = Math.sin(legPhase)*3*scale;
        pixelRect(ob.x+ob.w*0.15+swing, ob.y+ob.h*0.75, ob.w*0.12, ob.h*0.25, PXU, dark);
        pixelRect(ob.x+ob.w*0.65-swing, ob.y+ob.h*0.75, ob.w*0.12, ob.h*0.25, PXU, dark);
      } else {
        const cx = ob.x+ob.w/2;
        const swing = Math.sin(legPhase)*4*scale;
        pixelRect(ob.x+ob.w*0.15+swing, ob.y+ob.h*0.62, ob.w*0.28, ob.h*0.38, PXU, '#3d6a9e');
        pixelRect(ob.x+ob.w*0.55-swing, ob.y+ob.h*0.62, ob.w*0.28, ob.h*0.38, PXU, '#2c4d73');
        pixelRect(ob.x, ob.y+ob.h*0.3, ob.w, ob.h*0.35, PXU, '#3d6a9e');
        pixelBlobOutlined(cx, ob.y+ob.h*0.18, ob.h*0.18, ob.h*0.18, PXU, '#e8b48a', '#7a4a2e');
      }
    } else { // bridge
      pixelRect(ob.x, ob.y, ob.w, ob.h, PXU, '#8a5a2c');
      for(let px=ob.x; px<ob.x+ob.w; px+=14*scale) pixelRect(px, ob.y, PXU, ob.h, PXU, '#5a3a1c');
      const pillarBottom = groundY + (H-groundY)*0.7;
      pixelRect(ob.x+6*scale, ob.y+ob.h, 10*scale, pillarBottom-(ob.y+ob.h), PXU, '#6b4423');
      pixelRect(ob.x+ob.w-16*scale, ob.y+ob.h, 10*scale, pillarBottom-(ob.y+ob.h), PXU, '#6b4423');
    }
  }

  // =============== cat sprite ===============
  function drawCat(){
    const x = cat.x(), y = cat.y, w = cat.w, h = cat.curH;
    const unit = Math.max(2, Math.round(w/11));
    ctx.save(); ctx.translate(x,y);

    const skinObj = SKINS.find(s=>s.id===selectedSkinId) || SKINS[0];
    const body = skinObj.body, dark = skinObj.dark, belly = skinObj.belly, outline = '#2b1710';

    // tail
    const tailStep = cat.grounded ? Math.round(Math.sin(cat.tailPhase))*unit : unit;
    pixelRect(-unit*2, h*0.3, unit*2.4, unit, unit, outline);
    pixelRect(-unit*3, h*0.3-tailStep, unit*1.6, unit, unit, body);

    // legs
    const legSwing = cat.charging ? 0 : (cat.grounded ? Math.sin(cat.legPhase) : -0.6);
    const legLen = cat.ducking ? h*0.1 : h*0.28;
    pixelRect(w*0.22+legSwing*unit, h-legLen, unit*1.6, legLen, unit, dark);
    pixelRect(w*0.58-legSwing*unit, h-legLen, unit*1.6, legLen, unit, dark);

    // body (slimmer, more elongated)
    pixelBlobOutlined(w*0.46, h*0.5, w*0.24, h*0.34, unit, body, outline);
    // belly
    pixelBlob(w*0.5, h*0.66, w*0.13, h*0.17, unit, belly);
    // stripes
    for(let i=0;i<3;i++) pixelRect(w*(0.3+i*0.11), h*0.24, unit, h*0.15, unit, dark);

    // head
    const headR = w*0.21, headX=w*0.82, headY=h*0.28;
    pixelBlobOutlined(headX, headY, headR, headR, unit, body, outline);

    // ears
    pixelTriangleStack(headX-headR*0.9, headY-headR*1.7, headR*0.7, headR*0.9, unit, outline);
    pixelTriangleStack(headX-headR*0.75, headY-headR*1.5, headR*0.45, headR*0.6, unit, body);
    pixelTriangleStack(headX+headR*0.25, headY-headR*1.7, headR*0.7, headR*0.9, unit, outline);
    pixelTriangleStack(headX+headR*0.35, headY-headR*1.5, headR*0.45, headR*0.6, unit, body);

    // eye
    if(cat.blink <= 0) pixelRect(headX+headR*0.15, headY-unit*0.5, unit, unit, unit, outline);
    else pixelRect(headX+headR*0.05, headY, unit*1.4, Math.max(1,unit*0.4), unit, outline);
    // nose
    pixelRect(headX+headR*0.85, headY+unit*0.3, unit, unit, unit, dark);
    // whiskers
    pixelRect(headX+headR*0.9, headY-unit*0.2, unit*2, Math.max(1,unit*0.3), unit, 'rgba(43,23,16,0.5)');
    pixelRect(headX+headR*0.9, headY+unit*0.8, unit*2, Math.max(1,unit*0.3), unit, 'rgba(43,23,16,0.5)');

    ctx.restore();
  }

  function drawChargeBar(){
    if(!cat.charging) return;
    const amt = Math.min(1, cat.chargeTimer/CHARGE_TIME);
    const bx = cat.x()+cat.w*0.05, by = cat.y-14*scale, bw = cat.w*0.9, bh = 6*scale;
    pixelRect(bx-2*scale, by-2*scale, bw+4*scale, bh+4*scale, PXU, '#2b1710');
    pixelRect(bx, by, bw, bh, PXU, '#5a3a1c');
    pixelRect(bx, by, bw*amt, bh, PXU, '#ffd166');
  }

  // =============== decorative start-screen mushroom house ===============
  function drawHomeHouse(sky){
    const baseX = W*0.16, baseY = groundY;
    const s = Math.min(W,H)*0.34;
    const unit = Math.max(2, Math.round(s/22));
    ctx.save(); ctx.translate(baseX, baseY);
    for(let i=0;i<3;i++){
      const phase = (elapsed*0.001 + i*0.9) % 3;
      const sy = -s*0.9 - phase*20*scale;
      const alpha = Math.max(0, 1-phase/3);
      ctx.globalAlpha = alpha*0.5;
      pixelBlob(s*0.22 + Math.sin(phase*3)*4*scale, sy, 7*scale+phase*3*scale, 7*scale+phase*3*scale, unit, '#d9d9d9');
    }
    ctx.globalAlpha = 1;
    pixelRect(s*0.14, -s*0.95, unit*3, s*0.35, unit, '#6b6f7a');
    pixelBlobOutlined(0, -s*0.55, s*0.62, s*0.4, unit, '#b8433f', '#5a1f1c');
    pixelBlob(-s*0.2, -s*0.65, s*0.08, s*0.08, unit, '#f2e9d8');
    pixelBlob(s*0.15, -s*0.7, s*0.07, s*0.07, unit, '#f2e9d8');
    pixelBlob(s*0.32, -s*0.5, s*0.06, s*0.06, unit, '#f2e9d8');
    pixelRect(-s*0.42, -s*0.3, s*0.84, s*0.5, unit, '#d9a066');
    pixelRect(-unit*3, -s*0.06, unit*6, s*0.24, unit, '#5a3a1c');
    pixelRect(-unit*1, s*0.05, unit*1.4, unit*1.4, unit, '#ffd166');
    pixelRect(s*0.12, -s*0.22, s*0.18, s*0.16, unit, '#2b2140');
    pixelRect(s*0.12+(s*0.18)/2-unit*0.3, -s*0.22, unit*0.6, s*0.16, unit, '#5a3a1c');
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
    const parallaxSpeed = running ? speed : BASE_SPEED_REF*hScale*0.4;
    farOffset += parallaxSpeed*0.25*f;
    nearOffset += parallaxSpeed*0.55*f;

    if(cat){
      if(running){
        if(cat.charging) cat.chargeTimer = Math.min(CHARGE_TIME, cat.chargeTimer+dt);
        const GRAV = 0.92*scale;
        if(!cat.grounded){
          cat.vy += GRAV*f; cat.y += cat.vy*f;
          const standY = groundY-cat.h;
          if(cat.y >= standY){ cat.y=standY; cat.vy=0; cat.grounded=true; }
          cat.curH = cat.h;
        } else {
          if(!cat.charging) cat.legPhase += 0.35*f*(speed/(BASE_SPEED_REF*hScale));
          let curH = cat.h;
          if(cat.ducking) curH = cat.h*0.55;
          else if(cat.charging) curH = cat.h*(1-0.18*(cat.chargeTimer/CHARGE_TIME));
          cat.curH = curH;
          cat.y = groundY - curH;
        }
      } else {
        cat.grounded=true; cat.ducking=false; cat.charging=false; cat.chargeTimer=0;
        cat.legPhase += 0.03*f;
        cat.curH = cat.h;
        cat.y = groundY - cat.h;
      }
      cat.tailPhase += 0.12*f;
      cat.blink = Math.max(0, cat.blink-dt);
      if(Math.random() < 0.006*f) cat.blink = 140;
    }

    if(!running) return;

    const tSec = elapsed/1000;
    speed = (BASE_SPEED_REF + Math.min(tSec*0.045,6.5)) * hScale;
    score += f*0.14*(speed/hScale);
    document.getElementById('scoreVal').textContent = Math.floor(score);

    spawnTimer -= dt;
    if(spawnTimer <= 0){ spawnObstacle(); spawnTimer = Math.max(700, 1500-tSec*8) + Math.random()*500; }
    coinTimer -= dt;
    if(coinTimer <= 0){ if(Math.random()<0.5) spawnGroundCoins(); coinTimer = 900+Math.random()*900; }

    for(const ob of obstacles) ob.x -= (speed + (ob.selfSpeed||0))*f;
    obstacles = obstacles.filter(ob => ob.x+ob.w > -20);
    for(const c of coinList) c.x -= speed*f;
    coinList = coinList.filter(c => c.x > -20 && !c.taken);

    const catX = cat.x();
    const curH = cat.curH;
    const hb = { x: catX+cat.w*0.14, y: cat.y+curH*0.1, w: cat.w*0.72, h: curH*0.8 };
    for(const ob of obstacles){
      const overlap = hb.x < ob.x+ob.w && hb.x+hb.w > ob.x && hb.y < ob.y+ob.h && hb.y+hb.h > ob.y;
      if(overlap){ endGame(); break; }
    }
    for(const c of coinList){
      const dx=(catX+cat.w*0.5)-c.x, dy=(cat.y+curH*0.5)-c.y;
      if(Math.sqrt(dx*dx+dy*dy) < c.r+cat.w*0.4){
        c.taken=true; runCoins+=1; totalCoins+=1; score+=10;
        document.getElementById('coinVal').textContent = totalCoins;
        savePersonal('totalCoins', String(totalCoins));
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
    for(const ob of obstacles) if(ob.type==='bridge') drawBridgeWater(ob, sky);
    if(state!=='playing') drawHomeHouse(sky);
    for(const c of coinList) drawCoin(c);
    for(const ob of obstacles) drawObstacle(ob);
    if(cat){ drawCat(); drawChargeBar(); }
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

  // =============== chiptune background music ===============
  let audioCtx=null, masterGain=null, musicStarted=false, musicInterval=null, nextStepTime=0, step=0;
  const MELODY = [523.25,659.25,784.0,659.25, 587.33,698.46,880.0,698.46, 523.25,659.25,784.0,987.77, 880.0,784.0,659.25,523.25];
  const BASSLINE = [130.81,130.81,164.81,164.81, 146.83,146.83,174.61,174.61, 130.81,130.81,196.0,196.0, 174.61,174.61,164.81,130.81];
  const STEP_DUR = 0.22;

  function initAudio(){
    if(audioCtx) return;
    audioCtx = new (window.AudioContext||window.webkitAudioContext)();
    masterGain = audioCtx.createGain();
    masterGain.gain.value = musicMuted ? 0 : 0.16;
    masterGain.connect(audioCtx.destination);
  }
  function playTone(freq, startTime, dur, type, vol){
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type; osc.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, startTime);
    g.gain.linearRampToValueAtTime(vol, startTime+0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, startTime+dur);
    osc.connect(g); g.connect(masterGain);
    osc.start(startTime); osc.stop(startTime+dur+0.02);
  }
  function scheduler(){
    if(!audioCtx) return;
    while(nextStepTime < audioCtx.currentTime + 0.2){
      playTone(MELODY[step%MELODY.length], nextStepTime, STEP_DUR*0.9, 'square', 0.05);
      if(step%2===0) playTone(BASSLINE[step%BASSLINE.length], nextStepTime, STEP_DUR*1.7, 'triangle', 0.06);
      nextStepTime += STEP_DUR;
      step++;
    }
  }
  function startMusic(){
    if(musicStarted) return;
    musicStarted = true;
    initAudio();
    if(audioCtx.state === 'suspended') audioCtx.resume();
    nextStepTime = audioCtx.currentTime + 0.1;
    musicInterval = setInterval(scheduler, 100);
  }
  document.getElementById('musicToggle').addEventListener('click', ()=>{
    musicMuted = !musicMuted;
    if(masterGain) masterGain.gain.value = musicMuted ? 0 : 0.16;
    document.getElementById('musicToggle').textContent = musicMuted ? '🔇' : '🔊';
    savePersonal('musicMuted', musicMuted ? '1' : '0');
    if(!musicStarted) startMusic();
  });

  window.addEventListener('resize', resize);
  resize();
  initStars();
  cat = makeCat();
  ensurePlayerIdentity();
  applyLanguage();
  requestAnimationFrame(loop);
})();