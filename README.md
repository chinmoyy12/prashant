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

## Admin panel (Prasant Studio)
Open **/admin/** on the Netlify site (e.g. `https://prasant-shil-sarma.netlify.app/admin/`) and sign in.

- **Collections / Pujo Nights ring:** add photos (button or drag & drop), replace, remove, reorder (drag or ← →), edit titles and subtitles.
- **Featured / Journey:** replace the photo in each slot. An empty Journey chapter shows its big number.
- **Framing:** click any photo and choose the point that must stay in view; previews show how it is cropped.
- **Words:** the home-screen line and the About text.
- Press **Publish**. The website reads its content from the API on every visit, so changes are live immediately — no rebuild.
- Each photo can be used only once (checked in the admin *and* on the server). Uploads are resized in the browser (2000/1100/560 px, WebP or JPEG), so camera/GPS metadata never leaves the device.
- Change the password from the ••• menu. Repeated wrong passwords lock sign-in for 15 minutes.

### How it works
- `netlify/functions/` — `content` (GET/PUT site content), `auth` (login, session, password), `photos` (upload, serve images). Data lives in **Netlify Blobs**; the previous published version is kept as a backup.
- Credentials are Netlify environment variables, never in the repo: `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` (generate with `node scripts/hash-password.mjs 'password'`), `SESSION_SECRET` (any long random string).
- `src/data/default-content.json` is the built-in content, used until something is published and as a fallback if the API is unreachable.
- The GitHub Pages copy is built with `VITE_API_BASE=https://prasant-shil-sarma.netlify.app`, so it shows the same live content; its `/admin/` forwards to Netlify.

### Deploy
```bash
npm run build
NETLIFY_AUTH_TOKEN=<token> npx netlify deploy --prod --site prasant-shil-sarma --dir dist --functions netlify/functions --no-build
```
Local end-to-end test (site + functions + Blobs emulator): `npm run build && node scripts/local-server.mjs` → http://localhost:8888 (put the three variables in a git-ignored `.env`).

## Photos
- Built-in photos live in `public/photos/work/` as `<name>-full|md|sm.webp`; their titles, order and framing are in `src/data/default-content.json`. Day-to-day changes are easier in the admin panel.
- `npm run check` (also run before every build) fails if a built-in photo repeats or a file is missing.
- `public/photos/prasant/hero.webp` + `hero-depth.png` drive the 3D hero portrait; `about.jpg` is the spotlight portrait.

## Project layout
```
index.html            page markup and text content
src/main.ts           all scroll animations and interactions
src/gallery3d.ts      WebGL curved ribbon (Three.js + shaders)
src/hero3d.ts         3D portrait: depth mesh, relighting, colour reveal, particles
src/swirl.ts          swirling night-sky canvas
src/content.ts        loads live content from the API (falls back to src/data/default-content.json)
src/admin/            admin panel (Prasant Studio)
netlify/functions/    API: content, login, uploads
src/styles.css        styles
public/photos/        images
```

## Contact details
Phone, WhatsApp and email (+91 98832 26530 · prrasant06@gmail.com) are in `index.html` and in `src/main.ts` (`PHONE_INTL`, `EMAIL`). The contact form opens the visitor's email app or WhatsApp, so no server is needed.
