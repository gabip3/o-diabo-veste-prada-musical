DVP.register("01", {
  timing: {
    soundCueDelay: 900,
    silence: 800,
    ringPattern: [ [ .3, 1.5 ], [ 2.2, 3.35 ], [ 4.35, 5.45 ], [ 6.2, 7.35 ] ],
    ringDuration: 7.55,
    loopGap: 3200,
    cueAfterBurst: 2,
    cueDelay: 450,
    afterAnswer: 900,
    pauseLine2: 1e3,
    pauseLine3: 650
  },
  init(root) {
    const {wait: wait, Audio: Audio} = DVP;
    const modo = document.documentElement.getAttribute("data-modo");
    const msgMode = !!modo;
    const callMode = modo === "chamada";
    const T = Object.assign({}, this.timing);
    if (msgMode) T.silence = 500;
    const phone = root.querySelector("#phone");
    const img = root.querySelector(".phone__img");
    const cue = root.querySelector("#cue");
    const cueSnd = root.querySelector("#cue-sound");
    const line1 = root.querySelector("#line-1");
    const line2 = root.querySelector("#line-2");
    const line3 = root.querySelector("#line-3");
    const cursor = document.getElementById("cursor");
    const ringEl = root.querySelector("#sfx-ring");
    const stackEl = root.querySelector("#stack");
    const chatEl = root.querySelector("#chat");
    const listEl = root.querySelector("#chat-list");
    const noticeTpl = root.querySelector("#notice-tpl");
    const usePlaceholder = () => phone.classList.add("has-placeholder");
    const useImageRatio = () => {
      if (img.naturalWidth && img.naturalHeight) {
        root.style.setProperty("--phone-ratio", (img.naturalWidth / img.naturalHeight).toFixed(4));
      }
    };
    img.addEventListener("load", useImageRatio);
    if (img.complete && img.naturalWidth > 0) useImageRatio();
    DVP.loadImageResilient(img, usePlaceholder);
    const ring = Audio.create(ringEl, ((ctx, offset) => synthRing(ctx, T.ringPattern, offset)));
    const answer = Audio.create(root.querySelector("#sfx-answer"), synthAnswer);
    const msgSnd = Audio.create(null, synthMessage);
    const popSnd = Audio.create(null, synthPop);
    let answered = false;
    let cycleStart = null;
    let cueShown = false;
    const ringDuration = () => ringEl && isFinite(ringEl.duration) && ringEl.duration > 0 ? ringEl.duration : T.ringDuration;
    Audio.onUnlock((() => {
      if (answered || cycleStart === null) return;
      ring.play((performance.now() - cycleStart) / 1e3);
    }));
    const unlockOnGesture = e => {
      if (phone.contains(e.target)) return;
      if (Audio.blocked) Audio.unlock();
    };
    document.addEventListener("click", unlockOnGesture);
    document.addEventListener("keydown", unlockOnGesture);
    const canHaptics = "vibrate" in navigator;
    const haptic = ms => {
      if (canHaptics) {
        try {
          navigator.vibrate(ms);
        } catch (e) {}
      }
    };
    const runRingCycle = () => new Promise((resolve => {
      cycleStart = performance.now();
      ring.play(0);
      let lastBurst = -1;
      let wasInBurst = false;
      const position = () => {
        if (ringEl && !ring.missing && !ringEl.paused && ringEl.currentTime > .05) return ringEl.currentTime;
        return (performance.now() - cycleStart) / 1e3;
      };
      const finish = () => {
        clearInterval(timer);
        phone.classList.remove("is-ringing");
        haptic(0);
        ring.stop();
        cycleStart = null;
        resolve();
      };
      const timer = setInterval((() => {
        if (answered) return finish();
        const t = position();
        let inBurst = false, burstEnd = 0;
        T.ringPattern.forEach((([a, b], i) => {
          if (t >= a && t < b) {
            inBurst = true;
            burstEnd = b;
          }
          if (t >= b) lastBurst = Math.max(lastBurst, i);
        }));
        phone.classList.toggle("is-ringing", inBurst);
        if (inBurst && !wasInBurst) haptic(Math.round((burstEnd - t) * 1e3));
        if (!inBurst && wasInBurst) haptic(0);
        wasInBurst = inBurst;
        if (!cueShown && lastBurst >= T.cueAfterBurst - 1) {
          cueShown = true;
          setTimeout((() => {
            if (answered) return;
            cue.classList.add("is-visible");
            phone.setAttribute("data-cursor", "hover");
          }), T.cueDelay);
        }
        const fileEnded = ringEl && !ring.missing && ringEl.ended;
        if (fileEnded || t >= ringDuration()) finish();
      }), 40);
    }));
    const slideToAnswer = resolve => {
      const slide = root.querySelector("#call-slide");
      const knob = root.querySelector("#call-knob");
      const label = root.querySelector(".call__label");
      let x0 = null, dx = 0, max = 0, moved = false;
      const finish = () => {
        slide.removeEventListener("pointerdown", down);
        slide.removeEventListener("pointermove", move);
        slide.removeEventListener("pointerup", up);
        slide.removeEventListener("pointercancel", up);
        slide.removeEventListener("keydown", key);
        knob.style.transition = "transform .22s ease-out";
        knob.style.transform = "translateX(" + max + "px)";
        root.classList.add("is-answering");
        haptic(20);
        Audio.unlock();
        setTimeout(resolve, 260);
      };
      const down = e => {
        x0 = e.clientX;
        dx = 0;
        moved = false;
        max = slide.clientWidth - knob.offsetWidth - 8;
        knob.style.transition = "none";
        try {
          slide.setPointerCapture(e.pointerId);
        } catch (err) {}
      };
      const move = e => {
        if (x0 === null) return;
        dx = Math.max(0, Math.min(max, e.clientX - x0));
        if (dx > 6) moved = true;
        knob.style.transform = "translateX(" + dx + "px)";
        label.style.opacity = String(Math.max(0, 1 - dx / (max * .55)));
      };
      const up = () => {
        if (x0 === null) return;
        x0 = null;
        if (dx > max * .72) {
          finish();
          return;
        }
        knob.style.transition = "transform .28s ease-out";
        knob.style.transform = "";
        label.style.opacity = "";
        if (!moved) {
          slide.classList.remove("is-nudge");
          void slide.offsetWidth;
          slide.classList.add("is-nudge");
        }
      };
      const key = e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          max = slide.clientWidth - knob.offsetWidth - 8;
          finish();
        }
      };
      slide.addEventListener("pointerdown", down);
      slide.addEventListener("pointermove", move);
      slide.addEventListener("pointerup", up);
      slide.addEventListener("pointercancel", up);
      slide.addEventListener("keydown", key);
    };
    const waitForEntry = () => new Promise((resolve => {
      if (callMode) {
        slideToAnswer(resolve);
        return;
      }
      let y0 = null;
      const onStart = e => {
        y0 = e.touches[0].clientY;
      };
      const onEnd = e => {
        if (y0 !== null && y0 - e.changedTouches[0].clientY > 40) done(e);
        y0 = null;
      };
      const done = e => {
        if (e.type === "keydown" && ![ "Enter", " " ].includes(e.key)) return;
        document.removeEventListener("click", done);
        document.removeEventListener("keydown", done);
        document.removeEventListener("touchstart", onStart);
        document.removeEventListener("touchend", onEnd);
        cueSnd.classList.remove("is-visible");
        haptic(20);
        Audio.unlock();
        resolve();
      };
      if (!msgMode) setTimeout((() => {
        cueSnd.classList.add("is-visible");
      }), T.soundCueDelay);
      document.addEventListener("click", done);
      document.addEventListener("keydown", done);
      if (msgMode) {
        document.addEventListener("touchstart", onStart, {
          passive: true
        });
        document.addEventListener("touchend", onEnd, {
          passive: true
        });
        setTimeout(resolve, 6e3);
      }
    }));
    let callStarted = false;
    const gated = true;
    const touch = window.matchMedia("(hover: none) and (pointer: coarse)").matches;
    const gate = root.querySelector("#gate");
    if (gate && !touch) gate.innerHTML = "Para uma melhor experiência,<br>certifique-se de que o som esteja ligado.";
    root.classList.add("is-gated");
    if (msgMode) {
      root.classList.add("is-msg");
      document.documentElement.classList.add("is-msg");
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute("content", "#000000");
      phone.removeAttribute("role");
      phone.removeAttribute("tabindex");
      phone.setAttribute("aria-hidden", "true");
      cue.textContent = "Abra.";
      if (callMode) root.classList.add("is-call");
      root.classList.add("is-awake");
    }
    const MSGS = [ "Andrea?", "Andrea.", "?????", "Meu café.", "Agora." ];
    const LOCK_COUNT = 3;
    let delivered = 0;
    let opened = false;
    let openResolve;
    const openedP = new Promise((r => {
      openResolve = r;
    }));
    const sleep = ms => Promise.race([ wait(ms), openedP ]);
    const lockDeliver = i => {
      const card = noticeTpl.content.firstElementChild.cloneNode(true);
      card.querySelector(".notice__body").textContent = MSGS[i];
      stackEl.appendChild(card);
      delivered = i + 1;
      msgSnd.play(0);
      haptic(i === 0 ? [ 70, 90, 70, 220, 70, 90, 70 ] : [ 60, 80, 60 ]);
    };
    const scrollList = () => {
      listEl.scrollTop = listEl.scrollHeight;
    };
    const demoteLast = () => {
      const prev = listEl.querySelector(".bubble.is-last");
      if (prev) prev.classList.remove("is-last");
    };
    const addBubble = text => {
      demoteLast();
      const b = document.createElement("div");
      b.className = "bubble is-last";
      b.textContent = text;
      listEl.appendChild(b);
      scrollList();
    };
    const showTyping = () => {
      demoteLast();
      const t = document.createElement("div");
      t.className = "bubble is-last typing";
      t.innerHTML = "<i></i><i></i><i></i>";
      listEl.appendChild(t);
      scrollList();
      return t;
    };
    const chatPhase = async () => {
      await wait(900);
      while (delivered < MSGS.length) {
        const t = showTyping();
        await wait(delivered === 3 ? 1200 : 800);
        t.remove();
        addBubble(MSGS[delivered]);
        delivered += 1;
        popSnd.play(0);
        haptic(18);
        await wait(700);
      }
      await wait(1300);
      cue.textContent = "Corra.";
      cue.classList.add("is-visible");
      if (cursor) cursor.classList.add("is-hover");
      await new Promise((resolve => {
        let y0 = null;
        const nudge = setTimeout((() => {
          cue.classList.add("is-nudge");
          haptic([ 25, 60, 25 ]);
        }), 2800);
        const go = () => {
          clearTimeout(nudge);
          root.removeEventListener("click", go);
          root.removeEventListener("wheel", onWheel);
          root.removeEventListener("touchstart", onStart);
          root.removeEventListener("touchend", onEnd);
          document.removeEventListener("keydown", onKey);
          cue.classList.remove("is-nudge");
          resolve();
        };
        const onKey = e => {
          if (e.key === "Enter" || e.key === " " || e.key === "ArrowDown") {
            e.preventDefault();
            go();
          }
        };
        const onWheel = e => {
          if (Math.abs(e.deltaY) > 8) go();
        };
        const onStart = e => {
          y0 = e.touches[0].clientY;
        };
        const onEnd = e => {
          if (y0 !== null && y0 - e.changedTouches[0].clientY > 40) go();
          y0 = null;
        };
        setTimeout((() => {
          root.addEventListener("click", go);
          root.addEventListener("wheel", onWheel, {
            passive: true
          });
          root.addEventListener("touchstart", onStart, {
            passive: true
          });
          root.addEventListener("touchend", onEnd, {
            passive: true
          });
          document.addEventListener("keydown", onKey);
        }), 500);
      }));
      haptic(30);
      cue.classList.remove("is-visible");
      if (cursor) cursor.classList.remove("is-hover");
      await wait(250);
      root.classList.add("is-complete");
      DVP.complete("01");
    };
    const openChat = () => {
      if (opened || !callStarted || delivered < 1) return;
      opened = true;
      answered = true;
      haptic(0);
      cue.classList.remove("is-visible");
      if (cursor) cursor.classList.remove("is-hover");
      root.classList.add("is-unlocked");
      for (let i = 0; i < delivered; i++) addBubble(MSGS[i]);
      chatEl.setAttribute("aria-hidden", "false");
      chatEl.classList.add("is-open");
      openResolve();
      chatPhase();
    };
    const lockMissedCall = () => {
      const card = noticeTpl.content.firstElementChild.cloneNode(true);
      card.querySelector(".notice__body").textContent = "Chamada perdida";
      const ic = card.querySelector(".notice__icon");
      ic.classList.add("notice__icon--phone");
      ic.innerHTML = '<svg viewBox="0 0 24 24"><path d="M6.6 10.8c1.4 2.8 3.8 5.2 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.3.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z" fill="#fff"/></svg>';
      stackEl.appendChild(card);
      msgSnd.play(0);
      haptic([ 220 ]);
    };
    const runMessages = async () => {
      if (callMode) {
        await wait(650);
        lockMissedCall();
        await sleep(1300);
        if (opened) return;
      }
      root.addEventListener("click", openChat);
      document.addEventListener("keydown", (e => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          openChat();
        }
      }));
      for (let i = 0; i < LOCK_COUNT; i++) {
        await sleep(i === 0 ? 0 : i === 1 ? 1500 : 1400);
        if (opened) return;
        lockDeliver(i);
      }
      sleep(900).then((() => {
        if (!opened) cue.classList.add("is-visible");
      }));
    };
    (async () => {
      await waitForEntry();
      if (gated) {
        root.classList.remove("is-gated");
        if (msgMode) root.classList.add("is-awake", "is-woke");
        await wait(msgMode ? 0 : 1e3);
      }
      await wait(T.silence);
      callStarted = true;
      if (msgMode) {
        await runMessages();
        return;
      }
      while (!answered) {
        await runRingCycle();
        if (answered) return;
        await wait(T.loopGap);
      }
    })();
    const onAnswer = async () => {
      if (answered || !callStarted) return;
      answered = true;
      ring.stop();
      cycleStart = null;
      phone.classList.remove("is-ringing");
      haptic(0);
      phone.classList.add("is-answered");
      phone.removeAttribute("data-cursor");
      phone.removeAttribute("role");
      phone.removeAttribute("tabindex");
      cue.classList.remove("is-visible");
      if (cursor) cursor.classList.remove("is-hover");
      Audio.unlock();
      answer.play(0);
      await wait(T.afterAnswer);
      line1.classList.add("is-visible");
      await wait(T.pauseLine2);
      line2.classList.add("is-visible");
      await wait(T.pauseLine3);
      line3.classList.add("is-visible");
      root.classList.add("is-complete");
      DVP.complete("01");
    };
    phone.addEventListener("click", onAnswer);
    phone.addEventListener("keydown", (e => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        onAnswer();
      }
    }));
  }
});

function synthRing(ctx, pattern, offset = 0) {
  const master = ctx.createGain();
  master.gain.value = 1e-4;
  master.connect(ctx.destination);
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "triangle";
  osc.connect(master);
  const step = .055;
  const tones = [ 1318.5, 1046.5 ];
  let end = 0;
  pattern.forEach((([a, b], i) => {
    const level = .045 * (1 - i * .12);
    for (let t = a; t < b; t += step) {
      const at = t0 + (t - offset);
      if (at < t0) continue;
      osc.frequency.setValueAtTime(tones[Math.round(t / step) % 2], at);
      master.gain.setValueAtTime(1e-4, at);
      master.gain.exponentialRampToValueAtTime(level, at + .008);
      master.gain.exponentialRampToValueAtTime(1e-4, at + step - .004);
    }
    end = Math.max(end, b - offset);
  }));
  osc.start(t0);
  osc.stop(t0 + Math.max(end, .05) + .1);
  return () => {
    try {
      master.gain.cancelScheduledValues(ctx.currentTime);
      master.gain.setValueAtTime(master.gain.value, ctx.currentTime);
      master.gain.exponentialRampToValueAtTime(1e-4, ctx.currentTime + .03);
      osc.stop(ctx.currentTime + .04);
    } catch (e) {}
  };
}

function synthAnswer(ctx) {
  const t0 = ctx.currentTime;
  const gain = ctx.createGain();
  gain.connect(ctx.destination);
  gain.gain.setValueAtTime(1e-4, t0);
  gain.gain.exponentialRampToValueAtTime(.045, t0 + .004);
  gain.gain.exponentialRampToValueAtTime(1e-4, t0 + .06);
  const osc = ctx.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(520, t0);
  osc.frequency.exponentialRampToValueAtTime(180, t0 + .06);
  osc.connect(gain);
  osc.start(t0);
  osc.stop(t0 + .09);
  return () => {
    try {
      osc.stop();
    } catch (e) {}
  };
}

function synthPop(ctx) {
  const t0 = ctx.currentTime;
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(1318.5, t0);
  o.frequency.exponentialRampToValueAtTime(1046.5, t0 + .1);
  const g = ctx.createGain();
  g.gain.setValueAtTime(1e-4, t0);
  g.gain.exponentialRampToValueAtTime(.09, t0 + .008);
  g.gain.exponentialRampToValueAtTime(1e-4, t0 + .16);
  o.connect(g);
  g.connect(ctx.destination);
  o.start(t0);
  o.stop(t0 + .18);
  return () => {
    try {
      o.stop();
    } catch (e) {}
  };
}

function synthMessage(ctx) {
  const t0 = ctx.currentTime;
  const master = ctx.createGain();
  master.connect(ctx.destination);
  const oscs = [];
  [ [ 1318.5, 1, .2 ], [ 2637, 1, .05 ] ].forEach((([f, , amp]) => {
    const o = ctx.createOscillator();
    o.type = "sine";
    o.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(1e-4, t0);
    g.gain.exponentialRampToValueAtTime(amp, t0 + .008);
    g.gain.exponentialRampToValueAtTime(1e-4, t0 + .55);
    o.connect(g);
    g.connect(master);
    o.start(t0);
    o.stop(t0 + .6);
    oscs.push(o);
  }));
  return () => oscs.forEach((o => {
    try {
      o.stop();
    } catch (err) {}
  }));
}