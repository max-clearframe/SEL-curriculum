/* ============================================================
   CLEARFRAME — SEL Curriculum Landing Page
   Scroll-driven canvas animation · GSAP + Lenis
   ============================================================ */

/* ── Constants ──────────────────────────────────────────────── */
const FRAME_COUNT = 121;
const FRAME_PATH  = (i) => `frames/frame_${String(i).padStart(4, '0')}.webp`;
const IMAGE_SCALE = 0.72;       // padded-cover scale — full book visible
const BG_SAMPLE_INTERVAL = 20;  // re-sample bg color every N frames

// Custom scroll-to-frame mapping (not linear)
const ANIM_START = 0.33;  // book starts opening at 33% scroll
const ANIM_END   = 0.47;  // book fully open at 47% scroll
const FADE_START = 0.78;  // canvas starts fading at 78%
const FADE_END   = 0.84;  // canvas fully hidden at 84%

/* ── State ───────────────────────────────────────────────────── */
let frames       = [];
let currentFrame = 0;
let bgColor      = '#f7f4ef';
let loaderHidden = false;

/* ── DOM refs ────────────────────────────────────────────────── */
const loader        = document.getElementById('loader');
const loaderFill    = document.querySelector('.loader-bar-fill');
const loaderPercent = document.querySelector('.loader-percent');
const canvas        = document.getElementById('canvas');
const ctx           = canvas.getContext('2d');
const canvasWrap    = document.getElementById('canvas-wrap');
const darkOverlay   = document.getElementById('dark-overlay');
const scrollContainer = document.getElementById('scroll-container');
const heroSection   = document.querySelector('.hero-standalone');
const marqueeWrap   = document.querySelector('.marquee-wrap');

/* ── Canvas sizing ───────────────────────────────────────────── */
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  canvas.width  = rect.width  * dpr;
  canvas.height = rect.height * dpr;
  ctx.scale(dpr, dpr);
  drawFrame(currentFrame);
}

window.addEventListener('resize', resizeCanvas);

/* ── BG color sampler ────────────────────────────────────────── */
function sampleBgColor(img) {
  const tmpCanvas = document.createElement('canvas');
  tmpCanvas.width  = img.naturalWidth;
  tmpCanvas.height = img.naturalHeight;
  const tmpCtx = tmpCanvas.getContext('2d');
  tmpCtx.drawImage(img, 0, 0);
  const px = tmpCtx.getImageData(4, 4, 1, 1).data;
  bgColor = `rgb(${px[0]},${px[1]},${px[2]})`;
}

/* ── Draw frame ──────────────────────────────────────────────── */
function drawFrame(index) {
  const img = frames[index];
  if (!img || !img.complete) return;

  const cw = canvas.width  / (window.devicePixelRatio || 1);
  const ch = canvas.height / (window.devicePixelRatio || 1);
  const iw = img.naturalWidth;
  const ih = img.naturalHeight;

  const scale = Math.max(cw / iw, ch / ih) * IMAGE_SCALE;
  const dw = iw * scale;
  const dh = ih * scale;
  const dx = (cw - dw) / 2;
  const dy = (ch - dh) / 2;

  ctx.fillStyle = bgColor;
  ctx.fillRect(0, 0, cw, ch);
  ctx.drawImage(img, dx, dy, dw, dh);
}

/* ── Frame index from scroll progress ───────────────────────── */
function getFrameIndex(progress) {
  if (progress <= ANIM_START) return 0;
  if (progress >= ANIM_END)   return FRAME_COUNT - 1;
  const t = (progress - ANIM_START) / (ANIM_END - ANIM_START);
  return Math.min(Math.floor(t * FRAME_COUNT), FRAME_COUNT - 1);
}

/* ── Canvas opacity from scroll progress ────────────────────── */
function getCanvasOpacity(progress) {
  if (progress < FADE_START) return 1;
  if (progress > FADE_END)   return 0;
  return 1 - (progress - FADE_START) / (FADE_END - FADE_START);
}

/* ── Two-phase frame loader ──────────────────────────────────── */
function loadFrames() {
  let loaded = 0;
  const FIRST_BATCH = 12;

  function updateLoader(n) {
    const pct = Math.round((n / FRAME_COUNT) * 100);
    loaderFill.style.width = pct + '%';
    loaderPercent.textContent = pct + '%';
  }

  // Phase 1: load first batch, then hide loader
  const phase1 = () => new Promise((resolve) => {
    let done1 = 0;
    for (let i = 1; i <= Math.min(FIRST_BATCH, FRAME_COUNT); i++) {
      const img = new Image();
      img.onload = img.onerror = () => {
        loaded++;
        done1++;
        updateLoader(loaded);
        if (i === 1 && img.complete) sampleBgColor(img);
        if (done1 === Math.min(FIRST_BATCH, FRAME_COUNT)) {
          resizeCanvas();
          drawFrame(0);
          hideLoader();
          resolve();
        }
      };
      img.src = FRAME_PATH(i);
      frames[i - 1] = img;
    }
  });

  // Phase 2: load remaining frames in background
  const phase2 = () => {
    for (let i = FIRST_BATCH + 1; i <= FRAME_COUNT; i++) {
      const img = new Image();
      const idx = i - 1;
      img.onload = img.onerror = () => {
        loaded++;
        updateLoader(loaded);
        if (idx % BG_SAMPLE_INTERVAL === 0 && img.complete) sampleBgColor(img);
      };
      img.src = FRAME_PATH(i);
      frames[idx] = img;
    }
  };

  phase1().then(phase2);
}

function hideLoader() {
  if (loaderHidden) return;
  loaderHidden = true;
  setTimeout(() => {
    loader.classList.add('hidden');
    initAnimations();
  }, 300);
}

/* ── Hero word-split entrance ────────────────────────────────── */
function animateHero() {
  const wordInners = document.querySelectorAll('.hero-heading .word-inner');
  const tagline    = document.querySelector('.hero-tagline');
  const indicator  = document.querySelector('.scroll-indicator');

  gsap.to(wordInners, {
    y: 0,
    duration: 1.0,
    ease: 'power3.out',
    stagger: 0.08,
    delay: 0.1
  });
  gsap.to(tagline, {
    opacity: 1, y: 0,
    duration: 0.9,
    ease: 'power2.out',
    delay: 0.5
  });
  gsap.to(indicator, {
    opacity: 1,
    duration: 0.8,
    ease: 'power2.out',
    delay: 1.0
  });
}

/* ── Section animation setup ─────────────────────────────────── */
function setupSectionAnimation(section) {
  const type    = section.dataset.animation;
  const persist = section.dataset.persist === 'true';
  const enter   = parseFloat(section.dataset.enter) / 100;
  const leave   = parseFloat(section.dataset.leave) / 100;
  const midpoint = ((enter + leave) / 2) * 1000; // in vh units

  // Position section at midpoint of its active range
  section.style.top = midpoint + 'vh';
  section.style.transform = 'translateY(-50%)';

  const children = Array.from(section.querySelectorAll(
    '.section-label, .section-heading, .section-body, .section-note, ' +
    '.cta-heading, .cta-subhead, .contact-form, .features-list, ' +
    '.audience-split, .stat'
  ));

  const tl = gsap.timeline({ paused: true });

  switch (type) {
    case 'fade-up':
      tl.from(children, { y: 50, opacity: 0, stagger: 0.12, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-left':
      tl.from(children, { x: -80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'slide-right':
      tl.from(children, { x: 80, opacity: 0, stagger: 0.14, duration: 0.9, ease: 'power3.out' });
      break;
    case 'scale-up':
      tl.from(children, { scale: 0.88, opacity: 0, stagger: 0.12, duration: 1.0, ease: 'power2.out' });
      break;
    case 'rotate-in':
      tl.from(children, { y: 40, rotation: 2, opacity: 0, stagger: 0.1, duration: 0.9, ease: 'power3.out' });
      break;
    case 'stagger-up':
      tl.from(children, { y: 60, opacity: 0, stagger: 0.15, duration: 0.8, ease: 'power3.out' });
      break;
    case 'clip-reveal':
      tl.from(children, {
        clipPath: 'inset(100% 0 0 0)', opacity: 0, stagger: 0.15,
        duration: 1.2, ease: 'power4.inOut'
      });
      break;
    default:
      tl.from(children, { opacity: 0, stagger: 0.1, duration: 0.8, ease: 'power2.out' });
  }

  return { tl, enter, leave, persist, section };
}

/* ── Counter animations ──────────────────────────────────────── */
function initCounters() {
  document.querySelectorAll('.stat-number').forEach(el => {
    const target     = parseFloat(el.dataset.value);
    const decimals   = parseInt(el.dataset.decimals || '0');
    const section    = el.closest('.scroll-section');
    const enterPct   = parseFloat(section.dataset.enter);

    // Trigger based on scroll container progress, not DOM position,
    // because sections are position:absolute and visible only via JS opacity
    gsap.from(el, {
      textContent: 0,
      duration: 2,
      ease: 'power1.out',
      snap: { textContent: decimals === 0 ? 1 : 0.01 },
      scrollTrigger: {
        trigger: scrollContainer,
        start: `${enterPct}% top`,
        toggleActions: 'play none none reverse'
      }
    });
  });
}

/* ── Marquee ─────────────────────────────────────────────────── */
function initMarquee() {
  if (!marqueeWrap) return;
  const marqEnter = parseFloat(marqueeWrap.dataset.enter) / 100;
  const marqLeave = parseFloat(marqueeWrap.dataset.leave) / 100;
  const fadeRange = 0.025;

  // Animate marquee only during its active scroll window
  gsap.fromTo(marqueeWrap.querySelector('.marquee-text'),
    { xPercent: 5 },
    {
      xPercent: -55,
      ease: 'none',
      scrollTrigger: {
        trigger: scrollContainer,
        start: `${marqEnter * 100}% top`,
        end: `${marqLeave * 100}% top`,
        scrub: true
      }
    }
  );

  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p >= marqEnter - fadeRange && p <= marqEnter) {
        opacity = (p - (marqEnter - fadeRange)) / fadeRange;
      } else if (p > marqEnter && p < marqLeave) {
        opacity = 1;
      } else if (p >= marqLeave && p <= marqLeave + fadeRange) {
        opacity = 1 - (p - marqLeave) / fadeRange;
      }
      marqueeWrap.style.opacity = opacity;
    }
  });
}

/* ── Dark overlay ────────────────────────────────────────────── */
function initDarkOverlay(enter, leave) {
  const fadeRange = 0.035;
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      let opacity = 0;
      if (p >= enter - fadeRange && p <= enter) {
        opacity = (p - (enter - fadeRange)) / fadeRange;
      } else if (p > enter && p < leave) {
        opacity = 0.9;
      } else if (p >= leave && p <= leave + fadeRange) {
        opacity = 0.9 * (1 - (p - leave) / fadeRange);
      }
      darkOverlay.style.opacity = opacity;
    }
  });
}

/* ── Circle-wipe hero reveal ─────────────────────────────────── */
function initHeroTransition() {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;
      // Hero fades out fast as scroll starts
      heroSection.style.opacity = Math.max(0, 1 - p * 20);
      // Canvas reveals via expanding circle from right-center
      const wipeProgress = Math.min(1, Math.max(0, (p - 0.005) / 0.07));
      const radius = wipeProgress * 100;
      canvasWrap.style.clipPath = `circle(${radius}% at 79% 50%)`;
    }
  });
}

/* ── Main scroll driver ──────────────────────────────────────── */
function initScrollDriver(sectionData) {
  ScrollTrigger.create({
    trigger: scrollContainer,
    start: 'top top',
    end: 'bottom bottom',
    scrub: true,
    onUpdate: (self) => {
      const p = self.progress;

      // Frame rendering
      const idx = getFrameIndex(p);
      if (idx !== currentFrame) {
        currentFrame = idx;
        requestAnimationFrame(() => drawFrame(currentFrame));
      }

      // Canvas fade-out for CTA
      canvasWrap.style.opacity = getCanvasOpacity(p);

      // Section visibility
      sectionData.forEach(({ tl, enter, leave, persist, section }) => {
        const visible = p >= enter && p <= leave;
        const pastLeave = p > leave;

        if (visible) {
          section.style.opacity = 1;
          section.classList.add('visible');
          if (tl.progress() === 0) tl.play();
        } else if (pastLeave && persist) {
          section.style.opacity = 1;
          section.classList.add('visible');
        } else if (!visible && !persist) {
          section.style.opacity = 0;
          section.classList.remove('visible');
          if (p < enter) tl.reverse();
        }
      });
    }
  });
}

/* ── Init all animations ─────────────────────────────────────── */
function initAnimations() {
  // Lenis smooth scroll
  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true
  });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Hero entrance
  animateHero();

  // Setup all scroll sections
  const sections = document.querySelectorAll('.scroll-section[data-enter]');
  const sectionData = Array.from(sections).map(setupSectionAnimation);

  // Find stats section for dark overlay bounds
  const statsSection = document.querySelector('.section-stats');
  if (statsSection) {
    initDarkOverlay(
      parseFloat(statsSection.dataset.enter) / 100,
      parseFloat(statsSection.dataset.leave) / 100
    );
  }

  // Counters, marquee, hero transition, main scroll
  initCounters();
  initMarquee();
  initHeroTransition();
  initScrollDriver(sectionData);

  // Initial canvas draw
  resizeCanvas();
}

/* ── Boot ────────────────────────────────────────────────────── */
loadFrames();
