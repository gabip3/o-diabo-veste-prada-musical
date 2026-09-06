DVP.register("02", {
  after: "01",
  silence: 1300,
  beats: [ {
    at: 0,
    do: "recede"
  }, {
    at: 350,
    el: "rule",
    in: 700,
    sfx: "paper"
  }, {
    at: 450,
    el: "hoje",
    in: 700
  }, {
    at: 550,
    el: "date",
    in: 600
  }, {
    at: 550,
    el: "clock",
    in: 600
  }, {
    at: 750,
    el: "r1",
    in: 500
  }, {
    at: 830,
    el: "r2",
    in: 500
  }, {
    at: 910,
    el: "r3",
    in: 500
  }, {
    at: 990,
    el: "r4",
    in: 500
  }, {
    at: 1070,
    el: "r5",
    in: 500
  }, {
    at: 1150,
    el: "folio",
    in: 600
  }, {
    at: 1800,
    el: "n1",
    in: 460,
    sfx: "paper"
  }, {
    at: 2200,
    el: "m-arrow",
    in: 380,
    sfx: "paper"
  }, {
    at: 2450,
    el: "d-cup",
    in: 700
  }, {
    at: 2700,
    el: "n2",
    in: 500,
    sfx: "paper"
  }, {
    at: 3150,
    el: "n3",
    in: 460,
    sfx: "paper"
  }, {
    at: 3500,
    el: "d-star",
    in: 360
  }, {
    at: 3700,
    el: "n4",
    in: 500,
    sfx: "paper"
  }, {
    at: 4050,
    el: "d-quest",
    in: 340
  }, {
    at: 4250,
    el: "n5",
    in: 600,
    sfx: "paper"
  }, {
    at: 4900,
    el: "m-under",
    in: 400,
    sfx: "paper"
  }, {
    at: 5450,
    do: "tick",
    sfx: "click"
  }, {
    at: 5800,
    el: "m-circle",
    in: 800,
    sfx: "paper",
    haptic: 25
  }, {
    at: 6500,
    el: "d-spiral",
    in: 1400
  }, {
    at: 6900,
    el: "continua",
    in: 800
  } ],
  init(root) {
    const {wait: wait, Audio: Audio} = DVP;
    const scene01 = document.getElementById("scene-01");
    const digit = root.querySelector("#clock-digit");
    root.setAttribute("aria-hidden", "false");
    if (window.matchMedia("(max-width: 720px), (orientation: portrait) and (max-width: 900px)").matches) {
      const scream = root.querySelector(".agenda__scream");
      const lastRow = root.querySelector(".agenda__row:last-child");
      if (scream && lastRow) lastRow.appendChild(scream);
    }
    root.querySelectorAll(".mark path").forEach((p => {
      try {
        p.style.setProperty("--len", p.getTotalLength().toFixed(2));
      } catch (e) {}
    }));
    const sfx = {
      paper: Audio.create(root.querySelector("#sfx-paper"), synthPaper),
      click: Audio.create(root.querySelector("#sfx-click"), synthClick)
    };
    const haptic = ms => {
      if ("vibrate" in navigator) {
        try {
          navigator.vibrate(ms);
        } catch (e) {}
      }
    };
    const actions = {
      recede() {
        scene01.classList.add("is-receding");
      },
      tick() {
        digit.classList.add("is-ticking");
        setTimeout((() => {
          digit.textContent = "3";
          digit.classList.remove("is-ticking");
        }), 180);
      }
    };
    const play = beat => {
      if (beat.sfx && sfx[beat.sfx]) sfx[beat.sfx].play(0);
      if (beat.haptic) haptic(beat.haptic);
      if (beat.do && actions[beat.do]) actions[beat.do]();
      if (beat.el) {
        const el = root.querySelector(`[data-beat="${beat.el}"]`);
        if (!el) return;
        el.style.setProperty("--in", `${beat.in || 800}ms`);
        el.classList.add("is-in");
      }
    };
    (async () => {
      await wait(this.silence);
      this.beats.forEach((beat => setTimeout((() => play(beat)), beat.at)));
      const last = Math.max(...this.beats.map((b => b.at)));
      await wait(last + 900);
      root.classList.add("is-complete");
      DVP.complete("02");
    })();
    const cont = root.querySelector("#continua");
    cont.addEventListener("click", (() => {
      window.scrollTo({
        top: window.innerHeight,
        behavior: "smooth"
      });
    }));
  }
});

function synthPaper(ctx, gain) {
  const t0 = ctx.currentTime;
  const len = Math.floor(ctx.sampleRate * .09);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 2600;
  bp.Q.value = .8;
  const g = ctx.createGain();
  g.gain.value = typeof gain === "number" ? gain : .016;
  src.connect(bp);
  bp.connect(g);
  g.connect(ctx.destination);
  src.start(t0);
  return () => {
    try {
      src.stop();
    } catch (e) {}
  };
}

function synthClick(ctx) {
  const t0 = ctx.currentTime;
  const osc = ctx.createOscillator();
  osc.type = "square";
  osc.frequency.setValueAtTime(1900, t0);
  osc.frequency.exponentialRampToValueAtTime(700, t0 + .02);
  const g = ctx.createGain();
  g.gain.setValueAtTime(1e-4, t0);
  g.gain.exponentialRampToValueAtTime(.02, t0 + .002);
  g.gain.exponentialRampToValueAtTime(1e-4, t0 + .03);
  osc.connect(g);
  g.connect(ctx.destination);
  osc.start(t0);
  osc.stop(t0 + .04);
  return () => {
    try {
      osc.stop();
    } catch (e) {}
  };
}