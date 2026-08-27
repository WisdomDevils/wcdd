(function () {
  const frame = document.getElementById("frame");
  const shine = document.getElementById("shine");
  const dust = document.getElementById("dust");
  const trail = document.getElementById("trail");
  const bolts = document.getElementById("bolts");
  const cursor = document.getElementById("cursor");
  const poster = document.getElementById("poster");
  const flash = document.getElementById("flash");
  const veil = document.getElementById("veil");
  const dctx = dust.getContext("2d");
  const tctx = trail.getContext("2d");
  const bctx = bolts.getContext("2d");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const coarse = window.matchMedia("(pointer: coarse)").matches;
  if (coarse) document.body.classList.add("touch");

  let mx = 0.5, my = 0.5, tx = 0.5, ty = 0.5, zoomed = false, busy = false;
  let cx = innerWidth / 2, cy = innerHeight / 2;
  let vx = 0, vy = 0, glitchT = 0;
  const particles = [];
  const sparks = [];

  const GRID = {
    x0: 0.036, x1: 0.938, cols: 8,
    header: [0.07, 0.125],
    rows: [[0.19, 0.392], [0.429, 0.694], [0.732, 0.923]],
  };

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
      bctx.lineTo(
        x1 + (x2 - x1) * t + (Math.random() - 0.5) * 18,
        y1 + (y2 - y1) * t + (Math.random() - 0.5) * 18
      );
    }
    bctx.strokeStyle = "rgba(180,220,255,0.55)";
    bctx.lineWidth = 1.2;
    bctx.stroke();
    bctx.strokeStyle = "rgba(255,240,210,0.35)";
    bctx.lineWidth = 3;
    bctx.stroke();
  }

  function cellAt(nx, ny) {
    if (ny < (GRID.header[1] + GRID.rows[0][0]) / 2) {
      return { x: GRID.x0, y: GRID.header[0], w: GRID.x1 - GRID.x0, h: GRID.header[1] - GRID.header[0] };
    }
    let row = GRID.rows.length - 1;
    for (let r = 0; r < GRID.rows.length; r++) {
      const mid = r === GRID.rows.length - 1 ? 1 : (GRID.rows[r][1] + GRID.rows[r + 1][0]) / 2;
      if (ny < mid) { row = r; break; }
    }
    const span = GRID.x1 - GRID.x0;
    const colW = span / GRID.cols;
    let col = Math.floor((nx - GRID.x0) / colW);
    col = Math.max(0, Math.min(GRID.cols - 1, col));
    const pad = 0.0035;
    const y0 = GRID.rows[row][0], y1 = GRID.rows[row][1];
    return {
      x: GRID.x0 + col * colW + pad,
      y: y0,
      w: colW - pad * 2,
      h: y1 - y0,
    };
  }

  function clipSH(poly, inside, intersect) {
    if (!poly.length) return [];
    const out = [];
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      const ain = inside(a), bin = inside(b);
      if (ain && bin) out.push(b);
      else if (ain && !bin) out.push(intersect(a, b));
      else if (!ain && bin) { out.push(intersect(a, b)); out.push(b); }
    }
    return out;
  }

  function clipHalf(poly, site, other) {
    const mx = (site[0] + other[0]) / 2, my = (site[1] + other[1]) / 2;
    const nx = other[0] - site[0], ny = other[1] - site[1];
    return clipSH(poly,
      (p) => (p[0] - mx) * nx + (p[1] - my) * ny <= 0.8,
      (a, b) => {
        const da = (a[0] - mx) * nx + (a[1] - my) * ny;
        const db = (b[0] - mx) * nx + (b[1] - my) * ny;
        const t = da / (da - db || 1e-6);
        return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
      }
    );
  }

  function clipRect(poly, x, y, w, h) {
    const planes = [
      [(p) => p[0] >= x - 0.01, (a, b) => [x, a[1] + (b[1] - a[1]) * ((x - a[0]) / (b[0] - a[0] || 1e-6))]],
      [(p) => p[0] <= x + w + 0.01, (a, b) => [x + w, a[1] + (b[1] - a[1]) * ((x + w - a[0]) / (b[0] - a[0] || 1e-6))]],
      [(p) => p[1] >= y - 0.01, (a, b) => [a[0] + (b[0] - a[0]) * ((y - a[1]) / (b[1] - a[1] || 1e-6)), y]],
      [(p) => p[1] <= y + h + 0.01, (a, b) => [a[0] + (b[0] - a[0]) * ((y + h - a[1]) / (b[1] - a[1] || 1e-6)), y + h]],
    ];
    let p = poly;
    for (const [ins, hit] of planes) {
      p = clipSH(p, ins, hit);
      if (p.length < 3) return [];
    }
    return p;
  }

  function area(poly) {
    let s = 0;
    for (let i = 0; i < poly.length; i++) {
      const a = poly[i], b = poly[(i + 1) % poly.length];
      s += a[0] * b[1] - b[0] * a[1];
    }
    return Math.abs(s) / 2;
  }

  function centroid(poly) {
    let x = 0, y = 0;
    for (const p of poly) { x += p[0]; y += p[1]; }
    return [x / poly.length, y / poly.length];
  }

  function inHole(px, py, hole) {
    return px >= hole.x && px <= hole.x + hole.w && py >= hole.y && py <= hole.y + hole.h;
  }

  function glassShards(W, H, hole) {
    const sites = [];
    const ring = 14;
    const cx = hole.x + hole.w / 2, cy = hole.y + hole.h / 2;
    const rx = hole.w * 0.62, ry = hole.h * 0.62;
    for (let i = 0; i < ring; i++) {
      const a = (i / ring) * Math.PI * 2 + (Math.random() - 0.5) * 0.35;
      sites.push([
        cx + Math.cos(a) * rx * (1.05 + Math.random() * 0.25),
        cy + Math.sin(a) * ry * (1.05 + Math.random() * 0.25),
      ]);
    }
    let guard = 0;
    while (sites.length < 36 && guard++ < 80) {
      const px = Math.random() * W, py = Math.random() * H;
      if (!inHole(px, py, hole)) sites.push([px, py]);
    }
    sites.push([8, 8], [W - 8, 8], [W - 8, H - 8], [8, H - 8]);

    const cells = sites.map((site, i) => {
      let poly = [[0, 0], [W, 0], [W, H], [0, H]];
      for (let j = 0; j < sites.length; j++) {
        if (i === j) continue;
        poly = clipHalf(poly, site, sites[j]);
        if (poly.length < 3) break;
      }
      return poly;
    });

    const regions = [
      [0, 0, W, hole.y],
      [0, hole.y + hole.h, W, H - (hole.y + hole.h)],
      [0, hole.y, hole.x, hole.h],
      [hole.x + hole.w, hole.y, W - (hole.x + hole.w), hole.h],
    ];
    const shards = [];
    const minA = W * H * 0.0012;
    for (const poly of cells) {
      if (poly.length < 3) continue;
      for (const r of regions) {
        if (r[2] < 4 || r[3] < 4) continue;
        const c = clipRect(poly, r[0], r[1], r[2], r[3]);
        if (c.length >= 3 && area(c) > minA) shards.push(c);
      }
    }
    return shards;
  }

  function polyCss(poly, W, H) {
    return poly.map(function (p) {
      return (p[0] / W * 100).toFixed(2) + "% " + (p[1] / H * 100).toFixed(2) + "%";
    }).join(", ");
  }

  function clearBreak() {
    const el = document.querySelector(".break-layer");
    if (el) el.remove();
  }

  function explodeGlass(hole01) {
    clearBreak();
    if (reduce) return;
    const r = frame.getBoundingClientRect();
    const layer = document.createElement("div");
    layer.className = "break-layer";
    layer.style.left = r.left + "px";
    layer.style.top = r.top + "px";
    layer.style.width = r.width + "px";
    layer.style.height = r.height + "px";
    const src = poster.currentSrc || poster.src;
    const W = 1000, H = 1000 * (r.height / r.width);
    const hole = { x: hole01.x * W, y: hole01.y * H, w: hole01.w * W, h: hole01.h * H };
    const polys = glassShards(W, H, hole);
    const hx = hole.x + hole.w / 2, hy = hole.y + hole.h / 2;
    polys.forEach(function (poly, i) {
      const s = document.createElement("div");
      s.className = "shard";
      s.style.backgroundImage = "url(" + JSON.stringify(src).slice(1, -1) + ")";
      s.style.clipPath = "polygon(" + polyCss(poly, W, H) + ")";
      const c = centroid(poly);
      const dx = (c[0] - hx) / W * (160 + Math.random() * 220);
      const dy = (c[1] - hy) / H * (140 + Math.random() * 200);
      const rot = (Math.random() - 0.5) * 52;
      s.style.transition = "transform .85s cubic-bezier(.12,.7,.2,1) " + (i % 7) * 18 + "ms, opacity .8s ease " + (i % 7) * 18 + "ms";
      layer.appendChild(s);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          s.style.transform = "translate(" + dx + "px," + dy + "px) rotate(" + rot + "deg) scale(.92)";
          s.style.opacity = "0";
        });
      });
    });
    document.body.appendChild(layer);
  }

  function implodeGlass() {
    const layer = document.querySelector(".break-layer");
    if (!layer) return;
    [].forEach.call(layer.children, function (s) {
      s.style.transition = "transform .7s cubic-bezier(.2,.85,.2,1), opacity .55s ease";
      s.style.transform = "translate(0,0) rotate(0) scale(1)";
      s.style.opacity = "1";
    });
    setTimeout(clearBreak, 750);
  }

  function zoomIn(e) {
    const r = poster.getBoundingClientRect();
    const nx = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const ny = Math.max(0, Math.min(1, (e.clientY - r.top) / r.height));
    const hole = cellAt(nx, ny);
    const fr = frame.getBoundingClientRect();
    const px = fr.left + (hole.x + hole.w / 2) * fr.width;
    const py = fr.top + (hole.y + hole.h / 2) * fr.height;
    const cellW = hole.w * fr.width;
    const cellH = hole.h * fr.height;
    let s = Math.min((0.86 * innerWidth) / cellW, (0.82 * innerHeight) / cellH);
    s = Math.max(2.2, Math.min(s, 7.2));
    const top = hole.y * 100;
    const right = (1 - hole.x - hole.w) * 100;
    const bottom = (1 - hole.y - hole.h) * 100;
    const left = hole.x * 100;

    explodeGlass(hole);
    document.body.classList.add("is-zoomed");
    if (veil) veil.classList.add("on");
    frame.classList.add("zoom-anim", "zoomed");
    frame.style.transformOrigin = ((hole.x + hole.w / 2) * 100) + "% " + ((hole.y + hole.h / 2) * 100) + "%";
    poster.style.clipPath = "inset(" + top.toFixed(2) + "% " + right.toFixed(2) + "% " + bottom.toFixed(2) + "% " + left.toFixed(2) + "% round 6px)";
    frame.style.transform = "translate(" + (innerWidth / 2 - px) + "px," + (innerHeight / 2 - py) + "px) scale(" + s + ")";
    spark(e.clientX, e.clientY, reduce ? 8 : 28);
    zoomed = true;
  }

  function zoomOut() {
    frame.classList.add("zoom-anim");
    frame.classList.remove("zoomed");
    document.body.classList.remove("is-zoomed");
    if (veil) veil.classList.remove("on");
    poster.style.clipPath = "inset(0% 0% 0% 0%)";
    frame.style.transform = "none";
    implodeGlass();
    setTimeout(function () {
      frame.classList.remove("zoom-anim");
      frame.style.transformOrigin = "50% 50%";
      poster.style.clipPath = "";
      zoomed = false;
      busy = false;
    }, 750);
  }

  function onPosterClick(e) {
    if (busy) return;
    e.stopPropagation();
    busy = true;
    if (!zoomed) {
      zoomIn(e);
      setTimeout(function () { busy = false; }, 500);
    } else {
      zoomOut();
    }
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
    if (shine && !reduce && !zoomed) shine.style.transform = "translateX(" + ((tx - 0.5) * 80) + "%)";
    if (frame && !reduce && !zoomed) {
      frame.style.transform =
        "rotateX(" + ((ty - 0.5) * -14) + "deg) rotateY(" + ((tx - 0.5) * 18) +
        "deg) translate3d(" + ((tx - 0.5) * 16) + "px," + ((ty - 0.5) * 12) +
        "px,0) skewX(" + (vx * 0.05) + "deg)";
    }

    if (!reduce && !zoomed && Math.random() < 0.012) {
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
    if (Math.random() < 0.04 && !reduce && !zoomed) {
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
    if (frame && !zoomed) {
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
    spark(e.clientX, e.clientY, reduce ? 10 : 28);
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
  window.addEventListener("keydown", function (e) {
    if (e.key === "Escape" && zoomed && !busy) { busy = true; zoomOut(); }
  });

  frame.addEventListener("click", onPosterClick);
  if (veil) veil.addEventListener("click", function () {
    if (zoomed && !busy) { busy = true; zoomOut(); }
  });

  resize();
  spawn(reduce || coarse ? 40 : 220);
  if (!reduce) tick();
})();
