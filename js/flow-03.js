(function() {
  "use strict";
  const logo = document.getElementById("cover-logo");
  const img = logo && logo.querySelector(".cv__logo-img");
  if (img) {
    const usePlaceholder = () => logo.classList.add("has-placeholder");
    DVP.loadImageResilient(img, usePlaceholder);
  }
  const T = {
    breath: 1,
    logo: 1,
    edition: 3.4,
    meta: 3.9
  };
  FlowSection.reveals["03"] = section => {
    const logo = section.querySelector(".cv__logo");
    const tl = gsap.timeline({
      defaults: {
        ease: "power2.out"
      }
    });
    tl.fromTo(logo, {
      opacity: 0,
      scale: .965,
      y: 0,
      xPercent: -50,
      yPercent: -50
    }, {
      opacity: 1,
      scale: 1,
      y: 0,
      xPercent: -50,
      yPercent: -50,
      duration: 1.9,
      ease: "power2.out"
    }, T.breath + T.logo - 1);
    tl.to(section.querySelector(".cv__edition"), {
      opacity: 1,
      duration: 1.2
    }, T.edition);
    tl.to(section.querySelectorAll(".cv__meta"), {
      opacity: 1,
      duration: 1.2,
      stagger: .2
    }, T.meta);
    DVP.debug = Object.assign(DVP.debug || {}, {
      cover: tl
    });
    return tl;
  };
})();