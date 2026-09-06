window.DVP = function() {
  "use strict";
  const wait = ms => new Promise((resolve => setTimeout(resolve, ms)));
  const prefersReducedMotion = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const AudioCore = {
    ctx: null,
    blocked: false,
    _unlockers: [],
    context() {
      if (!this.ctx) {
        const Ctx = window.AudioContext || window.webkitAudioContext;
        if (Ctx) this.ctx = new Ctx;
      }
      return this.ctx;
    },
    async unlock() {
      this.prime();
      const ctx = this.context();
      if (ctx && ctx.state === "suspended") {
        try {
          await Promise.race([ ctx.resume(), wait(350) ]);
        } catch (e) {}
      }
      const wasBlocked = this.blocked;
      this.blocked = false;
      if (wasBlocked) this._unlockers.splice(0).forEach((fn => fn()));
    },
    _primed: false,
    prime() {
      if (this._primed) return;
      this._primed = true;
      document.querySelectorAll("audio").forEach((el => {
        el.muted = true;
        const settle = () => {
          if (!el.muted) return;
          try {
            el.pause();
            el.currentTime = 0;
          } catch (e) {}
          el.muted = false;
        };
        const p = el.play();
        if (p && p.then) p.then(settle).catch(settle); else settle();
      }));
    },
    onUnlock(fn) {
      this._unlockers.push(fn);
    },
    create(el, synth) {
      const sound = {
        el: el,
        missing: !el,
        _stopSynth: null,
        async play(offset = 0) {
          if (!this.missing) {
            try {
              el.muted = false;
              el.currentTime = offset;
              await el.play();
              return true;
            } catch (err) {
              if (err && err.name === "NotAllowedError") {
                AudioCore.blocked = true;
                return false;
              }
              if (err && err.name === "AbortError") return false;
              this.missing = true;
            }
          }
          const ctx = AudioCore.context();
          if (!ctx) return false;
          if (ctx.state === "suspended") {
            try {
              await Promise.race([ ctx.resume(), wait(350) ]);
            } catch (e) {}
          }
          if (ctx.state !== "running") {
            AudioCore.blocked = true;
            return false;
          }
          this.stop();
          this._stopSynth = synth ? synth(ctx, offset) : null;
          return true;
        },
        stop() {
          if (el && !this.missing) {
            try {
              el.pause();
              el.currentTime = 0;
            } catch (e) {}
          }
          if (this._stopSynth) {
            this._stopSynth();
            this._stopSynth = null;
          }
        }
      };
      if (el) {
        el.addEventListener("error", (() => {
          sound.missing = true;
        }), {
          once: true
        });
      }
      return sound;
    }
  };
  function initCursor() {
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const el = document.getElementById("cursor");
    if (!fine || !el) return;
    document.body.classList.add("has-cursor");
    let x = -100, y = -100, raf = null;
    const render = () => {
      el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      raf = null;
    };
    window.addEventListener("pointermove", (e => {
      x = e.clientX;
      y = e.clientY;
      el.classList.add("is-visible");
      if (!raf) raf = requestAnimationFrame(render);
    }), {
      passive: true
    });
    document.addEventListener("mouseleave", (() => el.classList.remove("is-visible")));
    document.addEventListener("mouseenter", (() => el.classList.add("is-visible")));
    document.addEventListener("pointerover", (e => {
      const t = e.target.closest && e.target.closest('[data-cursor="hover"]');
      el.classList.toggle("is-hover", !!t);
    }));
  }
  const scenes = {};
  function register(id, def) {
    scenes[id] = def;
  }
  function start(id) {
    const def = scenes[id];
    const root = document.querySelector(`[data-scene="${id}"]`);
    if (def && root) def.init(root);
  }
  function complete(id) {
    document.dispatchEvent(new CustomEvent("dvp:scene-complete", {
      detail: {
        id: id
      }
    }));
    Object.keys(scenes).forEach((key => {
      if (scenes[key].after === id) start(key);
    }));
  }
  window.addEventListener("load", (() => {
    initCursor();
    start("01");
  }));
  return {
    wait: wait,
    prefersReducedMotion: prefersReducedMotion,
    Audio: AudioCore,
    register: register,
    start: start,
    complete: complete
  };
}();