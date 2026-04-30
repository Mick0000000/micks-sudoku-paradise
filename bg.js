(function () {
  const canvas = document.getElementById('bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  // ── Base gradient layer ───────────────────────────────────────────
  // A slowly rotating conic gradient plus four floating radial blobs
  // that orbit the centre at different speeds, creating the oscillation.

  function drawBase(t) {
    const cx  = canvas.width  / 2;
    const cy  = canvas.height / 2;
    const dim = Math.max(canvas.width, canvas.height);

    // Conic sweeps one full rotation every ~10 minutes
    const rot = t * 0.0000105;
    const conic = ctx.createConicGradient(rot, cx, cy);
    conic.addColorStop(0.00, '#0b3320'); // deep forest
    conic.addColorStop(0.10, '#1a6640'); // rich green
    conic.addColorStop(0.22, '#c8980e'); // deep gold
    conic.addColorStop(0.32, '#f0d050'); // bright yellow-gold
    conic.addColorStop(0.44, '#1db870'); // vivid emerald
    conic.addColorStop(0.54, '#2a7ec8'); // blue highlight
    conic.addColorStop(0.63, '#0f4d2c'); // dark green
    conic.addColorStop(0.74, '#78cc50'); // lime green
    conic.addColorStop(0.85, '#d4a018'); // warm gold
    conic.addColorStop(0.94, '#1a5c3a'); // medium green
    conic.addColorStop(1.00, '#0b3320'); // back to deep forest
    ctx.fillStyle = conic;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Blob time — slower cycle (~55 s) so movement is gentle
    const b = t * 0.000114;

    // Gold blob
    const g1x = cx + Math.cos(b * 0.71)        * canvas.width  * 0.34;
    const g1y = cy + Math.sin(b * 0.53 + 1.1)  * canvas.height * 0.30;
    const r1  = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, dim * 0.58);
    r1.addColorStop(0, 'rgba(230, 190, 35, 0.58)');
    r1.addColorStop(1, 'rgba(230, 190, 35, 0)');
    ctx.fillStyle = r1;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Light green blob
    const g2x = cx + Math.cos(b * 0.43 + 2.0)  * canvas.width  * 0.40;
    const g2y = cy + Math.sin(b * 0.62 + 0.7)  * canvas.height * 0.32;
    const r2  = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, dim * 0.52);
    r2.addColorStop(0, 'rgba(90, 220, 145, 0.48)');
    r2.addColorStop(1, 'rgba(90, 220, 145, 0)');
    ctx.fillStyle = r2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Blue highlight blob
    const g3x = cx + Math.cos(b * 0.31 + 3.9)  * canvas.width  * 0.30;
    const g3y = cy + Math.sin(b * 0.47 + 2.4)  * canvas.height * 0.36;
    const r3  = ctx.createRadialGradient(g3x, g3y, 0, g3x, g3y, dim * 0.42);
    r3.addColorStop(0, 'rgba(55, 148, 215, 0.42)');
    r3.addColorStop(1, 'rgba(55, 148, 215, 0)');
    ctx.fillStyle = r3;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Deep shadow blob — keeps the darks from washing out
    const g4x = cx + Math.cos(b * 0.19 + 5.4)  * canvas.width  * 0.24;
    const g4y = cy + Math.sin(b * 0.27 + 3.7)  * canvas.height * 0.22;
    const r4  = ctx.createRadialGradient(g4x, g4y, 0, g4x, g4y, dim * 0.62);
    r4.addColorStop(0, 'rgba(8, 42, 24, 0.52)');
    r4.addColorStop(1, 'rgba(8, 42, 24, 0)');
    ctx.fillStyle = r4;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── Water-droplet ripple layer ────────────────────────────────────

  const palette = [
    [50,  220, 140], // bright emerald
    [25,  190, 165], // teal aqua
    [80,  225, 180], // aquamarine
    [115, 212,  62], // lime
    [12,  148, 132], // deep sea
    [60,  178, 165], // tropical teal
    [95,  202, 108], // vivid green
    [168, 232,  95], // sunlit lime
    [30,  168, 148], // sea glass
    [240, 210,  70], // gold shimmer
    [80,  160, 230], // water blue
  ];

  const ripples = [];

  function makeRipple(seedRadius, seedOpacity) {
    const [r, g, b] = palette[Math.floor(Math.random() * palette.length)];
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r, g, b,
      radius:      seedRadius  ?? 0,
      maxRadius:   Math.random() * 380 + 180, // 180 – 560 px
      opacity:     seedOpacity ?? 0,
      peakOpacity: Math.random() * 0.26 + 0.10,
      speed:       Math.random() * 0.30 + 0.10,
      growing:     true,
    };
  }

  // Pre-seed so the canvas isn't bare on first frame
  for (let i = 0; i < 9; i++) {
    ripples.push(makeRipple(Math.random() * 260, Math.random() * 0.16 + 0.05));
  }

  function scheduleNext() {
    setTimeout(() => {
      ripples.push(makeRipple());
      scheduleNext();
    }, Math.random() * 2800 + 800);
  }
  scheduleNext();

  // ── Render loop ───────────────────────────────────────────────────

  function fmt(v) { return Math.max(0, v).toFixed(3); }

  function tick() {
    const t = Date.now();
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    drawBase(t);

    for (let i = ripples.length - 1; i >= 0; i--) {
      const p = ripples[i];

      if (p.growing) {
        p.radius  += p.speed;
        p.opacity  = Math.min(p.peakOpacity, p.opacity + 0.0022);
        if (p.radius >= p.maxRadius) p.growing = false;
      } else {
        p.radius  += p.speed * 0.30;
        p.opacity -= 0.0009;
      }

      if (p.opacity <= 0) { ripples.splice(i, 1); continue; }

      // Ring-shaped radial gradient: hollow dark centre → bright crest → fade
      const grd = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius);
      grd.addColorStop(0,    `rgba(${p.r},${p.g},${p.b},${fmt(p.opacity * 0.18)})`);
      grd.addColorStop(0.28, `rgba(${p.r},${p.g},${p.b},${fmt(p.opacity)})`);
      grd.addColorStop(0.52, `rgba(${p.r},${p.g},${p.b},${fmt(p.opacity * 0.55)})`);
      grd.addColorStop(0.75, `rgba(${p.r},${p.g},${p.b},${fmt(p.opacity * 0.22)})`);
      grd.addColorStop(1,    `rgba(${p.r},${p.g},${p.b},0)`);

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.fillStyle = grd;
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  requestAnimationFrame(tick);
})();
