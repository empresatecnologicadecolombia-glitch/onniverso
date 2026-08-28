const waNumber = "573228760268";
document.documentElement.classList.add("js");

function createHeroBackdrop(root, interval) {
  const items = [...root.querySelectorAll("[data-hero-slide]")];
  if (!items.length) return;

  const dots = root.querySelector("[data-hero-dots]");
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches ?? false;
  let index = 0;
  let timer;
  let paused = false;
  let pointerStartX = null;

  const go = (nextIndex) => {
    index = (nextIndex + items.length) % items.length;
    items.forEach((item, itemIndex) => {
      const active = itemIndex === index;
      item.classList.toggle("is-active", active);
      item.setAttribute("aria-hidden", String(!active));
    });
    if (dots) {
      [...dots.children].forEach((dot, dotIndex) => {
        const active = dotIndex === index;
        dot.classList.toggle("is-active", active);
        dot.setAttribute("aria-current", active ? "true" : "false");
      });
    }
  };

  const restart = () => {
    window.clearInterval(timer);
    if (!reducedMotion && !paused) {
      timer = window.setInterval(() => go(index + 1), interval);
    }
  };

  const pause = () => {
    paused = true;
    window.clearInterval(timer);
  };

  const resume = () => {
    paused = false;
    restart();
  };

  if (dots) {
    dots.innerHTML = "";
    items.forEach((_, itemIndex) => {
      const dot = document.createElement("button");
      dot.type = "button";
      dot.setAttribute("aria-label", `Mostrar escena ${itemIndex + 1}`);
      dot.addEventListener("click", () => {
        go(itemIndex);
        restart();
      });
      dots.appendChild(dot);
    });
  }

  root.querySelector("[data-hero-prev]")?.addEventListener("click", () => {
    go(index - 1);
    restart();
  });
  root.querySelector("[data-hero-next]")?.addEventListener("click", () => {
    go(index + 1);
    restart();
  });
  root.addEventListener("mouseenter", pause);
  root.addEventListener("mouseleave", resume);
  root.addEventListener("focusin", pause);
  root.addEventListener("focusout", (event) => {
    if (!root.contains(event.relatedTarget)) resume();
  });
  root.addEventListener("pointerdown", (event) => {
    pointerStartX = event.clientX;
  });
  root.addEventListener("pointerup", (event) => {
    if (pointerStartX === null) return;
    const distance = event.clientX - pointerStartX;
    if (Math.abs(distance) > 44) {
      go(index + (distance < 0 ? 1 : -1));
      restart();
    }
    pointerStartX = null;
  });
  root.addEventListener("pointercancel", () => {
    pointerStartX = null;
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) pause();
    else resume();
  });

  go(0);
  restart();
}

function createHeroCarousel(root, interval) {
  const slides = root.querySelector(".slides");
  const items = [...slides.children];
  const total = items.length;
  let index = 0;
  const dots = root.querySelector(".dots");
  if (dots) {
    dots.innerHTML = "";
    items.forEach((_, i) => {
      const b = document.createElement("button");
      b.setAttribute("aria-label", `Ir a diapositiva ${i + 1}`);
      b.addEventListener("click", () => go(i));
      dots.appendChild(b);
    });
  }
  function go(i) {
    index = (i + total) % total;
    slides.style.transform = `translateX(-${index * 100}%)`;
    if (dots) {
      [...dots.children].forEach((d, n) => d.classList.toggle("active", n === index));
    }
  }
  root.querySelector(".prev")?.addEventListener("click", () => go(index - 1));
  root.querySelector(".next")?.addEventListener("click", () => go(index + 1));
  go(0);
  setInterval(() => go(index + 1), interval);
}

function createStripCarousel(root, interval) {
  const track = root.querySelector(".track");
  const items = [...track.children];
  const total = items.length;
  let index = 0;
  const dots = root.querySelector(".dots");

  function visibleCount() {
    if (window.innerWidth > 980) return 4;
    if (window.innerWidth > 640) return 2;
    return 1;
  }

  function go(i) {
    const visible = visibleCount();
    const max = Math.max(0, total - visible);
    index = i;
    if (index < 0) index = max;
    if (index > max) index = 0;
    const style = getComputedStyle(track);
    const gap = parseFloat(style.gap) || 14;
    const width = items[0].getBoundingClientRect().width + gap;
    track.style.transform = `translateX(-${index * width}px)`;
    if (dots) {
      [...dots.children].forEach((d, n) => d.classList.toggle("active", n === index));
    }
  }

  if (dots) {
    dots.innerHTML = "";
    items.forEach((_, i) => {
      const b = document.createElement("button");
      b.addEventListener("click", () => go(i));
      dots.appendChild(b);
    });
  }

  root.querySelector(".prev")?.addEventListener("click", () => go(index - 1));
  root.querySelector(".next")?.addEventListener("click", () => go(index + 1));
  window.addEventListener("resize", () => go(index));
  go(0);
  setInterval(() => go(index + 1), interval);
}

document.querySelectorAll("[data-carousel]").forEach((el) => {
  const ms = Number(el.dataset.interval || 4500);
  if (el.querySelector(".slides")) createHeroCarousel(el, ms);
  else createStripCarousel(el, ms);
});

const heroBackdrop = document.querySelector("[data-hero-backdrop]");
if (heroBackdrop) {
  createHeroBackdrop(heroBackdrop, Number(heroBackdrop.dataset.interval || 6200));
}

const revealItems = document.querySelectorAll("[data-reveal]");
if ("IntersectionObserver" in window) {
  const revealObserver = new IntersectionObserver(
    (entries, observer) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    },
    { threshold: 0.14 },
  );
  revealItems.forEach((item) => revealObserver.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

document.querySelector(".menu-toggle")?.addEventListener("click", () => {
  document.querySelector(".menu")?.classList.toggle("open");
});

document.getElementById("cotizar")?.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(e.target).entries());
  const msg = `Hola, soy ${data.nombre}. Quiero cotizar: ${data.interes}. ${data.ciudad ? "Ciudad: " + data.ciudad + ". " : ""}${data.mensaje || ""}`;
  window.open(`https://wa.me/${waNumber}?text=${encodeURIComponent(msg)}`, "_blank");
});
