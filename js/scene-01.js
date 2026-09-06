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
    const T = this.timing;
    const phone = root.querySelector("#phone");
    const img = root.querySelector(".phone__img");
    const cue = root.querySelector("#cue");
    const cueSnd = root.querySelector("#cue-sound");
    const line1 = root.querySelector("#line-1");
    const line2 = root.querySelector("#line-2");
    const line3 = root.querySelector("#line-3");
    const cursor = document.getElementById("cursor");
    const ringEl = root.querySelector("#sfx-ring");
    const usePlaceholder = () => phone.classList.add("has-placeholder");
    const useImageRatio = () => {
      if (img.naturalWidth && img.naturalHeight) {
        root.style.setProperty("--phone-ratio", (img.naturalWidth / img.naturalHeight).toFixed(4));
      }
    };
    if (img.complete && img.naturalWidth === 0) usePlaceholder();
    if (img.complete && img.naturalWidth > 0) useImageRatio();
    img.addEventListener("error", usePlaceholder);
    img.addEventListener("load", useImageRatio);
    const ring = Audio.create(ringEl, ((ctx, offset) => synthRing(ctx, T.ringPattern, offset)));
    const answer = Audio.create(root.querySelector("#sfx-answer"), synthAnswer);
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
    const waitForEntry = () => new Promise((resolve => {
      const done = e => {
        if (e.type === "keydown" && ![ "Enter", " " ].includes(e.key)) return;
        document.removeEventListener("click", done);
        document.removeEventListener("keydown", done);
        cueSnd.classList.remove("is-visible");
        haptic(20);
        Audio.unlock();
        resolve();
      };
      setTimeout((() => {
        cueSnd.classList.add("is-visible");
      }), T.soundCueDelay);
      document.addEventListener("click", done);
      document.addEventListener("keydown", done);
    }));
    let callStarted = false;
    (async () => {
      await waitForEntry();
      await wait(T.silence);
      callStarted = true;
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