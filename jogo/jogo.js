(() => {
  const W = 800, H = 360, GY = 304;
  const GOAL = 8600;
  const AX = 120;
  const cv = document.getElementById("cv");
  const ctx = cv.getContext("2d");
  const $ = id => document.getElementById(id);
  const ov = {
    start: $("start"),
    lose: $("lose"),
    end: $("end")
  };
  let scale = 1;
  const fit = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cw = cv.clientWidth || W;
    scale = cw / W * dpr;
    cv.width = Math.round(W * scale);
    cv.height = Math.round(H * scale);
  };
  window.addEventListener("resize", fit);
  fit();
  let ac = null;
  const audio = () => {
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext);
      if (ac.state === "suspended") ac.resume();
    } catch (e) {}
  };
  const blip = (f0, f1, dur, type, vol) => {
    if (!ac) return;
    const t = ac.currentTime, o = ac.createOscillator(), g = ac.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(vol || .08, t);
    g.gain.exponentialRampToValueAtTime(1e-4, t + dur);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t);
    o.stop(t + dur + .02);
  };
  const sJump = () => blip(480, 820, .14, "sine", .07);
  const sHit = () => {
    blip(260, 70, .35, "sawtooth", .09);
  };
  const sDone = () => {
    blip(880, 880, .18, "sine", .06);
    setTimeout((() => blip(1175, 1175, .4, "sine", .06)), 160);
  };
  let st;
  const reset = () => {
    st = {
      phase: "ready",
      t: 0,
      dist: 0,
      speed: 300,
      bgx: 0,
      floorx: 0,
      y: 0,
      vy: 0,
      air: false,
      ax: AX,
      hasCup: true,
      obs: [],
      nextGap: 520,
      desk: null,
      deskX: W + 260,
      timer: 0,
      typed: 0,
      cup: null,
      drops: [],
      shake: 0
    };
  };
  reset();
  const TYPES = [ {
    n: "caixas",
    w: 46,
    h: 46
  }, {
    n: "torre",
    w: 46,
    h: 84
  }, {
    n: "arara",
    w: 80,
    h: 92
  }, {
    n: "bolsa",
    w: 44,
    h: 36
  } ];
  const spawn = () => {
    const tp = TYPES[Math.random() * TYPES.length | 0];
    st.obs.push({
      x: W + 40,
      w: tp.w,
      h: tp.h,
      n: tp.n,
      s: Math.random()
    });
    st.nextGap = 400 + st.speed * .42 + Math.random() * 330;
  };
  const jump = () => {
    audio();
    if (st.phase === "ready") {
      startRun();
    }
    if (st.phase !== "run") return;
    if (!st.air) {
      st.vy = 790;
      st.air = true;
      sJump();
    }
  };
  const startRun = () => {
    ov.start.classList.remove("show");
    st.phase = "run";
  };
  window.addEventListener("keydown", (e => {
    if (e.code === "Space" || e.code === "ArrowUp") {
      e.preventDefault();
      if (st.phase === "spill" && st.timer > .9) restart(); else jump();
    }
  }));
  cv.addEventListener("pointerdown", (e => {
    e.preventDefault();
    jump();
  }));
  ov.start.addEventListener("pointerdown", (e => {
    e.preventDefault();
    jump();
  }));
  const restart = () => {
    ov.lose.classList.remove("show");
    ov.end.classList.remove("show");
    reset();
    audio();
    startRun();
  };
  $("retry").addEventListener("click", restart);
  $("again").addEventListener("click", restart);
  const rectsHit = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  const update = dt => {
    st.t += dt;
    const p = st.phase;
    if (p === "run" || p === "arrive") {
      st.dist += st.speed * dt;
      st.speed = 300 + Math.min(1, st.dist / GOAL) * 110;
      st.bgx += st.speed * .25 * dt;
      st.floorx += st.speed * dt;
      st.obs.forEach((o => {
        o.x -= st.speed * dt;
      }));
      st.obs = st.obs.filter((o => o.x + o.w > -40));
    }
    if (st.air) {
      st.vy -= 2300 * dt;
      st.y += st.vy * dt;
      if (st.y <= 0) {
        st.y = 0;
        st.vy = 0;
        st.air = false;
      }
    }
    if (p === "run") {
      const progress = st.dist / GOAL;
      st.nextGap -= st.speed * dt;
      if (progress < .94 && st.nextGap <= 0) spawn();
      const me = {
        x: st.ax - 9,
        y: st.y,
        w: 20,
        h: 70
      };
      for (const o of st.obs) {
        const r = {
          x: o.x + 5,
          y: 0,
          w: o.w - 10,
          h: o.h - 5
        };
        if (rectsHit(me, r)) {
          hit();
          return;
        }
      }
      if (progress >= 1) {
        st.phase = "arrive";
      }
    }
    if (p === "arrive") {
      if (st.obs.length === 0 && !st.desk) st.desk = {
        x: W + 120
      };
      if (st.desk) {
        st.desk.x -= st.speed * dt;
        st.speed = Math.max(140, st.speed - 120 * dt);
        if (st.desk.x <= 540) {
          st.desk.x = 540;
          st.phase = "walk";
          st.speed = 0;
        }
      }
    }
    if (p === "walk") {
      st.ax += 130 * dt;
      if (st.ax >= 470) {
        st.ax = 470;
        st.phase = "give";
        st.timer = 0;
      }
    }
    if (p === "give") {
      st.timer += dt;
      if (st.timer > .9) {
        st.phase = "speak";
        st.timer = 0;
        st.hasCup = false;
        sDone();
      }
    }
    if (p === "speak") {
      st.timer += dt;
      st.typed = Math.min(11, Math.floor(st.timer / .07));
      if (st.timer > 2.3 && st.phase !== "done") {
        st.phase = "done";
        ov.end.classList.add("show");
      }
    }
    if (p === "spill") {
      st.timer += dt;
      st.drops.forEach((d => {
        d.vy -= 1500 * dt;
        d.x += d.vx * dt;
        d.y += d.vy * dt;
      }));
      if (st.cup) {
        st.cup.vy -= 1500 * dt;
        st.cup.x += st.cup.vx * dt;
        st.cup.y += st.cup.vy * dt;
        st.cup.r += st.cup.vr * dt;
        if (st.cup.y < 0) {
          st.cup.y = 0;
          st.cup.vy *= -.3;
          st.cup.vx *= .5;
          st.cup.vr *= .4;
        }
      }
      if (st.timer > .7 && !ov.lose.classList.contains("show")) ov.lose.classList.add("show");
    }
    if (st.shake > 0) st.shake -= dt;
  };
  const hit = () => {
    sHit();
    st.phase = "spill";
    st.timer = 0;
    st.shake = .25;
    st.hasCup = false;
    st.cup = {
      x: st.ax + 30,
      y: st.y + 56,
      vx: 160,
      vy: 380,
      r: 0,
      vr: 7
    };
    for (let i = 0; i < 14; i++) st.drops.push({
      x: st.ax + 30,
      y: st.y + 56,
      vx: 60 + Math.random() * 260,
      vy: 160 + Math.random() * 380,
      s: 2 + Math.random() * 3
    });
  };
  const SKIN = "#f0cdb0", INK = "#17140f", RED = "#b0141c", BLUE = "#2f5fb8";
  const drawBg = () => {
    const g = ctx.createLinearGradient(0, 0, 0, GY);
    g.addColorStop(0, "#f8f5f0");
    g.addColorStop(1, "#ece6dc");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, GY);
    const pw = 230, off = st.bgx % pw;
    for (let i = -1; i < W / pw + 2; i++) {
      const x = i * pw - off;
      ctx.fillStyle = "#e4e9ee";
      ctx.fillRect(x + 14, 34, pw - 28, 190);
      ctx.fillStyle = "#cdd5dc";
      const idx = Math.floor((x + st.bgx) / pw);
      for (let b = 0; b < 4; b++) {
        const bh = 50 + (idx * 7 + b * 13) % 9 * 11;
        ctx.fillRect(x + 24 + b * 48, 224 - bh, 40, bh);
      }
      ctx.strokeStyle = "rgba(23,20,15,.28)";
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x + 14, 34, pw - 28, 190);
    }
    ctx.fillStyle = "#d9d1c4";
    ctx.fillRect(0, GY - 10, W, 10);
    ctx.fillStyle = "#c8bfb0";
    ctx.fillRect(0, GY, W, H - GY);
    ctx.strokeStyle = "rgba(23,20,15,.13)";
    ctx.lineWidth = 1;
    const tile = 110, fo = st.floorx % tile;
    for (let x = -fo; x < W; x += tile) {
      ctx.beginPath();
      ctx.moveTo(x, GY);
      ctx.lineTo(x - 28, H);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(0, GY + 28);
    ctx.lineTo(W, GY + 28);
    ctx.stroke();
  };
  const drawObstacle = o => {
    const x = o.x, base = GY;
    ctx.save();
    if (o.n === "caixas") {
      ctx.fillStyle = INK;
      ctx.fillRect(x, base - 24, o.w, 24);
      ctx.fillStyle = "#f3efe8";
      ctx.fillRect(x + 2, base - 46, o.w - 4, 22);
      ctx.fillStyle = RED;
      ctx.fillRect(x + 2, base - 36, o.w - 4, 4);
      ctx.fillStyle = "#f3efe8";
      ctx.fillRect(x + o.w / 2 - 6, base - 18, 12, 3);
    } else if (o.n === "torre") {
      const cols = [ INK, "#f3efe8", RED, INK ];
      const hs = [ 22, 20, 22, 20 ];
      let y = base;
      cols.forEach(((c, i) => {
        y -= hs[i];
        ctx.fillStyle = c;
        ctx.fillRect(x + i % 2 * 2, y, o.w - i % 2 * 4, hs[i] - 1);
      }));
      ctx.strokeStyle = "rgba(23,20,15,.35)";
      ctx.strokeRect(x + .5, base - 83.5, o.w - 1, 83);
    } else if (o.n === "arara") {
      ctx.strokeStyle = "#5a5249";
      ctx.lineWidth = 3;
      ctx.lineCap = "round";
      ctx.beginPath();
      ctx.moveTo(x + 6, base);
      ctx.lineTo(x + 14, base - 96);
      ctx.moveTo(x + o.w - 6, base);
      ctx.lineTo(x + o.w - 14, base - 96);
      ctx.moveTo(x + 12, base - 96);
      ctx.lineTo(x + o.w - 12, base - 96);
      ctx.stroke();
      const cl = [ "#2f5fb8", INK, RED, "#d6c3a0", INK, "#6b7f5a" ];
      for (let i = 0; i < 6; i++) {
        ctx.fillStyle = cl[i];
        const hx = x + 16 + i * 10;
        ctx.fillRect(hx, base - 94, 8, 46 + i % 3 * 8);
      }
    } else {
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.roundRect(x, base - 28, o.w, 28, 5);
      ctx.fill();
      ctx.strokeStyle = INK;
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(x + o.w / 2, base - 28, 10, Math.PI, 0);
      ctx.stroke();
      ctx.fillStyle = "#e0b43a";
      ctx.fillRect(x + o.w / 2 - 4, base - 20, 8, 5);
    }
    ctx.restore();
  };
  const drawCup = (x, y, rot, steam) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(rot || 0);
    ctx.fillStyle = "#fbfaf7";
    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(6, -8);
    ctx.lineTo(4.5, 8);
    ctx.lineTo(-4.5, 8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(23,20,15,.45)";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = RED;
    ctx.fillRect(-5.4, -2.5, 10.8, 6);
    ctx.fillStyle = INK;
    ctx.fillRect(-7, -10, 14, 3);
    if (steam) {
      ctx.strokeStyle = "rgba(23,20,15,.28)";
      ctx.lineWidth = 1.3;
      ctx.lineCap = "round";
      for (let i = -1; i <= 1; i += 2) {
        ctx.beginPath();
        const s = Math.sin(st.t * 5 + i) * 2;
        ctx.moveTo(i * 2.5, -12);
        ctx.quadraticCurveTo(i * 2.5 + 4 + s, -17, i * 2.5 - 1, -23);
        ctx.stroke();
      }
    }
    ctx.restore();
  };
  const drawAndy = (x, yUp, runT, air, state) => {
    const y = GY - yUp;
    const ph = air ? 0 : runT * 16;
    const walking = state === "walk";
    const stand = state === "give" || state === "speak" || state === "done";
    const swing = stand ? 0 : walking ? runT * 9 : ph;
    const bob = air || stand ? 0 : Math.abs(Math.sin(swing)) * 2;
    const hipY = y - 27 - bob;
    ctx.lineCap = "round";
    for (const s of [ 1, -1 ]) {
      const a = air ? s * .55 : Math.sin(swing) * s * (walking ? .5 : .75);
      const fx = x + Math.sin(a) * 16, fy = hipY + Math.cos(a) * 25 - (air && s < 0 ? 9 : 0);
      ctx.strokeStyle = "#2a2522";
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(x, hipY);
      ctx.lineTo(fx, fy);
      ctx.stroke();
      ctx.fillStyle = RED;
      ctx.beginPath();
      ctx.ellipse(fx + 3, fy + 1, 6.5, 3.4, 0, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#c1b9ad";
    ctx.beginPath();
    ctx.moveTo(x - 11, hipY - 10);
    ctx.lineTo(x + 11, hipY - 10);
    ctx.lineTo(x + 14, hipY + 5);
    ctx.lineTo(x - 14, hipY + 5);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(23,20,15,.28)";
    ctx.lineWidth = 1;
    for (let i = -8; i <= 8; i += 8) {
      ctx.beginPath();
      ctx.moveTo(x + i, hipY - 10);
      ctx.lineTo(x + i * 1.2, hipY + 5);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(x - 13, hipY - 2);
    ctx.lineTo(x + 13, hipY - 2);
    ctx.stroke();
    ctx.fillStyle = BLUE;
    ctx.beginPath();
    ctx.roundRect(x - 12, hipY - 44, 24, 36, 7);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.18)";
    ctx.lineWidth = 1;
    for (let i = -6; i <= 6; i += 6) {
      ctx.beginPath();
      ctx.moveTo(x + i, hipY - 40);
      ctx.lineTo(x + i, hipY - 12);
      ctx.stroke();
    }
    ctx.fillStyle = "#f3efe8";
    ctx.fillRect(x - 6, hipY - 47, 12, 5);
    const hy = hipY - 59;
    ctx.fillStyle = "#4a2f22";
    ctx.beginPath();
    ctx.ellipse(x - 1, hy + 3, 14, 16, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(x + 2, hy + 1.5, 10.5, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#4a2f22";
    ctx.beginPath();
    ctx.ellipse(x + 1, hy - 7, 12.5, 6, -.12, Math.PI, 0);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(x + 7, hy + 1, 1.3, 0, 7);
    ctx.fill();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x + 5.5, hy + 7);
    ctx.lineTo(x + 9.5, hy + 6.6);
    ctx.stroke();
    const shx = x + 4, shy = hipY - 40;
    let hx = x + 27, hy2 = hipY - 33 + (air ? -4 : Math.sin(swing * 2) * 1.2);
    if (state === "give") {
      const k = Math.min(1, st.timer / .5);
      hx = x + 27 + k * 22;
      hy2 = hipY - 38;
    }
    ctx.strokeStyle = BLUE;
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(shx, shy);
    ctx.lineTo(hx - 3, hy2);
    ctx.stroke();
    ctx.fillStyle = SKIN;
    ctx.beginPath();
    ctx.arc(hx, hy2, 3.4, 0, 7);
    ctx.fill();
    return {
      hx: hx,
      hy: hy2
    };
  };
  const drawMiranda = (dx, speaking) => {
    const top = GY - 54, cx = dx + 100;
    ctx.fillStyle = "#2b2723";
    ctx.beginPath();
    ctx.roundRect(cx - 4, top - 84, 56, 92, 12);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.moveTo(cx - 28, top - 4);
    ctx.quadraticCurveTo(cx - 30, top - 48, cx - 12, top - 56);
    ctx.lineTo(cx + 18, top - 56);
    ctx.quadraticCurveTo(cx + 36, top - 48, cx + 34, top - 4);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.14)";
    ctx.lineWidth = 1;
    for (let i = -20; i <= 26; i += 8) {
      ctx.beginPath();
      ctx.moveTo(cx + i, top - 8);
      ctx.lineTo(cx + i * .8 + 2, top - 52);
      ctx.stroke();
    }
    const hy = top - 80;
    const hg = ctx.createRadialGradient(cx - 6, hy - 8, 4, cx, hy, 34);
    hg.addColorStop(0, "#f0f1f3");
    hg.addColorStop(1, "#b9bec6");
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(cx, hy, 27, 29, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx - 20, hy + 10, 12, 15, 0, 0, 7);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(cx + 20, hy + 10, 12, 15, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = "#f4dccb";
    ctx.beginPath();
    ctx.ellipse(cx - 2, hy + 6, 14, 17, 0, 0, 7);
    ctx.fill();
    ctx.fillStyle = INK;
    ctx.beginPath();
    ctx.arc(cx - 8, hy + 3, 1.4, 0, 7);
    ctx.arc(cx + 2, hy + 3, 1.4, 0, 7);
    ctx.fill();
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(cx - 11, hy - 1);
    ctx.lineTo(cx - 5, hy - 2);
    ctx.moveTo(cx - 1, hy - 2);
    ctx.lineTo(cx + 5, hy - 1);
    ctx.stroke();
    ctx.strokeStyle = RED;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - 7, hy + 13);
    ctx.lineTo(cx + 3, hy + 13);
    ctx.stroke();
    ctx.fillStyle = "#8b9096";
    for (let i = 0; i < 7; i++) {
      const a = Math.PI * (.15 + i * .12);
      ctx.beginPath();
      ctx.arc(cx - 2 + Math.cos(a) * 17, top - 52 + Math.sin(a) * 6, 3.6, 0, 7);
      ctx.fill();
    }
    ctx.fillStyle = "#2b2723";
    ctx.fillRect(dx, top, 168, 6);
    ctx.fillStyle = "#1f1c19";
    ctx.fillRect(dx + 6, top + 6, 156, GY - top - 6);
    ctx.fillStyle = "rgba(255,255,255,.08)";
    ctx.fillRect(dx, top, 168, 1.5);
    const mhx = dx - 6, mhy = top - 30;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 8;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(cx - 22, top - 38);
    ctx.lineTo(mhx + 6, mhy);
    ctx.stroke();
    ctx.fillStyle = "#f4dccb";
    ctx.beginPath();
    ctx.arc(mhx, mhy, 4.2, 0, 7);
    ctx.fill();
    ctx.fillStyle = RED;
    ctx.beginPath();
    ctx.arc(mhx - 1, mhy + 3, 1.3, 0, 7);
    ctx.fill();
    return {
      hx: mhx,
      hy: mhy,
      hairY: hy,
      cx: cx
    };
  };
  const drawBubble = (x, y, text) => {
    ctx.font = 'italic 400 22px "Libre Caslon Text", Georgia, serif';
    const w = ctx.measureText("That's all.").width + 34, h = 44;
    ctx.fillStyle = "#fff";
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.roundRect(x - w, y - h, w, h, 6);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x - 36, y);
    ctx.lineTo(x - 26, y + 14);
    ctx.lineTo(x - 18, y);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x - 36, y);
    ctx.lineTo(x - 26, y + 14);
    ctx.lineTo(x - 18, y);
    ctx.stroke();
    ctx.fillStyle = "#fff";
    ctx.fillRect(x - 35, y - 2, 16, 4);
    ctx.fillStyle = INK;
    ctx.textBaseline = "middle";
    ctx.fillText(text, x - w + 17, y - h / 2 + 1);
  };
  const drawHud = () => {
    const x0 = 40, x1 = W - 40, y = 26, p = Math.min(1, st.dist / GOAL);
    ctx.strokeStyle = "rgba(23,20,15,.25)";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x1, y);
    ctx.stroke();
    ctx.strokeStyle = RED;
    ctx.beginPath();
    ctx.moveTo(x0, y);
    ctx.lineTo(x0 + (x1 - x0) * p, y);
    ctx.stroke();
    drawCup(x0 + (x1 - x0) * p, y - 12, 0, false);
    ctx.fillStyle = "rgba(23,20,15,.7)";
    ctx.font = '400 11px "Libre Caslon Text", Georgia, serif';
    ctx.textAlign = "right";
    ctx.textBaseline = "alphabetic";
    ctx.fillText("M I R A N D A", x1, y + 20);
    ctx.textAlign = "left";
  };
  const draw = () => {
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    if (st.shake > 0) ctx.translate((Math.random() - .5) * 6, (Math.random() - .5) * 6);
    drawBg();
    let mir = null;
    if (st.desk) mir = drawMiranda(st.desk.x, st.phase === "speak");
    st.obs.forEach(drawObstacle);
    const runT = st.t;
    const air = st.air;
    const hand = drawAndy(st.ax, st.phase === "spill" ? 0 : st.y, runT, air && st.phase !== "spill", st.phase);
    if (st.phase === "spill") {
      st.drops.forEach((d => {
        ctx.fillStyle = "#4a2f22";
        ctx.beginPath();
        ctx.arc(d.x, GY - d.y, d.s, 0, 7);
        ctx.fill();
      }));
      if (st.cup) drawCup(st.cup.x, GY - st.cup.y, st.cup.r, false);
    } else if (st.hasCup) {
      drawCup(hand.hx + 2, hand.hy - 11, 0, true);
    } else if (mir) {
      drawCup(mir.hx + 2, mir.hy - 10, 0, true);
    }
    if (st.phase === "speak" || st.phase === "done") drawBubble(mir.cx + 24, mir.hairY - 38, "That's all.".slice(0, st.phase === "done" ? 11 : st.typed));
    if (st.phase !== "ready") drawHud();
  };
  let last = performance.now();
  const loop = now => {
    const dt = Math.min(.034, (now - last) / 1e3);
    last = now;
    if (st.phase !== "ready" && st.phase !== "done") update(dt); else st.t += dt;
    draw();
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
  window.__jogo = {
    get st() {
      return st;
    },
    GOAL: GOAL,
    step(dt) {
      if (st.phase !== "ready" && st.phase !== "done") update(dt); else st.t += dt;
      draw();
    }
  };
})();