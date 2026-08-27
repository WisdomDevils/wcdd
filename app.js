(function () {
  const frame = document.getElementById("frame");
  const shine = document.getElementById("shine");
  const dust = document.getElementById("dust");
  const trail = document.getElementById("trail");
  const cursor = document.getElementById("cursor");
  const dctx = dust.getContext("2d");
  const tctx = trail.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) document.body.classList.add("touch");

  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, zoomed = false;
  let cx = innerWidth / 2, cy = innerHeight / 2;
  let vx = 0, vy = 0;
  const particles = [];
  const sparks = [];

  function sizeCanvas(c, ctx) {
    c.width = innerWidth * devicePixelRatio;
    c.height = innerHeight * devicePixelRatio;
    c.style.width = innerWidth + "px";
    c.style.height = innerHeight + "px";
    ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0);
  }
  function resize() {
    sizeCanvas(dust, dctx);
    sizeCanvas(trail, tctx);
  }

  function spawn(n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: Math.random() * 1.4 + 0.25,
        s: Math.random() * 0.28 + 0.06,
        a: Math.random() * 0.35 + 0.06,
        warm: Math.random() > 0.55,
      });
    }
  }

  function spark(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 3.2 + 0.6;
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: 1,
        warm: Math.random() > 0.4,
      });
    }
  }

  function tick() {
    tx += (mx - tx) * 0.08;
    ty += (my - ty) * 0.08;

    document.documentElement.style.setProperty("--spot-x", tx * 100 + "%");
    document.documentElement.style.setProperty("--spot-y", ty * 100 + "%");

    if (cursor && !coarse && !reduce) {
      cursor.style.left = cx + "px";
      cursor.style.top = cy + "px";
    }

    if (shine && !reduce) {
      const sx = (tx - 0.5) * 70;
      shine.style.transform = "translateX(" + sx + "%)";
    }

    if (frame && !reduce && !zoomed) {
      const rx = (ty - 0.5) * -10;
      const ry = (tx - 0.5) * 14;
      const dx = (tx - 0.5) * 12;
      const dy = (ty - 0.5) * 9;
      const skew = vx * 0.04;
      frame.style.transform =
        "rotateX(" + rx + "deg) rotateY(" + ry + "deg) translate3d(" +
        dx + "px," + dy + "px,0) skewX(" + skew + "deg)";
    }

    dctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      const pullx = (cx - p.x) * 0.00035;
      const pully = (cy - p.y) * 0.00035;
      p.x += pullx;
      p.y -= p.s;
      p.x += Math.sin(p.y * 0.012) * 0.12;
      if (p.y < -6) {
        p.y = innerHeight + 6;
        p.x = Math.random() * innerWidth;
      }
      dctx.beginPath();
      dctx.fillStyle = p.warm
        ? "rgba(255,160,110," + p.a + ")"
        : "rgba(140,190,255," + p.a + ")";
      dctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      dctx.fill();
    }

    tctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!reduce && !coarse) {
      tctx.beginPath();
      tctx.strokeStyle = "rgba(255,220,180,0.22)";
      tctx.lineWidth = 1.2;
      tctx.moveTo(cx - vx * 6, cy - vy * 6);
      tctx.lineTo(cx, cy);
      tctx.stroke();
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx;
      s.y += s.vy;
      s.vy += 0.04;
      s.life -= 0.02;
      if (s.life <= 0) {
        sparks.splice(i, 1);
        continue;
      }
      tctx.beginPath();
      tctx.fillStyle = s.warm
        ? "rgba(255,190,120," + s.life + ")"
        : "rgba(160,200,255," + s.life + ")";
      tctx.arc(s.x, s.y, 1.6 * s.life, 0, Math.PI * 2);
      tctx.fill();
    }

    vx *= 0.86;
    vy *= 0.86;
    requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", (e) => {
    vx += (e.clientX - cx) * 0.08;
    vy += (e.clientY - cy) * 0.08;
    cx = e.clientX;
    cy = e.clientY;
    mx = e.clientX / innerWidth;
    my = e.clientY / innerHeight;
    if (frame) {
      const r = frame.getBoundingClientRect();
      const over =
        e.clientX >= r.left &&
        e.clientX <= r.right &&
        e.clientY >= r.top &&
        e.clientY <= r.bottom;
      frame.classList.toggle("hot", over);
    }
  });

  window.addEventListener("pointerdown", (e) => {
    if (cursor) cursor.classList.add("down");
    spark(e.clientX, e.clientY, reduce ? 6 : 22);
    const ring = document.createElement("div");
    ring.className = "ripple";
    ring.style.left = e.clientX + "px";
    ring.style.top = e.clientY + "px";
    document.body.appendChild(ring);
    setTimeout(function () { ring.remove(); }, 720);
  });
  window.addEventListener("pointerup", () => {
    if (cursor) cursor.classList.remove("down");
  });
  window.addEventListener("resize", resize);

  frame.addEventListener("click", () => {
    zoomed = !zoomed;
    frame.classList.toggle("zoomed", zoomed);
    frame.classList.add("punch");
    setTimeout(function () { frame.classList.remove("punch"); }, 450);
    if (zoomed) frame.style.transform = "none";
  });

  resize();
  spawn(reduce || coarse ? 36 : 130);
  if (!reduce) tick();
})();
