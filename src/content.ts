// =========================================================
//  Edit your photos & titles here.
//  `src` = large image (lightbox), `thumb` = smaller image used in 3D galleries.
//  Put new photos in public/photos/work/ (large) and public/photos/work/sm/ (≈1000px).
//  `focus` (optional, 0–1) is the point kept in frame when a photo is cropped,
//  e.g. [0.35, 0.5] keeps the left-of-centre subject of a landscape photo.
//  Every photo may appear only once on the site: `npm run check` enforces it.
// =========================================================

export interface Photo { src: string; thumb: string; title: string; type?: string; focus?: [number, number] }

const work = (file: string, title: string, type?: string, focus?: [number, number]): Photo => ({
  src: `photos/work/${file}.jpg`,
  thumb: `photos/work/sm/${file}.jpg`,
  title,
  type,
  focus,
});

// Curved 3D ribbon ("Collections")
export const COLLECTIONS: Photo[] = [
  work('sez-2329', 'Cyan Haze', 'Concert · Colour'),
  work('sez-2630', 'Lost in the Song', 'Concert · Profile'),
  work('street-biryani', 'Biryani Queue', 'Street · Night market', [0.55, 0.5]),
  work('sez-2371', 'Monochrome Voice', 'Concert · Black & White'),
  work('sez-2576', 'Rock On', 'Concert · Gesture'),
  work('sez-2441', 'Blue Hour Ballad', 'Concert · Stage light'),
  work('portrait-steps', 'Shy Steps', 'Portrait · Selective colour'),
  work('sez-2474', 'Through the Smoke', 'Concert · Atmosphere'),
  work('sez-2340', 'Glitch Sky', 'Concert · LED wall', [0.47, 0.5]),
  work('sez-2540', 'Reach', 'Concert · Gesture'),
  work('street-eggroll', 'Egg Roll Corner', 'Street · Night market', [0.36, 0.5]),
  work('sez-3636', 'Between the Beams', 'Concert · Stage light'),
  work('sez-2335', 'Static Sky', 'Concert · LED wall'),
  work('sez-2635', 'Neon Dream', 'Concert · Colour'),
  work('sez-2549-2', 'High Note', 'Concert · Black & White'),
  work('street-jalebi-smile', 'The Jalebi Smile', 'Street · Portrait', [0.56, 0.5]),
  work('sez-2598', 'Hands to the Light', 'Concert · Emotion'),
  work('sez-2667', 'White Silhouette', 'Concert · Minimal'),
  work('sez-2690', 'Emerald Stage', 'Concert · Colour'),
  work('sez-2381', 'Echoes in Red', 'Concert · Scale', [0.5, 0.55]),
  work('sez-3714-prompt', 'Light Trails', 'Concert · Creative edit'),
  work('sez-3646', 'Crimson Spotlight', 'Concert · Colour'),
  work('sez-3707', 'Red Jacket', 'Concert · Portrait'),
  work('sez-2361', 'Open Arms', 'Concert · Performance'),
  work('sez-2453', 'Blue Profile', 'Concert · Close-up'),
  work('sez-2532', 'Sepia Stage', 'Concert · Toned'),
];

// 3D ring ("Pujo Nights") — 6 makes a perfect hexagon (4–8 also work)
export const FRAMES: Photo[] = [
  work('puja-devi', 'Devi in the Dark'),
  work('puja-lights', 'Festival of Lights', undefined, [0.5, 0.5]),
  work('puja-motion', 'Motion Prayer'),
  work('street-dhaki', "The Dhaki's Rest", undefined, [0.36, 0.5]),
  work('street-balloons', 'Balloon Seller'),
  work('street-blouses', 'Blouse Lane'),
];
