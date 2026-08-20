(function(){
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');

  // =============== i18n ===============
  const STR = {
    pt: {
      title:'GATO CORREDOR',
      menuStart:'Começar o jogo', menuControls:'Comandos', menuShop:'Loja', menuLeaderboard:'Placar Global',
      controlsTitle:'COMANDOS',
      ctrlJumpLabel:'PULAR', ctrlJumpDesc:'Toque na tela, aperte ESPAÇO ou a seta ↑',
      ctrlDuckLabel:'ABAIXAR', ctrlDuckDesc:'Segure o botão, a seta ↓ ou a tecla S',
      backBtn:'Voltar',
      shopTitle:'LOJA', buyBtn:'Comprar', selectBtn:'Selecionar', selectedLabel:'Selecionado', ownedLabel:'Adquirido',
      changeProfile:'Trocar jogador',
      nicknameTitle:'QUEM É VOCÊ?',
      nicknameNote:'Seu progresso (moedas e peles) fica salvo com esse nome, em qualquer aparelho. Nomes iguais compartilham o mesmo progresso.',
      nicknamePlaceholder:'Seu nickname',
      nicknamePlay:'Jogar',
      leaderboardTitle:'PLACAR GLOBAL',
      loadingLb:'Carregando...',
      lbNote:'Visível para todos os jogadores.',
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
      title:'CAT RUNNER',
      menuStart:'Start game', menuControls:'Controls', menuShop:'Shop', menuLeaderboard:'Global Leaderboard',
      controlsTitle:'CONTROLS',
      ctrlJumpLabel:'JUMP', ctrlJumpDesc:'Tap the screen, press SPACE or the ↑ arrow',
      ctrlDuckLabel:'DUCK', ctrlDuckDesc:'Hold the button, ↓ arrow or the S key',
      backBtn:'Back',
      shopTitle:'SHOP', buyBtn:'Buy', selectBtn:'Select', selectedLabel:'Selected', ownedLabel:'Owned',
      changeProfile:'Switch player',
      nicknameTitle:'WHO ARE YOU?',
      nicknameNote:'Your progress (coins and skins) is saved under this name, on any device. Matching names share the same progress.',
      nicknamePlaceholder:'Your nickname',
      nicknamePlay:'Play',
      leaderboardTitle:'GLOBAL LEADERBOARD',
      loadingLb:'Loading...',
      lbNote:'Visible to every player.',
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
  const nicknameScreen = document.getElementById('nicknameScreen');
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
    document.getElementById('nicknameInput').placeholder = t('nicknamePlaceholder');
    if(!leaderboardPanel.classList.contains('hidden')) renderLeaderboard(lastLbData, lastLbError);
    if(!shopPanel.classList.contains('hidden')) renderShop();
  }
  document.getElementById('langPt').addEventListener('click', ()=>{ lang='pt'; applyLanguage(); savePersonal('lang','pt'); });
  document.getElementById('langEn').addEventListener('click', ()=>{ lang='en'; applyLanguage(); savePersonal('lang','en'); });

  // =============== storage helpers (persisted per device) ===============
  async function savePersonal(key, value){ try{ await window.storage.set(key, value, false); }catch(e){} }
  async function loadPersonal(key){ try{ const res = await window.storage.get(key, false); return res ? res.value : null; }catch(e){ return null; } }

  const ADJ = ['Veloz','Ágil','Sortudo','Corajoso','Sonhador','Travesso','Esperto','Faminto','Dourado','Sombrio','Elétrico','Silencioso'];
  const NOUN = ['Gato','Felino','Bigode','Miau','Patinha','Rajado','Sorriso','Ronron'];
  function generateRandomName(){
    const a = ADJ[Math.floor(Math.random()*ADJ.length)];
    const n = NOUN[Math.floor(Math.random()*NOUN.length)];
    return `${n}${a}${Math.floor(Math.random()*900+100)}`;
  }

  // skins / shop — default matches the cream-and-seal-point reference cat
  const SKINS = [
    { id:'tabby',  name_pt:'Siamês',          name_en:'Siamese',      price:0,   body:'#ecd9b8', dark:'#4a3226', belly:'#f7efdd' },
    { id:'gray',   name_pt:'Cinza Fumê',      name_en:'Smoke Gray',   price:80,  body:'#e6e7ea', dark:'#5a6068', belly:'#f2f3f5' },
    { id:'tuxedo', name_pt:'Preto e Branco',  name_en:'Black & White',price:150, body:'#f7f0e6', dark:'#1a1a1a', belly:'#ffffff' },
    { id:'black',  name_pt:'Totalmente Preto',name_en:'All Black',    price:300, body:'#2b2b2b', dark:'#000000', belly:'#4a4a4a' },
    { id:'golden', name_pt:'Dourado',         name_en:'Golden',       price:500, body:'#ffe1a8', dark:'#8a5a2c', belly:'#fff3d6' },
  ];

  let playerName=null, totalCoins=0, ownedSkins=['tabby'], selectedSkinId='tabby', musicMuted=false;

  // =============== profile "database" — one shared record per nickname ===============
  // stored under shared key `player:<nickname>` so the same nickname loads the same
  // progress on any device; the nickname itself is remembered on THIS device so it
  // doesn't need to be retyped every visit.
  async function loadProfile(nickname){
    playerName = nickname;
    try{
      const res = await window.storage.get(`player:${nickname}`, true);
      if(res && res.value){
        const data = JSON.parse(res.value);
        totalCoins = Number(data.totalCoins) || 0;
        ownedSkins = Array.isArray(data.ownedSkins) && data.ownedSkins.length ? data.ownedSkins : ['tabby'];
        if(!ownedSkins.includes('tabby')) ownedSkins.unshift('tabby');
        selectedSkinId = (data.selectedSkin && ownedSkins.includes(data.selectedSkin)) ? data.selectedSkin : 'tabby';
      } else {
        totalCoins = 0; ownedSkins = ['tabby']; selectedSkinId = 'tabby';
        await saveProfile();
      }
    }catch(e){
      totalCoins = 0; ownedSkins = ['tabby']; selectedSkinId = 'tabby';
    }
    document.getElementById('coinVal').textContent = totalCoins;
  }
  async function saveProfile(){
    if(!playerName) return;
    try{
      await window.storage.set(`player:${playerName}`, JSON.stringify({
        totalCoins, ownedSkins, selectedSkin: selectedSkinId, updatedAt: Date.now()
      }), true);
    }catch(e){}
  }

  document.getElementById('nicknameSubmit').addEventListener('click', confirmNickname);
  document.getElementById('nicknameInput').addEventListener('keydown', (e)=>{
    e.stopPropagation();
    if(e.code==='Enter') confirmNickname();
  });
  async function confirmNickname(){
    let name = document.getElementById('nicknameInput').value.trim().slice(0,18);
    if(!name) name = generateRandomName();
    await savePersonal('deviceNickname', name);
    await loadProfile(name);
    state='start'; showScreen('start');
  }
  document.getElementById('switchProfileBtn').addEventListener('click', async ()=>{
    await savePersonal('deviceNickname', '');
    document.getElementById('nicknameInput').value = generateRandomName();
    state='nickname'; showScreen('nickname');
  });

  async function boot(){
    const savedLang = await loadPersonal('lang');
    if(savedLang==='pt' || savedLang==='en') lang = savedLang;
    const savedMuted = await loadPersonal('musicMuted');
    musicMuted = savedMuted === '1';
    document.getElementById('musicToggle').textContent = musicMuted ? '🔇' : '🔊';
    if(masterGain) masterGain.gain.value = musicMuted ? 0 : 0.16;
    applyLanguage();

    const savedNick = await loadPersonal('deviceNickname');
    if(savedNick){
      await loadProfile(savedNick);
      state='start'; showScreen('start');
    } else {
      document.getElementById('nicknameInput').value = generateRandomName();
      state='nickname'; showScreen('nickname');
    }
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
          saveProfile();
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
            saveProfile();
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
    // r=0 is the top row (narrow tip); the last row (bottom) is full width — a peak pointing up
    const rows = Math.max(1, Math.round(h/unit));
    for(let r=0;r<rows;r++){
      const rowW = Math.max(unit, w*((r+1)/rows));
      const rx = x + (w-rowW)/2;
      pixelRect(rx, y+r*unit, rowW, unit, unit, color);
    }
  }
  function pixelSquareOutlined(cx,cy,size,unit,fill,outline){
    pixelRect(cx-size/2-unit*0.4, cy-size/2-unit*0.4, size+unit*0.8, size+unit*0.8, unit, outline);
    pixelRect(cx-size/2, cy-size/2, size, size, unit, fill);
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
  const JUMP_VEL = -15;
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
      y: groundY - 42*scale,
      vy:0, w:62*scale, h:42*scale, curH:42*scale,
      ducking:false, grounded:true, jumpsUsed:0,
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
  function doJump(){
    if(state!=='playing') return;
    if(cat.ducking) return;
    if(cat.grounded){
      cat.vy = JUMP_VEL*scale;
      cat.grounded = false;
      cat.jumpsUsed = 1;
    } else if(cat.jumpsUsed < 2){
      cat.vy = JUMP_VEL*scale*0.92; // slightly lighter second jump
      cat.jumpsUsed = 2;
    }
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
    const down=(e)=>{ e.preventDefault(); e.stopPropagation(); el.classList.add('active'); onDown(); };
    const up=(e)=>{ e.preventDefault(); e.stopPropagation(); el.classList.remove('active'); onUp(); };
    el.addEventListener('pointerdown',down);
    el.addEventListener('pointerup',up);
    el.addEventListener('pointerleave',up);
    el.addEventListener('pointercancel',up);
  }
  bindHold(document.getElementById('btnJump'), doJump, ()=>{});
  bindHold(document.getElementById('btnDuck'), ()=>setDuck(true), ()=>setDuck(false));
  canvas.addEventListener('pointerdown', ()=>{ if(state==='playing') doJump(); });

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
    nicknameScreen.classList.toggle('hidden', which!=='nickname');
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
  const PROP_DIMS = {
    bench:    { h:20, w:44 },
    lamppost: { h:34, w:10 },
    trashcan: { h:18, w:16 },
    hydrant:  { h:15, w:13 },
    mailbox:  { h:22, w:14 },
  };
  const PROP_KINDS = Object.keys(PROP_DIMS);

  function spawnObstacle(){
    const roll = Math.random();
    let type;
    if(roll < 0.5) type='prop'; else if(roll < 0.8) type='walker'; else type='bridge';
    let ob;
    if(type==='prop'){
      const kind = PROP_KINDS[Math.floor(Math.random()*PROP_KINDS.length)];
      const d = PROP_DIMS[kind];
      const h=d.h*scale, w=d.w*scale;
      ob = { type:'prop', kind, x:W+20, y:groundY-h, w, h };
    } else if(type==='walker'){
      const isDog = Math.random() < 0.5;
      const h = isDog ? 22*scale : 34*scale;
      const w = isDog ? 28*scale : 18*scale;
      ob = { type, kind:isDog?'dog':'person', x:W+20, y:groundY-h, w, h, selfSpeed:(4+Math.random()*8)*hScale, legPhase:Math.random()*Math.PI*2 };
    } else {
      const gap=38*scale, beamH=18*scale, w=100*scale;
      ob = { type, x:W+20, y:groundY-gap-beamH, w, h:beamH, gap };
    }
    obstacles.push(ob);
    if(Math.random() < 0.8){
      if(type==='bridge'){
        for(let i=0;i<3;i++) coinList.push({ x:ob.x+16*scale+i*24*scale, y:groundY-ob.gap*0.55-6*scale, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
      } else {
        // well above the obstacle, in the comfortable mid-arc of the jump —
        // right at the obstacle top the cat is moving too fast vertically to grab them reliably
        const n=3;
        const coinY = Math.min(ob.y-12*scale, groundY-74*scale);
        for(let i=0;i<n;i++){
          const fx = ob.x + (i+0.5)*(ob.w/n);
          coinList.push({ x:fx, y:coinY, r:8*scale, taken:false, bob:Math.random()*Math.PI*2 });
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

  function drawObstacle(ob, sky){
    if(ob.type==='prop'){
      const b = ob.x, base = ob.y+ob.h, w=ob.w, h=ob.h;
      if(ob.kind==='bench'){
        pixelRect(b, ob.y, w, h*0.28, PXU, '#8a5a2c');
        pixelRect(b, ob.y+h*0.28, w*0.1, h*0.72, PXU, '#5a3a1c');
        pixelRect(b+w*0.9, ob.y+h*0.28, w*0.1, h*0.72, PXU, '#5a3a1c');
        pixelRect(b+w*0.06, ob.y-h*0.5, w*0.06, h*0.5, PXU, '#8a5a2c');
        pixelRect(b+w*0.88, ob.y-h*0.5, w*0.06, h*0.5, PXU, '#8a5a2c');
      } else if(ob.kind==='lamppost'){
        pixelRect(b+w*0.4, ob.y, w*0.2, h, PXU, '#3a3f4b');
        pixelRect(b, ob.y-h*0.5, w, h*0.16, PXU, '#3a3f4b');
        const lit = sky.stars > 0.3;
        if(lit){ ctx.save(); ctx.shadowColor='rgba(255,220,140,0.8)'; ctx.shadowBlur=16*scale; pixelBlob(b+w*0.5, ob.y-h*0.42, w*0.34, w*0.34, PXU, '#ffe38a'); ctx.restore(); }
        else pixelBlob(b+w*0.5, ob.y-h*0.42, w*0.34, w*0.34, PXU, '#e8dfc8');
      } else if(ob.kind==='trashcan'){
        pixelRect(b, ob.y+h*0.18, w, h*0.82, PXU, '#5f7a5f');
        pixelRect(b-w*0.08, ob.y, w*1.16, h*0.2, PXU, '#42563f');
      } else if(ob.kind==='hydrant'){
        pixelBlobOutlined(b+w*0.5, ob.y+h*0.4, w*0.42, h*0.4, PXU, '#c0392b', '#6b1f16');
        pixelRect(b-w*0.15, ob.y+h*0.28, w*0.2, h*0.18, PXU, '#8a2318');
        pixelRect(b+w*0.95, ob.y+h*0.28, w*0.2, h*0.18, PXU, '#8a2318');
        pixelRect(b+w*0.32, ob.y-h*0.12, w*0.36, h*0.2, PXU, '#c0392b');
      } else { // mailbox
        pixelRect(b+w*0.4, ob.y+h*0.4, w*0.2, h*0.6, PXU, '#3a3f4b');
        pixelBlobOutlined(b+w*0.5, ob.y+h*0.28, w*0.5, h*0.3, PXU, '#3d6a9e', '#1e3350');
        pixelRect(b+w*0.62, ob.y+h*0.1, w*0.2, h*0.12, PXU, '#c0392b');
      }
    } else if(ob.type==='walker'){
      const legPhase = ob.legPhase + elapsed*0.006;
      if(ob.kind==='dog'){
        const body='#8a5a3c', dark='#5a3a22';
        pixelRect(ob.x, ob.y+ob.h*0.3, ob.w, ob.h*0.5, PXU, body);
        pixelBlobOutlined(ob.x+ob.w*0.85, ob.y+ob.h*0.25, ob.h*0.22, ob.h*0.22, PXU, body, dark);
        const swing = Math.sin(legPhase)*2*scale;
        pixelRect(ob.x+ob.w*0.15+swing, ob.y+ob.h*0.75, ob.w*0.12, ob.h*0.25, PXU, dark);
        pixelRect(ob.x+ob.w*0.65-swing, ob.y+ob.h*0.75, ob.w*0.12, ob.h*0.25, PXU, dark);
      } else {
        const cx = ob.x+ob.w/2;
        const swing = Math.sin(legPhase)*3*scale;
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

  // =============== cat sprite — slim, siamese-style, real duck/jump poses ===============
  function drawCat(){
    const x = cat.x(), y = cat.y, w = cat.w, h = cat.curH;
    const unit = Math.max(2, Math.round(h/10));
    ctx.save();

    let rot = 0;
    if(!cat.grounded) rot = Math.max(-0.26, Math.min(0.26, -cat.vy*0.016));
    ctx.translate(x + w*0.5, y + h*0.5);
    ctx.rotate(rot);
    ctx.translate(-w*0.5, -h*0.5);

    const sk = SKINS.find(s=>s.id===selectedSkinId) || SKINS[0];
    const body = sk.body, point = sk.dark, chest = sk.belly, outline = '#241d1a';
    const eyeColor = '#5ec9e6';

    const isDuck = cat.ducking;
    const airborne = !cat.grounded;

    const bodyRy = isDuck ? h*0.19 : h*0.27;
    const bodyRx = isDuck ? w*0.36 : w*0.27;
    const bodyCy = isDuck ? h*0.66 : h*0.44;
    const bodyCx = w*0.46;
    const headY = isDuck ? h*0.52 : h*0.22;
    const headR = isDuck ? h*0.24 : h*0.30;
    const headX = w*0.86;

    // tail — cream near the body, dark seal point at the tip
    const tailBaseX = bodyCx - bodyRx*0.75, tailBaseY = bodyCy - bodyRy*0.15;
    const tailSegs = isDuck
      ? [ {dx:-unit*1.1, dy:-unit*0.1}, {dx:-unit*2.0, dy:-unit*0.5} ]
      : [ {dx:-unit*1.3, dy:unit*0.5}, {dx:-unit*2.6, dy:unit*0.1}, {dx:-unit*3.0, dy:-unit*1.4}, {dx:-unit*2.0, dy:-unit*2.9} ];
    tailSegs.forEach((seg,i)=>{
      const isPoint = i >= tailSegs.length-2;
      const col = isPoint ? point : body;
      const wob = cat.grounded && !isDuck ? Math.sin(cat.tailPhase)*unit*0.35 : 0;
      pixelSquareOutlined(tailBaseX+seg.dx, tailBaseY+seg.dy+wob, unit*1.7, unit, col, outline);
    });

    // legs
    if(airborne){
      pixelRect(bodyCx+bodyRx*0.05, bodyCy+bodyRy*0.55, unit*1.2, h*0.2, unit, point);
      pixelSquareOutlined(bodyCx+bodyRx*0.05+unit*0.6, bodyCy+bodyRy*0.55+h*0.2, unit*1.3, unit, point, outline);
      pixelRect(headX-headR*0.3, headY+headR*0.75, unit*1.2, h*0.36, unit, point);
      pixelSquareOutlined(headX-headR*0.3+unit*0.6, headY+headR*0.75+h*0.36, unit*1.3, unit, point, outline);
    } else {
      const legSwing = Math.sin(cat.legPhase);
      const legLen = isDuck ? h*0.1 : h*0.44;
      const legW = unit*1.1;
      const backLegX = bodyCx-bodyRx*0.5 - legSwing*unit*1.2;
      const frontLegX = headX-headR*0.55 + legSwing*unit*1.2;
      pixelRect(backLegX, bodyCy+bodyRy*0.55, legW, legLen, unit, point);
      pixelSquareOutlined(backLegX+legW*0.5, bodyCy+bodyRy*0.55+legLen, unit*1.3, unit, point, outline);
      pixelRect(frontLegX, bodyCy+bodyRy*0.45, legW, legLen*1.05, unit, point);
      pixelSquareOutlined(frontLegX+legW*0.5, bodyCy+bodyRy*0.45+legLen*1.05, unit*1.3, unit, point, outline);
    }

    // body
    pixelBlobOutlined(bodyCx, bodyCy, bodyRx, bodyRy, unit, body, outline);
    pixelBlob(bodyCx+bodyRx*0.1, bodyCy+bodyRy*0.3, bodyRx*0.42, bodyRy*0.42, unit, chest);

    // head
    pixelBlobOutlined(headX, headY, headR, headR*0.9, unit, body, outline);
    // seal-point face mask
    pixelBlob(headX+headR*0.32, headY+headR*0.25, headR*0.55, headR*0.4, unit, point);

    // ears — solid seal point
    pixelTriangleStack(headX-headR*0.85, headY-headR*1.85, headR*0.5, headR*1.0, unit, outline);
    pixelTriangleStack(headX-headR*0.72, headY-headR*1.6, headR*0.3, headR*0.75, unit, point);
    pixelTriangleStack(headX+headR*0.35, headY-headR*1.85, headR*0.5, headR*1.0, unit, outline);
    pixelTriangleStack(headX+headR*0.48, headY-headR*1.6, headR*0.3, headR*0.75, unit, point);

    // eyes — blue
    if(cat.blink <= 0){
      pixelRect(headX+headR*0.12, headY-unit*0.55, unit*1.1, unit*1.1, unit, eyeColor);
      pixelRect(headX+headR*0.32, headY-unit*0.35, unit*0.5, unit*0.5, unit, '#1a1a1a');
    } else {
      pixelRect(headX+headR*0.08, headY-unit*0.1, unit*1.3, Math.max(1,unit*0.35), unit, outline);
    }
    // nose
    pixelRect(headX+headR*0.72, headY+unit*0.35, unit*0.8, unit*0.8, unit, '#c98a8a');
    // whiskers (light, contrasts against the dark mask)
    pixelRect(headX+headR*0.55, headY+unit*0.05, unit*1.8, Math.max(1,unit*0.3), unit, 'rgba(255,255,255,0.65)');
    pixelRect(headX+headR*0.55, headY+unit*0.85, unit*1.8, Math.max(1,unit*0.3), unit, 'rgba(255,255,255,0.65)');

    ctx.restore();
  }

  // =============== decorative start-screen house (classic cottage) ===============
  function drawHomeHouse(sky){
    const baseX = W*0.16, baseY = groundY;
    const s = Math.min(W,H)*0.36;
    const unit = Math.max(2, Math.round(s/26));
    ctx.save(); ctx.translate(baseX, baseY);

    // chimney geometry — anchored to the actual roof slope (same formula pixelTriangleStack
    // uses internally) so it sits connected to the roof instead of floating above it
    const roofX=-s*0.52, roofY=-s*0.86, roofW=s*1.04, roofH=s*0.5;
    const roofRows = Math.max(1, Math.round(roofH/unit));
    const chimneyRow = Math.round(roofRows*0.46);
    const rowW = Math.max(unit, roofW*((chimneyRow+1)/roofRows));
    const roofRightXAtRow = roofX + (roofW-rowW)/2 + rowW;
    const roofYAtRow = roofY + chimneyRow*unit;
    const chimneyW = unit*4;
    const chimneyX = roofRightXAtRow - chimneyW*0.75;
    const chimneyTopY = roofYAtRow - s*0.34;
    const chimneyBottomY = roofYAtRow + unit*2; // sinks slightly into the roof, so the join reads as solid

    // smoke — rises from the chimney's actual top
    for(let i=0;i<3;i++){
      const phase = (elapsed*0.001 + i*0.9) % 3;
      const sy = chimneyTopY - phase*20*scale;
      const alpha = Math.max(0, 1-phase/3);
      ctx.globalAlpha = alpha*0.5;
      pixelBlob(chimneyX+chimneyW*0.5 + Math.sin(phase*3)*4*scale, sy, 7*scale+phase*3*scale, 7*scale+phase*3*scale, unit, '#d9d9d9');
    }
    ctx.globalAlpha = 1;

    // main roof
    pixelTriangleStack(roofX, roofY, roofW, roofH, unit, '#2b3550');
    pixelRect(roofX, -s*0.38, roofW, unit*1.2, unit, '#e8dfce');

    // chimney — drawn after the roof so it visibly sits on top of / through it
    pixelRect(chimneyX, chimneyTopY, chimneyW, chimneyBottomY-chimneyTopY, unit, '#4a3226');
    pixelRect(chimneyX-unit*0.3, chimneyTopY, chimneyW+unit*0.6, unit*1.3, unit, '#5a4030');

    // small front gable over the door
    pixelTriangleStack(-s*0.18, -s*0.75, s*0.36, s*0.24, unit, '#e8dfce');
    pixelBlobOutlined(0, -s*0.61, unit*1.3, unit*1.3, unit, '#c9dae6', '#2b3550');

    // walls
    pixelRect(-s*0.46, -s*0.36, s*0.92, s*0.56, unit, '#dba86a');
    pixelRect(-s*0.46, -s*0.02, s*0.92, s*0.12, unit, '#b07a44');

    // door + sidelights
    pixelRect(-s*0.32, -s*0.02, s*0.14, s*0.28, unit, '#7a4a24');
    pixelRect(-s*0.32+unit*0.6, -s*0.02+unit*0.6, s*0.14-unit*1.2, s*0.28-unit*1.2, unit, '#5a3418');
    pixelRect(-s*0.38, -s*0.02, unit*1.4, s*0.28, unit, '#cfe0ea');
    pixelRect(-s*0.16, -s*0.02, unit*1.4, s*0.28, unit, '#cfe0ea');

    // big window with mullions
    pixelRect(s*0.08, -s*0.28, s*0.32, s*0.2, unit, '#cfe0ea');
    pixelRect(s*0.08+s*0.16-unit*0.4, -s*0.28, unit*0.8, s*0.2, unit, '#f5f0e6');
    pixelRect(s*0.08, -s*0.28+s*0.1-unit*0.4, s*0.32, unit*0.8, unit, '#f5f0e6');
    pixelRect(s*0.08-unit*0.6, -s*0.28-unit*0.6, s*0.32+unit*1.2, unit*0.8, unit, '#f5f0e6');
    pixelRect(s*0.08-unit*0.6, -s*0.28+s*0.2-unit*0.2, s*0.32+unit*1.2, unit*0.8, unit, '#f5f0e6');

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
        const GRAV = 0.92*scale;
        if(!cat.grounded){
          cat.vy += GRAV*f; cat.y += cat.vy*f;
          const standY = groundY-cat.h;
          if(cat.y >= standY){ cat.y=standY; cat.vy=0; cat.grounded=true; cat.jumpsUsed=0; }
          cat.curH = cat.h;
        } else {
          cat.legPhase += 0.35*f*(speed/(BASE_SPEED_REF*hScale));
          const curH = cat.ducking ? cat.h*0.55 : cat.h;
          cat.curH = curH;
          cat.y = groundY - curH;
        }
      } else {
        cat.grounded=true; cat.ducking=false;
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
    // enforce a minimum safe gap between consecutive obstacles at all times — this is what
    // actually guarantees no two obstacles (even a fast walker catching up to a bench) ever
    // end up too close for the cat to clear, regardless of spawn timing quirks
    obstacles.sort((a,b)=>a.x-b.x);
    const MIN_GAP_PX = Math.max(160*scale, speed*40);
    for(let i=1;i<obstacles.length;i++){
      const prev = obstacles[i-1], cur = obstacles[i];
      const minX = prev.x+prev.w+MIN_GAP_PX;
      if(cur.x < minX) cur.x = minX;
    }
    obstacles = obstacles.filter(ob => ob.x+ob.w > -20);
    for(const c of coinList) c.x -= speed*f;
    coinList = coinList.filter(c => c.x > -20 && !c.taken);

    const catX = cat.x();
    const curH = cat.curH;
    const hb = { x: catX+cat.w*0.16, y: cat.y+curH*0.12, w: cat.w*0.68, h: curH*0.76 };
    for(const ob of obstacles){
      const overlap = hb.x < ob.x+ob.w && hb.x+hb.w > ob.x && hb.y < ob.y+ob.h && hb.y+hb.h > ob.y;
      if(overlap){ endGame(); break; }
    }
    for(const c of coinList){
      const dx=(catX+cat.w*0.5)-c.x, dy=(cat.y+curH*0.5)-c.y;
      if(Math.sqrt(dx*dx+dy*dy) < c.r+cat.w*0.4){
        c.taken=true; runCoins+=1; totalCoins+=1; score+=10;
        document.getElementById('coinVal').textContent = totalCoins;
        saveProfile(); // persisted to this nickname's shared record
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
    for(const ob of obstacles) drawObstacle(ob, sky);
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
  boot();
  requestAnimationFrame(loop);
})();