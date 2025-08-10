(() => {
  const field = document.getElementById('playfield');
  const toolbar = document.getElementById('toolbar');
  const headerEl = document.getElementById('appHeader');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  // --- Keep playfield exactly between header & toolbar
function syncLayoutVars(){
  const th = toolbar ? Math.max(80, toolbar.offsetHeight) : 112;
  const hh = headerEl ? Math.max(40, headerEl.offsetHeight) : 56;

  // expose (still used by CSS)
  document.documentElement.style.setProperty('--toolbarH', th + 'px');
  document.documentElement.style.setProperty('--headerH',  hh + 'px');

  // HARD-SET playfield height for mobile reliability
  const avail = Math.max(140, window.innerHeight - hh - th); // at least 140px tall
  field.style.position = 'fixed';
  field.style.top = hh + 'px';
  field.style.left = 0;
  field.style.right = 0;
  field.style.height = avail + 'px';     // <-- crucial on mobile
  field.style.bottom = 'auto';
}

  syncLayoutVars();
  addEventListener('resize', syncLayoutVars);
  if ('ResizeObserver' in window) {
    if (toolbar) new ResizeObserver(syncLayoutVars).observe(toolbar);
    if (headerEl) new ResizeObserver(syncLayoutVars).observe(headerEl);
  }

  /* Themes */
  const themes = ['', 'theme-sunset', 'theme-ocean', 'theme-meadow'];
  let themeIndex = 0;
  document.getElementById('btnTheme').addEventListener('click', () => {
    themeIndex = (themeIndex + 1) % themes.length;
    document.body.className = themes[themeIndex];
    winkScreen();
  });

  /* Soft beeps */
  const audio = new (window.AudioContext || window.webkitAudioContext)();
  function beep(freq=500, dur=0.10, type='sine', gain=0.03){
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(); const g = audio.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + dur);
  }
  function giggle(){ beep(720,.08,'triangle',.04); setTimeout(()=>beep(980,.08,'triangle',.04),90); }

  /* Categories (5th is Bubbles) */
  const CATEGORIES = [
    { name:'Animals',  emojis:'🦄 🐥 🐢 🐼 🐸 🐙 🐶 🐱 🐻 🐧 🐨 🐯 🐷 🐰 🐭'.split(' ') },
    { name:'Vehicles', emojis:'🚗 🚕 🚌 🚒 🚜 🚀 🛸 🚂 ✈️ 🚁 🚓 🛻 🚤 🛵 🚲'.split(' ') },
    { name:'Toys',     emojis:'🧸 🪀 🪅 🎈 🎠 🎪 🪁 🧩 🎲 🛝 🎯 🛴 🧃 🎮 🪆'.split(' ') },
    { name:'Fruits',   emojis:'🍌 🍉 🍓 🍎 🍐 🍊 🍇 🥝 🍍 🫐 🍑 🍒 🥥 🥭 🍈'.split(' ') },
    { name:'Bubbles',  emojis: Array(6).fill('🫧') }, // match sprite count
  ];
  let categoryIndex = 0;
  const currentSet = () => CATEGORIES[categoryIndex].emojis;
  const nextCategory = () => (categoryIndex = (categoryIndex + 1) % CATEGORIES.length);

  /* Calm speed & counts */
  const SPRITE_COUNT = 6;
  const SPEED_MIN = 0.05, SPEED_MAX = 0.12;
  const TAP_CONFETTI = 20;

  /* State */
  const sprites = [];
  let running = true;
  let lastT = 0;

  /* Helpers */
  const rand = (a,b)=> Math.random()*(b-a)+a;
  const sample = arr => arr[Math.floor(Math.random()*arr.length)];
  const clamp = (n,a,b)=> Math.max(a, Math.min(b, n));

  /* Create sprites */
  function makeSprite(){
    const el = document.createElement('span');
    el.className = 'sprite wobble pop';
    el.textContent = sample(currentSet());
    field.appendChild(el);

    const sizePx = Math.round(rand(72, 128));
    el.style.fontSize = sizePx + 'px';

    const s = {
      el,
      size: sizePx,
      x: rand(0, Math.max(0, field.clientWidth  - sizePx)),
      y: rand(0, Math.max(0, field.clientHeight - sizePx)),
      vx: (Math.random()<.5?-1:1) * rand(SPEED_MIN, SPEED_MAX),
      vy: (Math.random()<.5?-1:1) * rand(SPEED_MIN, SPEED_MAX),
    };
    place(s);

    el.addEventListener('pointerdown', (e)=>{
      e.stopPropagation();
      el.classList.add('pop'); setTimeout(()=> el.classList.remove('pop'), 260);
      el.textContent = sample(currentSet());
      s.size = clamp(s.size + rand(2,5), 60, 150);
      el.style.fontSize = s.size + 'px';
      giggle();
      burstConfetti(e.clientX, e.clientY, 8);
    });

    sprites.push(s);
  }

  function place(s){
    const maxX = Math.max(0, field.clientWidth  - s.size);
    const maxY = Math.max(0, field.clientHeight - s.size);
    s.x = clamp(s.x, 0, maxX);
    s.y = clamp(s.y, 0, maxY);
    s.el.style.left = s.x + 'px';
    s.el.style.top  = s.y + 'px';
  }

  /* Animation loop */
  function tick(t){
    if(!lastT) lastT = t;
    const dt = Math.min(32, t - lastT);
    lastT = t;

    if(running){
      const maxXBase = Math.max(0, field.clientWidth);
      const maxYBase = Math.max(0, field.clientHeight);
      for(const s of sprites){
        s.x += s.vx * dt;
        s.y += s.vy * dt;

        const maxX = Math.max(0, maxXBase - s.size);
        const maxY = Math.max(0, maxYBase - s.size);
        if (s.x <= 0 || s.x >= maxX) { s.vx *= -1; s.x = clamp(s.x, 0, maxX); }
        if (s.y <= 0 || s.y >= maxY) { s.vy *= -1; s.y = clamp(s.y, 0, maxY); }

        s.el.style.left = s.x + 'px';
        s.el.style.top  = s.y + 'px';
      }
    }
    requestAnimationFrame(tick);
  }

  /* Confetti */
  function burstConfetti(x, y, n=TAP_CONFETTI){
    for(let i=0;i<n;i++){
      const c = document.createElement('div');
      c.className = 'confetti';
      c.style.left = x + 'px'; c.style.top = y + 'px';
      c.style.background = `hsl(${Math.floor(Math.random()*360)} 90% 70%)`;
      document.body.appendChild(c);
      const ang = Math.random()*Math.PI*2;
      const speed = 0.8 + Math.random()*1.4;
      const vx = Math.cos(ang) * speed;
      const vy = Math.sin(ang) * speed - 2.0;
      let life = 0, x0 = x, y0 = y;
      const step = () => {
        life += 16;
        x0 += vx * 10;
        y0 += (vy + life*0.0008) * 10;
        c.style.transform = `translate(${x0 - x}px, ${y0 - y}px) rotate(${life*0.3}deg)`;
        c.style.opacity = String(Math.max(0, 1 - life/1300));
        if(life < 1300) requestAnimationFrame(step); else c.remove();
      };
      requestAnimationFrame(step);
    }
  }

  /* Background tap */
  field.addEventListener('pointerdown', (e)=>{
    if(e.target === field){
      burstConfetti(e.clientX, e.clientY, TAP_CONFETTI);
      beep(480,.07,'sine',.03);
      setTimeout(()=>beep(680,.07,'sine',.03),70);
    }
  });

  /* Rain: 5s overlay + main fall now; respawn 2s after fall */
  document.getElementById('btnRain').addEventListener('click', ()=>{
    emojiRain(5000);
    fallAndSwapAfterDelay();
  });

  function emojiRain(duration=5000){
    if(prefersReduced) return;
    const start = performance.now();
    let dropTimer;
    beep(560,.08,'sine',.03); setTimeout(()=>beep(720,.08,'sine',.03),120);

    const spawn = () => {
      const now = performance.now();
      if(now - start >= duration){ return; }
      const count = Math.floor(4 + Math.random()*4); // 4–7 per burst
      for(let i=0;i<count;i++){
        const d = document.createElement('span');
        d.className = 'raindrop';
        d.textContent = sample(currentSet());
        d.style.left = (Math.random()*100) + 'vw';
        const fallMs = 3500 + Math.random()*2500;  // 3.5–6.0s
        const delayMs = Math.random()*400;
        d.style.animationDuration = fallMs + 'ms';
        d.style.animationDelay = delayMs + 'ms';
        document.body.appendChild(d);
        d.addEventListener('animationend', ()=> d.remove());
      }
      dropTimer = setTimeout(spawn, 400);
    };
    spawn();
    setTimeout(()=> clearTimeout(dropTimer), duration + 1200);
  }

  function fallAndSwapAfterDelay(){
    sprites.forEach(s=> s.el.classList.add('main-fall'));

    setTimeout(()=>{
      sprites.forEach(s=>{
        s.el.style.visibility = 'hidden';
        s.el.classList.remove('main-fall');
      });
    }, 1000);

    setTimeout(()=>{
      nextCategory();
      sprites.forEach(s=>{
        s.size = Math.round(rand(72, 128));
        s.el.style.fontSize = s.size + 'px';
        s.x = rand(0, Math.max(0, field.clientWidth  - s.size));
        s.y = rand(0, Math.max(0, field.clientHeight - s.size));
        s.vx = (Math.random()<.5?-1:1) * rand(SPEED_MIN, SPEED_MAX);
        s.vy = (Math.random()<.5?-1:1) * rand(SPEED_MIN, SPEED_MAX);
        s.el.textContent = sample(currentSet());
        place(s);
        s.el.style.visibility = 'visible';
        s.el.classList.add('pop');
        setTimeout(()=> s.el.classList.remove('pop'), 260);
      });
      running = true; updateStartStopLabel();
    }, 1000 + 2000);
  }

  /* Switch category instantly */
  document.getElementById('btnSwitch').addEventListener('click', ()=>{
    nextCategory();
    sprites.forEach(s=>{
      s.el.textContent = sample(currentSet());
      s.el.classList.add('pop');
      setTimeout(()=> s.el.classList.remove('pop'), 260);
    });
    winkScreen();
  });

  /* Start/Stop */
  const btnStartStop = document.getElementById('btnStartStop');
  function updateStartStopLabel(){
    btnStartStop.textContent = running ? '⏸️ Stop' : '▶️ Start';
  }
  btnStartStop.addEventListener('click', ()=>{
    running = !running;
    updateStartStopLabel();
    if(running) beep(520,.12,'sine',.04); else beep(360,.12,'sine',.03);
  });

  function winkScreen(){
    if(prefersReduced) return;
    document.body.animate([{filter:'brightness(1)'},{filter:'brightness(1.2)'},{filter:'brightness(1)'}], {duration:420});
  }

// --- Init AFTER we measure layout and the playfield is non-zero
function waitForLayoutAndStart(tries = 30){
  syncLayoutVars();
  const rect = field.getBoundingClientRect();
  if (rect.width > 0 && rect.height > 100) {
    for (let i = 0; i < SPRITE_COUNT; i++) makeSprite();
    if (!prefersReduced) requestAnimationFrame(tick);
    requestAnimationFrame(() => { syncLayoutVars(); sprites.forEach(place); });
  } else if (tries > 0) {
    requestAnimationFrame(() => waitForLayoutAndStart(tries - 1));
  } else {
    // last resort fallback
    field.style.height = '60vh';
    for (let i = 0; i < SPRITE_COUNT; i++) makeSprite();
    if (!prefersReduced) requestAnimationFrame(tick);
  }
}


waitForLayoutAndStart();

/* Keep sprites in bounds on resize */
addEventListener('resize', () => sprites.forEach(place));

/* Fix layout after phone/tablet rotation */
addEventListener('orientationchange', () => setTimeout(syncLayoutVars, 300));

/* Prevent long-press menu on mobile */
document.addEventListener('contextmenu', e => e.preventDefault(), { passive:false });

})();
