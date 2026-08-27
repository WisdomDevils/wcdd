(function () {
  const frame = document.getElementById("frame");
  const shine = document.getElementById("shine");
  const dust = document.getElementById("dust");
  const trail = document.getElementById("trail");
  const bolts = document.getElementById("bolts");
  const cursor = document.getElementById("cursor");
  const poster = document.getElementById("poster");
  const flash = document.getElementById("flash");
  const dctx = dust.getContext("2d");
  const tctx = trail.getContext("2d");
  const bctx = bolts.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) document.body.classList.add("touch");

  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, zoomed = false;
  let cx = innerWidth / 2, cy = innerHeight / 2;
  let vx = 0, vy = 0, glitchT = 0, shattering = false;
  const particles = [];
  const sparks = [];
  const embers = [];

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
    sizeCanvas(bolts, bctx);
  }

  function spawn(n) {
    for (let i = 0; i < n; i++) {
      particles.push({
        x: Math.random() * innerWidth,
        y: Math.random() * innerHeight,
        r: Math.random() * 1.8 + 0.2,
        s: Math.random() * 0.45 + 0.08,
        a: Math.random() * 0.45 + 0.08,
        warm: Math.random() > 0.5,
        orbit: Math.random() > 0.82,
        o: Math.random() * Math.PI * 2,
        od: Math.random() * 40 + 18,
      });
    }
  }

  function spark(x, y, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const sp = Math.random() * 6 + 1;
      sparks.push({
        x, y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp - Math.random() * 2,
        life: 1,
        warm: Math.random() > 0.35,
      });
    }
  }

  function bolt(x1, y1, x2, y2) {
    bctx.beginPath();
    bctx.moveTo(x1, y1);
    const steps = 8;
    for (let i = 1; i <= steps; i++) {
      const t = i / steps;
      const nx = x1 + (x2 - x1) * t + (Math.random() - 0.5) * 18;
      const ny = y1 + (y2 - y1) * t + (Math.random() - 0.5) * 18;
      bctx.lineTo(nx, ny);
    }
    bctx.strokeStyle = "rgba(180,220,255,0.55)";
    bctx.lineWidth = 1.2;
    bctx.stroke();
    bctx.strokeStyle = "rgba(255,240,210,0.35)";
    bctx.lineWidth = 3;
    bctx.stroke();
  }

  function shatter() {
    if (shattering || reduce) return;
    shattering = true;
    frame.classList.add("shattering", "glitch", "punch");
    flash.classList.add("go");
    setTimeout(function () { flash.classList.remove("go"); }, 300);
    const old = frame.querySelector(".shards");
    if (old) old.remove();
    const layer = document.createElement("div");
    layer.className = "shards";
    const cols = 10, rows = 6;
    const src = poster.currentSrc || poster.src;
    const rect = poster.getBoundingClientRect();
    const fw = poster.offsetWidth, fh = poster.offsetHeight;
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const s = document.createElement("div");
        s.className = "shard";
        const w = 100 / cols, h = 100 / rows;
        s.style.left = (x * w) + "%";
        s.style.top = (y * h) + "%";
        s.style.width = w + "%";
        s.style.height = h + "%";
        s.style.backgroundImage = "url(" + JSON.stringify(src).slice(1, -1) + ")";
        s.style.backgroundSize = (cols * 100) + "% " + (rows * 100) + "%";
        s.style.backgroundPosition = (x * 100 / (cols - 1)) + "% " + (y * 100 / (rows - 1)) + "%";
        const dx = (x - cols / 2 + 0.5) * (28 + Math.random() * 50);
        const dy = (y - rows / 2 + 0.5) * (22 + Math.random() * 40) - 10;
        const rot = (Math.random() - 0.5) * 70;
        s.style.transition = "transform .7s cubic-bezier(.15,.8,.2,1), opacity .7s ease";
        layer.appendChild(s);
        requestAnimationFrame(function () {
          s.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg) scale(.86)";
          s.style.opacity = "0.15";
        });
        setTimeout(function () {
          s.style.transition = "transform .85s cubic-bezier(.2,.9,.2,1), opacity .6s ease";
          s.style.transform = "translate(0,0) rotate(0) scale(1)";
          s.style.opacity = "1";
        }, 520);
      }
    }
    frame.appendChild(layer);
    spark(rect.left + rect.width / 2, rect.top + rect.height / 2, 80);
    setTimeout(function () {
      frame.classList.remove("shattering", "glitch", "punch");
      layer.remove();
      shattering = false;
    }, 1500);
  }

  function tick() {
    tx += (mx - tx) * 0.1;
    ty += (my - ty) * 0.1;
    document.documentElement.style.setProperty("--spot-x", tx * 100 + "%");
    document.documentElement.style.setProperty("--spot-y", ty * 100 + "%");

    if (cursor && !coarse && !reduce) {
      cursor.style.left = cx + "px";
      cursor.style.top = cy + "px";
    }
    if (shine && !reduce) shine.style.transform = "translateX(" + ((tx - 0.5) * 80) + "%)";
    if (frame && !reduce && !zoomed && !shattering) {
      frame.style.transform =
        "rotateX(" + ((ty - 0.5) * -14) + "deg) rotateY(" + ((tx - 0.5) * 18) +
        "deg) translate3d(" + ((tx - 0.5) * 16) + "px," + ((ty - 0.5) * 12) +
        "px,0) skewX(" + (vx * 0.05) + "deg)";
    }

    if (!reduce && Math.random() < 0.012) {
      frame.classList.add("glitch");
      glitchT = 8;
    }
    if (glitchT > 0) {
      glitchT--;
      if (glitchT === 0) frame.classList.remove("glitch");
    }

    dctx.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of particles) {
      if (p.orbit) {
        p.o += 0.02;
        p.x += (cx + Math.cos(p.o) * p.od - p.x) * 0.04;
        p.y += (cy + Math.sin(p.o) * p.od - p.y) * 0.04;
      } else {
        p.x += (cx - p.x) * 0.0005;
        p.y -= p.s;
        p.x += Math.sin(p.y * 0.014) * 0.18;
        if (p.y < -8) { p.y = innerHeight + 8; p.x = Math.random() * innerWidth; }
      }
      dctx.beginPath();
      dctx.fillStyle = p.warm ? "rgba(255,150,90," + p.a + ")" : "rgba(140,200,255," + p.a + ")";
      dctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      dctx.fill();
    }

    tctx.clearRect(0, 0, innerWidth, innerHeight);
    bctx.clearRect(0, 0, innerWidth, innerHeight);
    if (!reduce && !coarse) {
      tctx.beginPath();
      tctx.strokeStyle = "rgba(255,210,160,0.35)";
      tctx.lineWidth = 1.4;
      tctx.moveTo(cx - vx * 8, cy - vy * 8);
      tctx.lineTo(cx, cy);
      tctx.stroke();
      if (Math.hypot(vx, vy) > 18 && Math.random() < 0.25) {
        bolt(cx, cy, cx - vx * 3, cy - vy * 3);
      }
    }
    if (Math.random() < 0.04 && !reduce) {
      const a = Math.random() * Math.PI * 2;
      const r = 80 + Math.random() * 220;
      bolt(cx, cy, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
    for (let i = sparks.length - 1; i >= 0; i--) {
      const s = sparks[i];
      s.x += s.vx; s.y += s.vy; s.vy += 0.07; s.life -= 0.016;
      if (s.life <= 0) { sparks.splice(i, 1); continue; }
      tctx.beginPath();
      tctx.fillStyle = s.warm ? "rgba(255,180,100," + s.life + ")" : "rgba(160,210,255," + s.life + ")";
      tctx.arc(s.x, s.y, 2.1 * s.life, 0, Math.PI * 2);
      tctx.fill();
    }
    vx *= 0.88; vy *= 0.88;
    requestAnimationFrame(tick);
  }

  window.addEventListener("pointermove", (e) => {
    vx += (e.clientX - cx) * 0.1;
    vy += (e.clientY - cy) * 0.1;
    cx = e.clientX; cy = e.clientY;
    mx = e.clientX / innerWidth; my = e.clientY / innerHeight;
    if (frame) {
      const r = frame.getBoundingClientRect();
      frame.classList.toggle("hot", e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom);
    }
    if (!reduce && Math.random() < 0.4) {
      sparks.push({
        x: cx, y: cy,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        life: 0.6,
        warm: Math.random() > 0.4,
      });
    }
  });

  window.addEventListener("pointerdown", (e) => {
    if (cursor) cursor.classList.add("down");
    spark(e.clientX, e.clientY, reduce ? 10 : 42);
    ["ripple", "ripple alt"].forEach(function (cls, i) {
      const ring = document.createElement("div");
      ring.className = cls;
      ring.style.left = e.clientX + "px";
      ring.style.top = e.clientY + "px";
      document.body.appendChild(ring);
      setTimeout(function () { ring.remove(); }, 900 + i * 200);
    });
  });
  window.addEventListener("pointerup", () => { if (cursor) cursor.classList.remove("down"); });
  window.addEventListener("resize", resize);

  frame.addEventListener("click", () => {
    zoomed = !zoomed;
    frame.classList.toggle("zoomed", zoomed);
    if (zoomed) frame.style.transform = "none";
    shatter();
  });

  resize();
  spawn(reduce || coarse ? 40 : 220);
  if (!reduce) tick();
})();
