class FlowSection {
  constructor(el, index, art) {
    this.el = el;
    this.index = index;
    this.art = art;
    this.inner = el.querySelector(".flow-art-container");
    this.reveal = el.querySelectorAll(".fl");
    this.placed = false;
    this.paperPlayed = false;
    this.lastP = 0;
  }
  mount(isLast) {
    const {reduced: reduced} = this.art.opts;
    const rotation = ScrollTrigger.isTouch ? 0 : this.art.opts.rotation;
    gsap.set(this.el, {
      zIndex: this.index + 1
    });
    if (!reduced && rotation) {
      gsap.set(this.inner, {
        rotation: rotation,
        transformOrigin: "bottom left"
      });
      this.tween = gsap.to(this.inner, {
        rotation: 0,
        ease: "none",
        scrollTrigger: {
          trigger: this.el,
          start: "top bottom",
          end: "top 55%",
          scrub: ScrollTrigger.isTouch ? true : parseFloat(this.el.dataset.flowScrub) || .5
        }
      });
    }
    const touch = ScrollTrigger.isTouch;
    ScrollTrigger.create({
      trigger: this.el,
      start: "top bottom",
      end: "top top",
      onUpdate: st => this.update(st.progress),
      snap: touch ? false : {
        snapTo: [ 0, 1 ],
        directional: false,
        duration: {
          min: .3,
          max: .9
        },
        delay: .1,
        ease: "power2.inOut"
      }
    });
  }
  update(p) {
    const id = this.el.dataset.flowId;
    const silent = this.el.hasAttribute("data-flow-silent");
    if (!this.paperPlayed && p > .2) {
      this.paperPlayed = true;
      if (!silent) this.art.paper();
    }
    const hook = FlowSection.progress[id];
    if (hook) hook(this.el, p);
    if (!this.placed && p > .97) this.place();
    if (ScrollTrigger.isTouch && !this.art.turning) {
      const dir = p - this.lastP;
      this.lastP = p;
      if (p > .1 && p < .97 && dir > 0) this.turnTo(1); else if (p < .9 && p > .03 && dir < 0) this.turnTo(0);
    }
  }
  turnTo(target) {
    const top = this.el.offsetTop;
    const y = target === 1 ? top : top - window.innerHeight;
    const o = {
      y: window.scrollY
    };
    if (Math.abs(o.y - y) < 2) return;
    this.art.turning = true;
    document.documentElement.classList.add("is-turning");
    gsap.to(o, {
      y: y,
      duration: 1.25,
      ease: "power2.inOut",
      onUpdate: () => window.scrollTo(0, o.y),
      onComplete: () => {
        window.scrollTo(0, y);
        ScrollTrigger.update();
        this.lastP = target;
        if (target === 1 && !this.placed) this.place();
        document.documentElement.classList.remove("is-turning");
        this.art.turning = false;
      }
    });
  }
  place() {
    this.placed = true;
    this.el.classList.add("is-placed");
    const custom = FlowSection.reveals[this.el.dataset.flowId];
    if (custom) return custom(this.el, this);
    gsap.to(this.reveal, {
      opacity: 1,
      y: 0,
      duration: 1.1,
      stagger: .11,
      ease: "power3.out",
      clearProps: "transform"
    });
  }
}

FlowSection.reveals = {};

FlowSection.progress = {};

class FlowArt {
  constructor(root, opts = {}) {
    this.root = root;
    this.opts = Object.assign({
      rotation: 7,
      reduced: DVP.prefersReducedMotion
    }, opts);
    this.sections = [ ...root.querySelectorAll("[data-flow-section]") ].map(((el, k) => new FlowSection(el, k, this)));
    this._paper = DVP.Audio.create(null, typeof synthPaper === "function" ? ctx => synthPaper(ctx, .009) : null);
  }
  paper() {
    this._paper.play(0);
  }
  init() {
    if (!window.gsap || !window.ScrollTrigger) return;
    gsap.registerPlugin(ScrollTrigger);
    ScrollTrigger.config({
      ignoreMobileResize: true
    });
    if (ScrollTrigger.isTouch) document.documentElement.classList.add("is-touch");
    this.root.setAttribute("aria-hidden", "false");
    document.documentElement.classList.add("is-scrollable");
    window.scrollTo(0, 0);
    const last = this.sections.length - 1;
    this.sections.forEach(((s, k) => s.mount(k === last)));
    ScrollTrigger.refresh();
  }
}

window.FlowArt = FlowArt;

window.FlowSection = FlowSection;

DVP.register("flow", {
  after: "02",
  init(root) {
    new FlowArt(root).init();
  }
});