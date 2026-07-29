# Portfolio — مهیار مظفر

Personal portfolio site. Persian (RTL), single page, dark and minimal.

**Live contact:** [Email](mailto:applemahyar7@gmail.com) · [Telegram](https://t.me/MahyarMozafar) · [Instagram](https://instagram.com/mahy9r)

## Built with

Plain HTML, CSS and JavaScript — no build step, no framework. Three libraries load from a CDN:

- [GSAP](https://gsap.com/) + ScrollTrigger — scroll-triggered reveals and the menu stagger
- [Lenis](https://lenis.darkroom.engineering/) — smooth scrolling
- [Vazirmatn](https://fonts.google.com/specimen/Vazirmatn) + IBM Plex Mono — typefaces

## Running it

No server or install needed. Open `index.html` in a browser.

To serve it locally instead:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.

## Structure

```
index.html        markup, all sections
css/style.css     design tokens + all styling
js/main.js        smooth scroll, menu, reveals, preloader
assets/logo.svg   MM monogram, also used as the favicon
```

## Notes

- **RTL throughout.** Layout uses logical properties (`inset-inline-start`, `margin-inline`) rather than left/right so direction stays correct.
- **No letter-spacing on Persian text.** Persian script is cursive and its letters join — tracking visually breaks those joins. Spacing is only ever applied to Latin and monospace runs.
- **Reduced motion is respected.** The drifting glow, preloader timing and all reveals back off when the OS asks for less motion.
- **Touch targets are 44px minimum** on mobile, per the iOS guideline.
