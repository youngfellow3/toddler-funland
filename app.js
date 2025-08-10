(() => {
  const field = document.getElementById('playfield');
  const toolbar = document.getElementById('toolbar');
  const headerEl = document.getElementById('appHeader');
  const prefersReduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

  function syncLayoutVars(){
    const th = toolbar.offsetHeight || 112;
    const hh = headerEl.offsetHeight || 56;
    document.documentElement.style.setProperty('--toolbarH', th + 'px');
    document.documentElement.style.setProperty('--headerH', hh + 'px');
    const avail = Math.max(140, window.innerHeight - hh - th);
    field.style.top = hh + 'px';
    field.style.height = avail + 'px';
  }

  syncLayoutVars();
  addEventListener('resize', syncLayoutVars);
  addEventListener('orientationchange', () => setTimeout(() => {
    syncLayoutVars();
    sprites.forEach(place);
  }, 300));

  const themes = ['', 'theme-sunset', 'theme-ocean', 'theme-meadow'];
  let themeIndex = 0;
  document.getElementById('btnTheme').addEventListener('click', () => {
    themeIndex = (themeIndex + 1) % themes.length;
    document.body.className = themes[themeIndex];
  });

  const audio = new (window.AudioContext || window.webkitAudioContext)();
  function beep(freq=500, dur=0.10, type='sine', gain=0.03){
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator();
    const g = audio.createGain();
    o.type = type; o.frequency.value = freq; g.gain.value = gain;
    o.connect(g).connect(audio.destination);
    o.start(); o.stop(audio.currentTime + dur);
  }

  const CATEGORIES = [
    { emojis:'🦄 🐥 🐢 🐼 🐸 🐙 🐶 🐱'.split(' ') },
    { emojis:'🚗 🚕 🚌 🚒 🚜 🚀 🛸 🚂'.split(' ') },
    { emojis:'🧸 🪀 🪅 🎈 🎠 🎪 🪁 🧩'.split(' ') },
    { emojis:'🍌 🍉 🍓 🍎 🍐 🍊 🍇 🥝'.split(' ') },
    { emojis:Array(8).fill('🫧') },
  ];
  let categoryIndex = 0;
  const currentSet = () => CATEGORIES[categoryIndex].emojis;
  const nextCategory = () => (categoryIndex = (categoryIndex + 1) % CATEGORIES.length);

  const SPRITE_COUNT = 8;
  const SPEED_MIN = 0.05, SPEED_MAX = 0.12;
  const sprites = [];
  let running = true;
  let lastT = 0;

  const rand = (a,b)=> Math.random()*(b-a)+a;
  const sample = arr => arr[Math.floor(Math.random()*arr.length)];
  const clamp = (n,a,b)=> Math.max(a, Math.min(b, n));

  function makeSprite(){
    const el = document.createElement('span');
    el.className = 'sprite pop';
    el.textContent = sample(currentSet());
    field.appendChild(el);
    const sizePx = Math.round(rand(72, 128));
    const s = {
      el,
      size: sizePx,
      x: rand(0, field.clientWidth - sizePx),
      y: rand(0, field.clientHeight - sizePx),
      vx: (Math.random()<.5?-1:1) * rand(SPEED_MIN, SPEED_MAX),
      vy: (Math.random()<.5?-1:1) * rand(SPEED_MIN, SPEED_MAX),
    };
    place(s);
    el.addEventListener('pointerdown', (e)=>{
      e.stopPropagation();
      el.classList.add('pop'); setTimeout(()=> el.classList.remove('pop'), 260);
      el.textContent = sample(currentSet());
      beep();
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

  function tick(t){
    if(!lastT) lastT = t;
    const dt = t - lastT;
    lastT = t;
    if(running){
      const maxXBase = field.clientWidth;
      const maxYBase = field.clientHeight;
      for(const s of sprites){
        s.x += s.vx * dt;
        s.y += s.vy * dt;
        const maxX = maxXBase - s.size;
        const maxY = maxYBase - s.size;
        if (s.x <= 0 || s.x >= maxX) s.vx *= -1;
        if (s.y <= 0 || s.y >= maxY) s.vy *= -1;
        place(s);
      }
    }
    requestAnimationFrame(tick);
  }

  document.getElementById('btnRain').addEventListener('click', ()=>{
    emojiRain(5000);
    fallAndSwapAfterDelay();
  });

  function emojiRain(duration=5000){
    const start = performance.now();
    function spawn(){
      if(performance.now() - start > duration) return;
      const d = document.createElement('span');
      d.className = 'raindrop';
      d.textContent = sample(currentSet());
      d.style.left = (Math.random()*100) + 'vw';
      d.style.animationDuration = (4000 + Math.random()*2000) + 'ms';
      document.body.appendChild(d);
      d.addEventListener('animationend', ()=> d.remove());
      setTimeout(spawn, 200);
    }
    spawn();
  }

  function fallAndSwapAfterDelay(){
    sprites.forEach(s=> s.el.classList.add('main-fall'));
    setTimeout(()=>sprites.forEach(s=> s.el.style.visibility='hidden'), 1000);
    setTimeout(()=>{
      nextCategory();
      sprites.forEach(s=>{
        s.size = Math.round(rand(72, 128));
        s.el.style.fontSize = s.size + 'px';
        s.x = rand(0, field.clientWidth - s.size);
        s.y = rand(0, field.clientHeight - s.size);
        s.el.textContent = sample(currentSet());
        place(s);
        s.el.style.visibility='visible';
        s.el.classList.add('pop');
        setTimeout(()=> s.el.classList.remove('pop'), 260);
      });
    }, 3000);
  }

  document.getElementById('btnSwitch').addEventListener('click', ()=>{
    nextCategory();
    sprites.forEach(s=>{
      s.el.textContent = sample(currentSet());
      s.el.classList.add('pop');
      setTimeout(()=> s.el.classList.remove('pop'), 260);
    });
  });

  const btnStartStop = document.getElementById('btnStartStop');
  btnStartStop.addEventListener('click', ()=>{
    running = !running;
    btnStartStop.textContent = running ? '⏸️ Stop' : '▶️ Start';
  });

  function initGame(){
    syncLayoutVars();
    for (let i = 0; i < SPRITE_COUNT; i++) makeSprite();
    requestAnimationFrame(tick);
  }

  window.addEventListener('load', initGame, { once: true });
})();
