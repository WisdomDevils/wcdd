(function () {
  const frame = document.getElementById("frame");
  const canvas = document.getElementById("dust");
  const ctx = canvas.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const mobile = window.matchMedia("(max-width: 700px)").matches;

  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, zoomed = false;
  const particles = [];

  function resize() {
    canvas.width = window.innerWidth * devicePixelRatio;
    canvas.height = window.innerHeight * devicePixelRatio;
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }

  function spawn(n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * window.innerWidth,
        y: Math.random() * window.innerHeight,
        r: Math.random() * 1.4 + 0.25,
        s: Math.random() * 0.28 + 0.06,
        a: Math.random() * 0.35 + 0.06,
        warm: Math.random() > 0.55,
      });
    }
  }

  function tick() {
    tx += (mx - tx) * 0.07;
    ty += (my - ty) * 0.07;
    if (frame && !reduce && !zoomed) {
      const rx = (ty - 0.5) * -8;
      const ry = (tx - 0.5) * 12;
      const dx = (tx - 0.5) * 10;
      const dy = (ty - 0.5) * 8;
      frame.style.transform = `rotateX(${rx}deg) rotateY(${ry}deg) translate3d(${dx}px, ${dy}px, 0)`;
    }

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
    for (const p of particles) {
      p.y -= p.s;
      p.x += Math.sin(p.y * 0.012) * 0.12;
      if (p.y < -6) {
        p.y = window.innerHeight + 6;
        p.x = Math.random() * window.innerWidth;
      }
      ctx.beginPath();
      ctx.fillStyle = p.warm
        ? `rgba(255,160,110,${p.a})`
        : `rgba(140,190,255,${p.a})`;
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
  frame.addEventListener("click", () => {
    zoomed = !zoomed;
    frame.classList.toggle("zoomed", zoomed);
    if (zoomed) frame.style.transform = "none";
  });

  resize();
  spawn(reduce || mobile ? 36 : 110);
  if (!reduce) tick();
})();
