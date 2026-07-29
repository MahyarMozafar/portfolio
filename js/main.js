gsap.registerPlugin(ScrollTrigger);

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------- Smooth scroll (Lenis), driven by GSAP's ticker ---------- */
const lenis = new Lenis({ duration: prefersReducedMotion ? 0 : 1.1 });
gsap.ticker.add((time) => lenis.raf(time * 1000));
gsap.ticker.lagSmoothing(0);
lenis.on('scroll', ScrollTrigger.update);

/* smooth in-page anchor links */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      /* Close first: this restarts Lenis, which scrollTo needs in order to run. */
      setMenu(false);
      lenis.scrollTo(target);
    }
  });
});

/* ---------- Nav ---------- */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navMenu = document.getElementById('navMenu');
const menuRows = navMenu ? navMenu.querySelectorAll('a, .nav__note') : [];

function menuIsOpen() {
  return document.body.classList.contains('menu-open');
}

function setMenu(open) {
  document.body.classList.toggle('menu-open', open);
  if (navToggle) {
    navToggle.setAttribute('aria-expanded', String(open));
    navToggle.setAttribute('aria-label', open ? 'بستن منو' : 'باز کردن منو');
  }
  /* The nav may have been auto-hidden by a previous scroll down — make sure
     the close button is on screen whenever the menu is open. */
  if (open) nav.classList.remove('nav--hidden');
  if (open) lenis.stop(); else lenis.start();

  /* Rows arrive one after another once the panel has slid in. */
  if (open && menuRows.length && !prefersReducedMotion) {
    gsap.fromTo(
      menuRows,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out', delay: 0.28 }
    );
  }
}

if (navToggle) {
  navToggle.addEventListener('click', () => setMenu(!menuIsOpen()));
}

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuIsOpen()) setMenu(false);
});

/* Rotating a phone into landscape can cross the breakpoint while the panel is
   open, leaving a stuck overlay and a locked scroll. */
window.matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
  if (e.matches && menuIsOpen()) setMenu(false);
});

/* hide on scroll down, show on scroll up */
let lastScroll = 0;
lenis.on('scroll', ({ scroll }) => {
  if (menuIsOpen()) return;
  if (scroll > lastScroll && scroll > 120) {
    nav.classList.add('nav--hidden');
  } else {
    nav.classList.remove('nav--hidden');
  }
  lastScroll = scroll;
});

/* ---------- Hero load-in (held until the preloader lifts) ---------- */
const heroIntro = gsap.timeline({ paused: true, defaults: { duration: 1.4, ease: 'expo.out' } })
  .from('.hero__label', { opacity: 0, y: 16 }, 0.15)
  .from('.hero__name', { opacity: 0, y: 20 }, 0.3)
  .from('.hero__tagline', { opacity: 0, y: 16 }, 0.45)
  .from('.hero__meta', { opacity: 0, y: 12 }, 0.7)
  .from('.hero__scroll', { opacity: 0, y: 12 }, 0.8);

/* ---------- Preloader ----------
   Plays on every load, as an intentional brand moment. It still only *waits*
   on the webfonts; MIN_SHOW just holds the mark on screen long enough to read
   once the fonts are already cached and resolve instantly. */
const preload = document.getElementById('preload');

let revealed = false;
function revealSite() {
  if (revealed) return;
  revealed = true;
  if (preload) preload.classList.add('is-done');
  lenis.start();
  heroIntro.play();
}

const MIN_SHOW = prefersReducedMotion ? 0 : 650;  // long enough to actually see the mark
const HARD_CAP = 1000;                            // never hold the page longer than this

if (!preload) {
  revealSite();
} else {
  lenis.stop();
  const startedAt = performance.now();
  const fontsReady = document.fonts ? document.fonts.ready : Promise.resolve();

  Promise.race([
    fontsReady,
    new Promise((resolve) => setTimeout(resolve, HARD_CAP)),
  ]).then(() => {
    const waited = performance.now() - startedAt;
    setTimeout(revealSite, Math.max(0, MIN_SHOW - waited));
  });

  /* Backstop in case the promise chain never settles — revealSite is idempotent. */
  setTimeout(revealSite, HARD_CAP + MIN_SHOW + 300);
}

/* ---------- Glass lens on the hero name ---------- */
const isFinePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const lensWrap = document.querySelector('.hero__lens-wrap');
const lensCopy = document.getElementById('lensCopy');

if (isFinePointer && lensWrap && lensCopy && !prefersReducedMotion) {
  const radius = 62;
  lensWrap.addEventListener('mousemove', (e) => {
    const rect = lensWrap.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    lensCopy.style.clipPath = `circle(${radius}px at ${x}px ${y}px)`;
    lensCopy.classList.add('is-active');
  });
  lensWrap.addEventListener('mouseleave', () => {
    lensCopy.classList.remove('is-active');
  });
}

/* ---------- Scroll reveals ---------- */
document.querySelectorAll('[data-reveal]').forEach((el) => {
  ScrollTrigger.create({
    trigger: el,
    start: 'top 88%',
    onEnter: () => el.classList.add('is-visible'),
  });
});

/* ---------- Copy-to-clipboard ---------- */
document.querySelectorAll('.contact__copy').forEach((btn) => {
  btn.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(btn.getAttribute('data-copy'));
      btn.classList.add('is-copied');
      setTimeout(() => btn.classList.remove('is-copied'), 1500);
    } catch (err) {
      /* clipboard unavailable — the link itself still works */
    }
  });
});
