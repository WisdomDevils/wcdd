(function () {
  const src = window.HERO_SRC;
  ["hero", "layerCyan", "layerGold"].forEach((id) => {
    const el = document.getElementById(id);
    if (el && src) el.src = src;
  });

  const wrap = document.getElementById("heroWrap");
  const cyan = document.getElementById("layerCyan");
  const gold = document.getElementById("layerGold");
  const canvas = document.getElementById("dust");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 700px)").matches;

  let w = 0, h = 0, mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5;
  const particles = [];

  function resize() {
    w = canvas.width = window.innerWidth * devicePixelRatio;
    h = canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function spawn(n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.6 + 0.3,
        s: Math.random() * 0.35 + 0.08,
        a: Math.random() * 0.45 + 0.08,
        gold: Math.random() > 0.45,
      });
    }
  }

  function tick() {
    tx += (mx - tx) * 0.06;
    ty += (my - ty) * 0.06;

    const dx = (tx - 0.5) * 18;
    const dy = (ty - 0.5) * 12;
    const rx = (ty - 0.5) * -10;
    const ry = (tx - 0.5) * 14;

    if (wrap && !reduce) {
      wrap.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${dx * 0.4}px, ${dy * 0.4}px, 0)`;
    }
    if (cyan && !reduce && !mobile) {
      cyan.style.transform = `translate3d(${-dx * 0.35}px, ${-dy * 0.25}px, 0)`;
    }
    if (gold && !reduce && !mobile) {
      gold.style.transform = `translate3d(${dx * 0.35}px, ${dy * 0.25}px, 0)`;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.y -= p.s;
      p.x += Math.sin((p.y + p.r) * 0.01) * 0.15;
      if (p.y < -8) {
        p.y = window.innerHeight + 8;
        p.x = Math.random() * window.innerWidth;
      }
      ctx.beginPath();
      ctx.fillStyle = p.gold
        ? `rgba(232,195,106,${p.a})`
        : `rgba(110,231,242,${p.a})`;
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", (e) => {
    mx = e.clientX / window.innerWidth;
    my = e.clientY / window.innerHeight;
  });
  window.addEventListener("resize", resize);

  resize();
  spawn(reduce || mobile ? 40 : 120);
  if (!reduce) tick();
})();
