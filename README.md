# Prasant Shil Sarma — Photographer Portfolio

An animated 3D portfolio: glowing preloader, hero with portrait cut-out, swirling night-sky "About" card that expands on scroll, horizontal "Journey" with glitch titles, featured work, a WebGL curved ribbon gallery, a 3D hexagon ring of frames, a services accordion and a "Let's Talk" footer.

## Tech stack
| Layer | Tool |
|---|---|
| Build / dev server | **Vite 8** (Rolldown) with live reload, optimized and hashed production build |
| Language | **TypeScript** (strict) |
| Scroll animation | **GSAP 3 + ScrollTrigger** |
| Smooth scrolling | **Lenis** |
| 3D / WebGL | **Three.js** with custom GLSL shaders (lazy-loaded only when the gallery is reached) |
| Hosting | Any static host. A GitHub Pages workflow is included. |

Initial load is about 66 kB of gzipped JS + CSS. Three.js (about 133 kB gzipped) loads on demand.

## Run it on your computer
Needs [Node.js 20+](https://nodejs.org).
```bash
npm install
npm run dev        # dev server with live reload → http://localhost:5173
```
Other commands:
```bash
npm run build      # type-check + production build into dist/
npm run preview    # serve the production build → http://localhost:4173
```
`npm run dev` also prints a **Network** address (e.g. `http://192.168.x.x:5173`). Open it on your phone on the same Wi-Fi to test mobile.

## Publish free (GitHub Pages)
1. Merge this into `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Every push to `main` builds and deploys automatically (`.github/workflows/deploy.yml`).

The `dist/` folder also works on Netlify, Vercel or Cloudflare Pages (build command `npm run build`, output `dist`).

## Put in your own photos
The images in `public/photos/` are **generated placeholders**.
- **Easiest:** save your photos over the same file names (e.g. your best street shot as `street-rain.jpg`).
- **Or** add new files to `public/photos/`, then edit the titles and paths in `src/content.ts` (Collections ribbon + Frames ring) and the `<img>` tags in `index.html` (Journey, Featured, About).
- **Hero portrait:** `public/photos/profile.png`. Use a transparent-background PNG cut-out, roughly square, with head and shoulders at the bottom.
- Landscape photos around 1600×1067 under ~500 KB each work best.

## Project layout
```
index.html            page markup and text content
src/main.ts           all scroll animations and interactions
src/gallery3d.ts      WebGL curved ribbon (Three.js + shaders)
src/swirl.ts          swirling night-sky canvas
src/content.ts        gallery photos and titles  ← edit this
src/styles.css        styles
public/photos/        images                     ← replace these
tools/                placeholder image generator (optional)
```

## Contact details
Phone, WhatsApp and email (+91 98832 26530 · prrasant06@gmail.com) are in `index.html` and in `src/main.ts` (`PHONE_INTL`, `EMAIL`). The contact form opens the visitor's email app or WhatsApp, so no server is needed.
