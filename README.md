# Prasant Shil Sarma — Photographer Portfolio

An animated 3D portfolio: glowing preloader, hero with portrait cut-out, swirling night-sky "About" card that expands on scroll, horizontal "Journey" with glitch titles, featured work, a WebGL curved ribbon gallery, a 3D hexagon ring of frames, a services accordion and a "Let's Talk" footer.

Built with plain HTML/CSS/JS + GSAP/ScrollTrigger, Lenis and Three.js. All libraries are in `vendor/`, so nothing loads from a CDN except Google Fonts.

## Run locally
The WebGL gallery needs a web server; opening `index.html` directly shows a simple fallback strip instead.
```bash
python3 -m http.server 8080   # then open http://localhost:8080
```

## Publish free (GitHub Pages)
Repo → Settings → Pages → Deploy from branch → choose the branch and the `/ (root)` folder.

## Put in your own photos
The images in `assets/photos/` are **generated placeholders**. To replace them:
- **Easiest:** save your photos over the same file names (e.g. your best street shot as `street-rain.jpg`).
- **Or** add new files and edit the titles and paths in `js/content.js` (Collections ribbon + Frames ring), and the `<img>` tags in `index.html` (Journey, Featured, About).
- **Hero portrait:** `assets/photos/profile.png`. Use a PNG cut-out of yourself with a transparent background, roughly square, with your head and shoulders at the bottom. It's shown in black & white automatically.
- Landscape photos (around 1600×1067) work best. Keep each file under ~500 KB for fast loading.

## Contact details
Phone, WhatsApp and email (+91 98832 26530 · prrasant06@gmail.com) are in `index.html` (nav icons, services "Inquire" links, footer) and in `js/main.js` (contact form). The contact form opens the visitor's email app or WhatsApp, so no server is needed.

To add Instagram: copy one of the `.pillbtn` links in the footer and point it at your profile.

## Regenerate placeholders (optional)
`node tools/render-placeholders.js` (needs Playwright).
