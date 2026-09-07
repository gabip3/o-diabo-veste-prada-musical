(function() {
  "use strict";
  const photo = document.getElementById("miranda-photo");
  const img = photo && photo.querySelector(".mp__img");
  if (img) {
    const usePlaceholder = () => photo.classList.add("has-placeholder");
    DVP.loadImageResilient(img, usePlaceholder);
  }
  const T = {
    furniture: .15,
    adorada: .9,
    reverenc: 1.8,
    acima: 2.7,
    temida: 3.7,
    dot: 4.3,
    copy: 4.9
  };
  FlowSection.progress["02"] = (section, p) => {
    if (section.classList.contains("is-placed")) return;
    const photo = section.querySelector(".mp__photo");
    gsap.set(photo, {
      y: 28 * (1 - p)
    });
  };
  FlowSection.reveals["02"] = section => {
    const q = s => section.querySelector(s);
    const call = n => section.querySelector(`[data-call="${n}"]`);
    const tl = gsap.timeline({
      defaults: {
        ease: "power3.out",
        duration: 1.1
      }
    });
    tl.to(section.querySelector(".mp__photo"), {
      y: 0,
      duration: 1.4,
      ease: "power2.out"
    }, 0);
    tl.to(section.querySelectorAll(".fl"), {
      opacity: 1,
      duration: 1.3,
      stagger: .08
    }, T.furniture);
    tl.to(call(1), {
      opacity: 1,
      duration: 1.2
    }, T.adorada);
    tl.to(call(2), {
      opacity: 1,
      duration: 1.2
    }, T.reverenc);
    tl.to(call(3), {
      opacity: 1,
      duration: 1
    }, T.acima);
    tl.to(call(4), {
      opacity: 1,
      duration: 1.6,
      ease: "power2.out"
    }, T.temida);
    tl.to(q(".mp__dot"), {
      opacity: 1,
      duration: .6,
      ease: "power1.out"
    }, T.dot);
    tl.to(call(5), {
      opacity: 1,
      duration: 1.3
    }, T.copy);
    DVP.debug = Object.assign(DVP.debug || {}, {
      miranda: tl
    });
    return tl;
  };
})();