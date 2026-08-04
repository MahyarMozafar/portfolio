/* The CDN scripts are the one part of this page we do not control: a slow
   network or a blocked host, and they are simply not here. Nothing below may
   throw when that happens, because the page's *text* must never depend on a
   third-party file loading. Google's renderer screenshotted this page as a
   black screen once — `gsap.registerPlugin` threw on line 1 and took every
   reveal down with it. That is what these two flags exist to prevent. */
const hasGsap = typeof gsap !== 'undefined';
const hasLenis = typeof Lenis !== 'undefined';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const isTouch = window.matchMedia('(hover: none)').matches;

/* ---------- Scroll ----------
   Lenis is desktop-only on purpose. It does not smooth touch scrolling anyway
   (syncTouch is off by default), so on a phone it is a permanent rAF loop
   costing frames for no visual gain — while native momentum scrolling is
   already smooth and runs off the main thread. */
const useSmoothScroll = hasGsap && hasLenis && !isTouch && !prefersReducedMotion;

let lenis = null;
if (useSmoothScroll) {
  lenis = new Lenis({ duration: 1.1 });
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* One interface over both modes, so nothing below has to care which is live. */
function onScroll(fn) {
  if (lenis) lenis.on('scroll', ({ scroll }) => fn(scroll));
  else window.addEventListener('scroll', () => fn(window.scrollY), { passive: true });
}

function scrollToEl(el) {
  if (lenis) lenis.scrollTo(el);
  else el.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
}

function lockScroll(locked) {
  if (lenis) {
    if (locked) lenis.stop(); else lenis.start();
  } else {
    /* overflowY, not the shorthand: the shorthand would also overwrite the
       overflow-x clip that keeps the page from ever scrolling sideways. */
    document.documentElement.style.overflowY = locked ? 'hidden' : '';
    document.body.style.overflowY = locked ? 'hidden' : '';
  }
}

/* in-page anchor links */
document.querySelectorAll('a[href^="#"]').forEach((link) => {
  link.addEventListener('click', (e) => {
    const target = document.querySelector(link.getAttribute('href'));
    if (target) {
      e.preventDefault();
      /* Close first — that releases the scroll lock, which the scroll needs. */
      setMenu(false);
      scrollToEl(target);
    }
  });
});

/* ---------- Nav ---------- */
const nav = document.getElementById('nav');
const navToggle = document.getElementById('navToggle');
const navClose = document.getElementById('navClose');
const navMenu = document.getElementById('navMenu');
const menuRows = navMenu ? navMenu.querySelectorAll('a, .nav__note') : [];

function menuIsOpen() {
  return document.body.classList.contains('menu-open');
}

function setMenu(open) {
  const wasOpen = menuIsOpen();
  document.body.classList.toggle('menu-open', open);

  if (navToggle) {
    navToggle.setAttribute('aria-expanded', String(open));
  }

  /* The nav may have been auto-hidden by an earlier scroll down — make sure
     the close button is on screen whenever the menu is open. */
  if (open) nav.classList.remove('nav--hidden');
  lockScroll(open);

  /* The hamburger is hidden while open, so focus has to move with the control
     or it would be lost on a display:none element. */
  if (open && navClose) navClose.focus();
  else if (wasOpen && !open && navToggle) navToggle.focus();

  /* Rows arrive one after another once the panel has slid in. Without GSAP they
     simply appear with the panel — the CSS gives them no hidden start state, so
     skipping this costs the animation and nothing else. */
  if (open && menuRows.length && !prefersReducedMotion && hasGsap) {
    gsap.fromTo(
      menuRows,
      { opacity: 0, y: 22 },
      { opacity: 1, y: 0, duration: 0.9, stagger: 0.07, ease: 'expo.out', delay: 0.28 }
    );
  }
}

if (navToggle) navToggle.addEventListener('click', () => setMenu(true));
if (navClose) navClose.addEventListener('click', () => setMenu(false));

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menuIsOpen()) setMenu(false);
});

/* Rotating a phone into landscape can cross the breakpoint while the panel is
   open, leaving a stuck overlay and a locked scroll. */
window.matchMedia('(min-width: 721px)').addEventListener('change', (e) => {
  if (e.matches && menuIsOpen()) setMenu(false);
});

/* hide on scroll down, show on scroll up — coalesced into one frame, since
   native scroll events fire far more often than the screen refreshes */
let lastScroll = 0;
let navQueued = false;
onScroll((y) => {
  if (navQueued) return;
  navQueued = true;
  requestAnimationFrame(() => {
    navQueued = false;
    if (menuIsOpen()) return;
    nav.classList.toggle('nav--hidden', y > lastScroll && y > 120);
    lastScroll = y;
  });
});

/* ---------- Hero load-in (held until the preloader lifts) ----------
   fromTo, not from: `from` reads the current state as the end state, so a
   half-applied timeline can strand an element at opacity 0 with nothing left
   to restore it. Spelling out both ends means the resting state is always
   written down. Note this still blanks the hero the instant the timeline is
   built — it is paused — so it only ever runs when GSAP is actually here. */
const heroIntro = hasGsap && document.querySelector('.hero__name')
  ? gsap.timeline({ paused: true, defaults: { duration: 1.4, ease: 'expo.out' } })
      .fromTo('.hero__label', { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, 0.15)
      .fromTo('.hero__name', { opacity: 0, y: 20 }, { opacity: 1, y: 0 }, 0.3)
      .fromTo('.hero__tagline', { opacity: 0, y: 16 }, { opacity: 1, y: 0 }, 0.45)
      .fromTo('.hero__meta', { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.7)
      .fromTo('.hero__scroll', { opacity: 0, y: 12 }, { opacity: 1, y: 0 }, 0.8)
  : null;

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
  lockScroll(false);
  if (heroIntro) heroIntro.play();
}

const MIN_SHOW = prefersReducedMotion ? 0 : 650;  // long enough to actually see the mark
const HARD_CAP = 1000;                            // never hold the page longer than this

if (!preload) {
  revealSite();
} else {
  lockScroll(true);
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

/* ---------- Scroll reveals ----------
   IntersectionObserver rather than ScrollTrigger. It ships with the browser, so
   the page's text can no longer be held hostage by a CDN file — which is the
   whole reason Google saw a blank page. rootMargin -12% is the same trigger
   point ScrollTrigger's `top 88%` gave us, and Lenis scrolls the window for
   real (no transform trickery), so the observer stays in step with it. */
const revealEls = document.querySelectorAll('[data-reveal]');

if ('IntersectionObserver' in window) {
  const revealObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach((entry) => {
      if (!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      observer.unobserve(entry.target);   // reveal once, then stop watching
    });
  }, { rootMargin: '0px 0px -12% 0px' });

  revealEls.forEach((el) => revealObserver.observe(el));
} else {
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* ---------- Making sure a crawler sees words ----------
   showEverything() is the resting state of this page with all the choreography
   already finished. Nothing here is a visual change — it is the same end state
   the animations arrive at, just written down directly.

   heroIntro.progress(1) is the important line. GSAP renders through
   requestAnimationFrame, and the timeline was built paused, which already wrote
   opacity:0 onto every hero line. If no frame ever runs, that is permanent.
   progress(1) writes the timeline's end values synchronously, so it does not
   need a tick to undo them. play() cannot do this — it only asks for a frame
   that may never come. */
function showEverything() {
  revealSite();                                 // lift the preloader, free the scroll
  if (heroIntro) heroIntro.progress(1);         // hero, without waiting on a frame
  revealEls.forEach((el) => el.classList.add('is-visible'));
}

/* Googlebot stretches its viewport to something like 12,000px tall so the whole
   page counts as on screen at once. No real display is remotely that tall, so
   this is a safe tell — and there is nobody behind it to watch an intro. This
   is why Search Console kept screenshotting a black page: the hero is 100svh,
   so at that height the hero *is* the whole screenshot, and its text was still
   sitting at opacity 0 waiting for a frame that never came. */
if (window.innerHeight > 4000) {
  showEverything();
}

/* And the ordinary no-scroll case, for any renderer that uses a normal viewport.
   If nobody has moved down the page by the time this fires, there is nobody here
   to animate for. A real reader has scrolled long before four seconds and sees
   every reveal exactly as designed.

   Position, not a scroll event: releasing the preloader's scroll lock fires a
   scroll event on its own, and that would cancel the fallback with the visitor
   still sitting at the top. */
setTimeout(() => {
  if (window.scrollY > 40) return;
  showEverything();
}, 4000);

/* Tells the inline <head> rescue this file made it to the end intact. If it is
   never set, that script un-hides the page at 3s. */
window.__revealLive = true;

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
