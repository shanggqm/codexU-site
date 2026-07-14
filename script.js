const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

const revealObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        revealObserver.unobserve(entry.target);
      }
    });
  },
  { threshold: 0.14 }
);

document.querySelectorAll(".reveal:not(.is-visible)").forEach((element) => revealObserver.observe(element));

const header = document.querySelector("[data-header]");
let lastScrollY = 0;
let scrollTicking = false;

function handleScrollEffects() {
  const scrollY = window.scrollY;
  if (header) {
    header.style.transform = scrollY > lastScrollY && scrollY > 180 ? "translateY(-90px)" : "translateY(0)";
  }
  lastScrollY = Math.max(scrollY, 0);

  if (!reduceMotion) {
    document.querySelectorAll("[data-parallax]").forEach((element) => {
      const speed = Number(element.dataset.parallax || 0);
      element.style.translate = `0 ${scrollY * speed}px`;
    });
  }

  updateStory(scrollY);
  scrollTicking = false;
}

window.addEventListener(
  "scroll",
  () => {
    if (!scrollTicking) {
      requestAnimationFrame(handleScrollEffects);
      scrollTicking = true;
    }
  },
  { passive: true }
);

const story = document.querySelector(".story");
const storySteps = [...document.querySelectorAll(".story-step")];
const screens = [...document.querySelectorAll("[data-screen]")];
const screenButtons = [...document.querySelectorAll("[data-screen-button]")];
const trackProgress = document.querySelector("[data-track-progress]");
const windowTitle = document.querySelector("[data-window-title]");
const titles = ["codexU · 额度概览", "codexU · 用量趋势", "codexU · 今日任务"];
let activeStoryStep = 0;

function setStoryStep(index) {
  const safeIndex = Math.max(0, Math.min(index, storySteps.length - 1));
  if (safeIndex === activeStoryStep && screens[safeIndex]?.classList.contains("is-active")) return;
  activeStoryStep = safeIndex;
  storySteps.forEach((step, i) => step.classList.toggle("is-active", i === safeIndex));
  screens.forEach((screen, i) => screen.classList.toggle("is-active", i === safeIndex));
  screenButtons.forEach((button, i) => button.classList.toggle("is-active", i === safeIndex));
  if (windowTitle) windowTitle.textContent = titles[safeIndex];
}

function updateStory(scrollY = window.scrollY) {
  if (!story) return;
  const rect = story.getBoundingClientRect();
  const range = Math.max(story.offsetHeight - window.innerHeight, 1);
  const progress = Math.max(0, Math.min(1, (scrollY - story.offsetTop) / range));
  story.classList.toggle("in-view", rect.top <= 0 && rect.bottom >= window.innerHeight);
  if (trackProgress) trackProgress.style.height = `${progress * 100}%`;
  setStoryStep(Math.min(2, Math.floor(progress * 3)));
}

screenButtons.forEach((button) => {
  button.addEventListener("click", () => setStoryStep(Number(button.dataset.screenButton)));
});

const tiltCard = document.querySelector("[data-tilt]");
if (tiltCard && !reduceMotion && window.matchMedia("(pointer: fine)").matches) {
  tiltCard.addEventListener("pointermove", (event) => {
    const rect = tiltCard.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    tiltCard.style.transform = `rotateY(${x * 4}deg) rotateX(${-y * 4}deg)`;
  });
  tiltCard.addEventListener("pointerleave", () => {
    tiltCard.style.transform = "rotateY(0) rotateX(0)";
  });
}

function setupCanvas(canvas, drawFrame) {
  if (!canvas) return () => {};
  const context = canvas.getContext("2d");
  let width = 0;
  let height = 0;
  let dpr = 1;
  let visible = true;
  let frame = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, rect.width);
    height = Math.max(1, rect.height);
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    context.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function draw(time) {
    if (visible) drawFrame(context, width, height, time);
    frame = requestAnimationFrame(draw);
  }

  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting && !document.hidden;
  });
  observer.observe(canvas);
  window.addEventListener("resize", resize, { passive: true });
  document.addEventListener("visibilitychange", () => { visible = !document.hidden; });
  resize();
  if (!reduceMotion) frame = requestAnimationFrame(draw);
  else drawFrame(context, width, height, 0);

  return () => {
    cancelAnimationFrame(frame);
    observer.disconnect();
  };
}

const ambientParticles = Array.from({ length: 52 }, () => ({
  x: Math.random(),
  y: Math.random(),
  radius: Math.random() * 1.4 + 0.4,
  drift: Math.random() * 0.35 + 0.08,
  phase: Math.random() * Math.PI * 2,
  blue: Math.random() > 0.4,
}));

setupCanvas(document.querySelector("#ambient-canvas"), (ctx, width, height, time) => {
  ctx.clearRect(0, 0, width, height);
  ambientParticles.forEach((particle) => {
    const x = particle.x * width + Math.sin(time * 0.00025 * particle.drift + particle.phase) * 36;
    const y = particle.y * height + Math.cos(time * 0.0002 * particle.drift + particle.phase) * 25;
    ctx.beginPath();
    ctx.fillStyle = particle.blue ? "rgba(64,125,255,.26)" : "rgba(161,89,245,.22)";
    ctx.arc(x, y, particle.radius, 0, Math.PI * 2);
    ctx.fill();
  });
});

// Mirrors CodexU's native QuotaRingGeometry and DualQuotaRingParticles values.
const nativeParticleStyles = [
  [0.04, 0.095, -2.8, 1.3, 0.52],
  [0.24, 0.122, 2.5, 2.2, 0.78],
  [0.45, 0.076, -0.4, 2.9, 0.9],
  [0.66, 0.274, 3.0, 1.2, 0.46],
  [0.86, 0.104, -2.0, 1.8, 0.66],
  [0.14, 0.083, 0.9, 2.5, 0.82],
  [0.56, 0.116, -3.1, 1.4, 0.5],
  [0.34, 0.068, 1.7, 0.9, 0.38],
  [0.74, 0.154, -1.2, 2.0, 0.72],
  [0.94, 0.111, 2.1, 1.1, 0.58],
  [0.51, 0.126, -2.4, 1.7, 0.64],
  [0.09, 0.142, 1.4, 1.5, 0.62],
  [0.19, 0.091, -1.8, 1.0, 0.44],
  [0.29, 0.182, 2.7, 1.8, 0.7],
  [0.62, 0.073, -0.8, 2.3, 0.76],
  [0.81, 0.133, -2.6, 1.2, 0.54],
  [0.99, 0.108, 1.9, 1.6, 0.6],
].map(([phase, speed, radialOffset, diameter, opacity]) => ({ phase, speed, radialOffset, diameter, opacity }));

function particleOpacity(cycle, maximum) {
  if (cycle < 0.08) return maximum * (cycle / 0.08);
  if (cycle > 0.88) return maximum * ((1 - cycle) / 0.12);
  return maximum;
}

setupCanvas(document.querySelector("#ring-canvas"), (ctx, width, height, time) => {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const geometryScale = width / 145;
  const outer = 64.5 * geometryScale;
  const inner = 45.5 * geometryScale;
  const lineWidth = 16 * geometryScale;
  const startAngle = -Math.PI / 2;
  ctx.lineCap = "round";

  const lanes = [
    { radius: outer, progress: 0.93, start: "#7BA0FF", end: "#2866F7", count: 17, phaseOffset: 0 },
    { radius: inner, progress: 0.73, start: "#DAA3FA", end: "#8B6DFF", count: 12, phaseOffset: 0.31 },
  ];

  lanes.forEach((lane) => {
    ctx.beginPath();
    ctx.strokeStyle = "rgba(29,29,31,.10)";
    ctx.lineWidth = lineWidth;
    ctx.arc(cx, cy, lane.radius, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    const gradient = ctx.createConicGradient(startAngle, cx, cy);
    gradient.addColorStop(0, lane.start);
    gradient.addColorStop(lane.progress, lane.end);
    gradient.addColorStop(1, lane.end);
    ctx.strokeStyle = gradient;
    ctx.arc(cx, cy, lane.radius, startAngle, startAngle + Math.PI * 2 * lane.progress);
    ctx.stroke();
  });

  ctx.beginPath();
  ctx.fillStyle = "rgba(29,29,31,.10)";
  ctx.arc(cx, cy, 36 * geometryScale, 0, Math.PI * 2);
  ctx.fill();

  const timeSeconds = time / 1000;
  lanes.forEach((lane) => {
    const speedFactor = 0.45 + lane.progress * 1.1;
    const styles = nativeParticleStyles.slice(0, lane.count);
    const fastCount = Math.max(1, Math.round(styles.length * 0.3));
    const fastIndexes = new Set(
      styles
        .map((style, index) => ({ index, velocity: lane.progress / Math.max(1.6, lane.progress / (style.speed * speedFactor)) }))
        .sort((a, b) => b.velocity - a.velocity)
        .slice(0, fastCount)
        .map((item) => item.index)
    );

    styles.forEach((style, index) => {
      const duration = Math.max(1.6, lane.progress / (style.speed * speedFactor));
      const cycle = (timeSeconds / duration + style.phase + lane.phaseOffset) % 1;
      const radius = lane.radius + style.radialOffset * geometryScale;

      function drawParticle(cyclePosition, diameterScale = 1, opacityScale = 1) {
        const progress = lane.progress * (1 - cyclePosition);
        const angle = startAngle + progress * Math.PI * 2;
        const x = cx + Math.cos(angle) * radius;
        const y = cy + Math.sin(angle) * radius;
        const alpha = particleOpacity(cyclePosition, style.opacity) * opacityScale;
        ctx.beginPath();
        ctx.fillStyle = `rgba(255,255,255,${alpha})`;
        ctx.arc(x, y, style.diameter * geometryScale * diameterScale / 2, 0, Math.PI * 2);
        ctx.fill();
      }

      if (fastIndexes.has(index)) {
        [[0.135, 0.4, 0.12], [0.09, 0.58, 0.24], [0.045, 0.78, 0.42]].forEach(([lag, size, opacity]) => {
          drawParticle((cycle - lag / duration + 1) % 1, size, opacity);
        });
      }
      drawParticle(cycle);
    });
  });
});

const privacyParticles = Array.from({ length: 70 }, () => ({
  angle: Math.random() * Math.PI * 2,
  distance: Math.random(),
  speed: Math.random() * 0.00016 + 0.00003,
  size: Math.random() * 1.3 + 0.3,
  alpha: Math.random() * 0.5 + 0.12,
}));

setupCanvas(document.querySelector("#privacy-canvas"), (ctx, width, height, time) => {
  ctx.clearRect(0, 0, width, height);
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(width, height) * 0.43;
  const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  glow.addColorStop(0, "rgba(92,75,248,.28)");
  glow.addColorStop(0.42, "rgba(110,71,213,.12)");
  glow.addColorStop(1, "rgba(7,7,11,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, width, height);

  privacyParticles.forEach((particle) => {
    const angle = particle.angle + time * particle.speed;
    const r = 60 + particle.distance * radius;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * 0.68;
    ctx.beginPath();
    ctx.fillStyle = `rgba(${particle.distance > .6 ? "112,148,255" : "176,111,255"},${particle.alpha})`;
    ctx.arc(x, y, particle.size, 0, Math.PI * 2);
    ctx.fill();
  });
});

handleScrollEffects();
