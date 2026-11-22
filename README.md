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
npm run check      # photo check: no repeats, no missing files
npm run build      # photo check + type-check + production build into dist/
npm run preview    # serve the production build → http://localhost:4173
```
`npm run dev` also prints a **Network** address (e.g. `http://192.168.x.x:5173`). Open it on your phone on the same Wi-Fi to test mobile.

## Publish free (GitHub Pages)
1. Merge this into `main`.
2. Repo → Settings → Pages → Source: **GitHub Actions**.
3. Every push to `main` builds and deploys automatically (`.github/workflows/deploy.yml`).

The `dist/` folder also works on Netlify, Vercel or Cloudflare Pages (build command `npm run build`, output `dist`).

## Photos
- `public/photos/work/` holds Prasant's photos (2000px), with `public/photos/work/sm/` (1000px) used in the 3D galleries. Location and camera metadata were stripped.
- To add or change gallery photos, drop both sizes in those folders and edit `src/content.ts`. Journey, Featured and About images are set in `index.html`.
- The **Nature** chapter shows a big chapter number until a nature photo is added. Swap its `<div class="jpanel__num">` for a `<figure class="jpanel__photo">` like the other chapters.
- **Each photo may appear only once.** `npm run check` (also run before every build) fails if a photo repeats or a file is missing.
- `focus` in `src/content.ts` sets which part of a photo stays in frame when it's cropped into a card.
- `public/photos/prasant/hero.webp` + `hero-depth.png` drive the 3D hero portrait (cut-out + depth map). `about.jpg` is the spotlight portrait.

## Project layout
```
index.html            page markup and text content
src/main.ts           all scroll animations and interactions
src/gallery3d.ts      WebGL curved ribbon (Three.js + shaders)
src/hero3d.ts         3D portrait: depth mesh, relighting, colour reveal, particles
src/swirl.ts          swirling night-sky canvas
src/content.ts        gallery photos and titles  ← edit this
src/styles.css        styles
public/photos/        images
```

## Contact details
Phone, WhatsApp and email (+91 98832 26530 · prrasant06@gmail.com) are in `index.html` and in `src/main.ts` (`PHONE_INTL`, `EMAIL`). The contact form opens the visitor's email app or WhatsApp, so no server is needed.
