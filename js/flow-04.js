(function() {
  "use strict";
  const WHATSAPP_NUMBER = "5511986726696";
  window.addEventListener("load", (() => {
    const cta = document.getElementById("pitch-cta");
    if (!cta) return;
    cta.href = `https://wa.me/${WHATSAPP_NUMBER}`;
  }));
  const T = {
    furniture: .2,
    ask: .7,
    hire1: 2.2,
    hire2: 2.35,
    credit: 4,
    cta: 4.4,
    end: 5.4
  };
  FlowSection.reveals["04"] = section => {
    const q = s => section.querySelector(`[data-pitch="${s}"]`);
    const tl = gsap.timeline({
      defaults: {
        ease: "power3.out",
        duration: 1.1
      }
    });
    tl.to([ q("kicker"), q("issue"), q("rule") ].filter(Boolean), {
      opacity: 1,
      stagger: .08
    }, T.furniture);
    tl.fromTo(q("ask"), {
      opacity: 0,
      y: 8
    }, {
      opacity: 1,
      y: 0
    }, T.ask);
    tl.fromTo(q("hire1"), {
      opacity: 0,
      y: 16
    }, {
      opacity: 1,
      y: 0,
      duration: 1.7
    }, T.hire1);
    tl.fromTo(q("hire2"), {
      opacity: 0,
      y: 16
    }, {
      opacity: 1,
      y: 0,
      duration: 1.7
    }, T.hire2);
    tl.fromTo(q("credit"), {
      opacity: 0,
      y: 6
    }, {
      opacity: 1,
      y: 0
    }, T.credit);
    tl.fromTo(q("cta"), {
      opacity: 0,
      y: 6
    }, {
      opacity: 1,
      y: 0
    }, T.cta);
    tl.to(q("end"), {
      opacity: 1,
      duration: 1.6,
      ease: "power1.out"
    }, T.end);
    DVP.debug = Object.assign(DVP.debug || {}, {
      pitch: tl
    });
    return tl;
  };
})();