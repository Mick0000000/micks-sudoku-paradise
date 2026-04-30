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

  function isEvil() {
    return document.documentElement.dataset.evil === 'true';
  }

  // ── Base gradient layer ───────────────────────────────────────────

  function drawBase(t) {
    const cx  = canvas.width  / 2;
    const cy  = canvas.height / 2;
    const dim = Math.max(canvas.width, canvas.height);
    const evil = isEvil();

    const rot = t * 0.0000105;
    const conic = ctx.createConicGradient(rot, cx, cy);

    if (evil) {
      conic.addColorStop(0.00, '#1a0505');
      conic.addColorStop(0.10, '#5c1010');
      conic.addColorStop(0.22, '#b03a08');
      conic.addColorStop(0.32, '#e06520');
      conic.addColorStop(0.44, '#8b1c1c');
      conic.addColorStop(0.54, '#2a0808');
      conic.addColorStop(0.63, '#7a1e05');
      conic.addColorStop(0.74, '#c84000');
      conic.addColorStop(0.85, '#7a1515');
      conic.addColorStop(0.94, '#3d0f0f');
      conic.addColorStop(1.00, '#1a0505');
    } else {
      conic.addColorStop(0.00, '#0b3320');
      conic.addColorStop(0.10, '#1a6640');
      conic.addColorStop(0.22, '#c8980e');
      conic.addColorStop(0.32, '#f0d050');
      conic.addColorStop(0.44, '#1db870');
      conic.addColorStop(0.54, '#2a7ec8');
      conic.addColorStop(0.63, '#0f4d2c');
      conic.addColorStop(0.74, '#78cc50');
      conic.addColorStop(0.85, '#d4a018');
      conic.addColorStop(0.94, '#1a5c3a');
      conic.addColorStop(1.00, '#0b3320');
    }
    ctx.fillStyle = conic;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const b = t * 0.000114;

    if (evil) {
      // Ember-orange blob
      const g1x = cx + Math.cos(b * 0.71)       * canvas.width  * 0.34;
      const g1y = cy + Math.sin(b * 0.53 + 1.1) * canvas.height * 0.30;
      const r1  = ctx.createRadialGradient(g1x, g1y, 0, g1x, g1y, dim * 0.58);
      r1.addColorStop(0, 'rgba(210, 80, 20, 0.62)');
      r1.addColorStop(1, 'rgba(210, 80, 20, 0)');
      ctx.fillStyle = r1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Deep crimson blob
      const g2x = cx + Math.cos(b * 0.43 + 2.0)  * canvas.width  * 0.40;
      const g2y = cy + Math.sin(b * 0.62 + 0.7)  * canvas.height * 0.32;
      const r2  = ctx.createRadialGradient(g2x, g2y, 0, g2x, g2y, dim * 0.52);
      r2.addColorStop(0, 'rgba(155, 25, 18, 0.60)');
      r2.addColorStop(1, 'rgba(155, 25, 18, 0)');
      ctx.fillStyle = r2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Charcoal shadow blob
      const g3x = cx + Math.cos(b * 0.31 + 3.9)  * canvas.width  * 0.30;
      const g3y = cy + Math.sin(b * 0.47 + 2.4)  * canvas.height * 0.36;
      const r3  = ctx.createRadialGradient(g3x, g3y, 0, g3x, g3y, dim * 0.48);
      r3.addColorStop(0, 'rgba(20, 6, 6, 0.68)');
      r3.addColorStop(1, 'rgba(20, 6, 6, 0)');
      ctx.fillStyle = r3;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Amber highlight blob
      const g4x = cx + Math.cos(b * 0.19 + 5.4)  * canvas.width  * 0.24;
      const g4y = cy + Math.sin(b * 0.27 + 3.7)  * canvas.height * 0.22;
      const r4  = ctx.createRadialGradient(g4x, g4y, 0, g4x, g4y, dim * 0.42);
      r4.addColorStop(0, 'rgba(195, 95, 15, 0.40)');
      r4.addColorStop(1, 'rgba(195, 95, 15, 0)');
      ctx.fillStyle = r4;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
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

      // Deep shadow blob
      const g4x = cx + Math.cos(b * 0.19 + 5.4)  * canvas.width  * 0.24;
      const g4y = cy + Math.sin(b * 0.27 + 3.7)  * canvas.height * 0.22;
      const r4  = ctx.createRadialGradient(g4x, g4y, 0, g4x, g4y, dim * 0.62);
      r4.addColorStop(0, 'rgba(8, 42, 24, 0.52)');
      r4.addColorStop(1, 'rgba(8, 42, 24, 0)');
      ctx.fillStyle = r4;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  }

  // ── Ripple layer ─────────────────────────────────────────────────

  const normalPalette = [
    [50,  220, 140], [25,  190, 165], [80,  225, 180],
    [115, 212,  62], [12,  148, 132], [60,  178, 165],
    [95,  202, 108], [168, 232,  95], [30,  168, 148],
    [240, 210,  70], [80,  160, 230],
  ];

  const evilPalette = [
    [220,  65,  20], [185,  28,  15], [245, 105,  30],
    [200,  50,  18], [160,  22,  22], [255, 120,  40],
    [140,  25,  25], [255,  80,  20], [120,  18,  18],
    [230, 140,  30], [100,  18,  18],
  ];

  const ripples = [];

  function makeRipple(seedRadius, seedOpacity) {
    const pal = isEvil() ? evilPalette : normalPalette;
    const [r, g, b] = pal[Math.floor(Math.random() * pal.length)];
    return {
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r, g, b,
      radius:      seedRadius  ?? 0,
      maxRadius:   Math.random() * 380 + 180,
      opacity:     seedOpacity ?? 0,
      peakOpacity: Math.random() * 0.26 + 0.10,
      speed:       Math.random() * 0.30 + 0.10,
      growing:     true,
    };
  }

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
