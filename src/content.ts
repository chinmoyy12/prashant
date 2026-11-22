// =========================================================
//  Edit your photos & titles here.
//  `src` = large image (lightbox), `thumb` = smaller image used in 3D galleries.
//  Put new photos in public/photos/work/ (large) and public/photos/work/sm/ (≈1000px).
// =========================================================

export interface Photo { src: string; thumb: string; title: string; type?: string }

const work = (file: string, title: string, type?: string): Photo => ({
  src: `photos/work/${file}.jpg`,
  thumb: `photos/work/sm/${file}.jpg`,
  title,
  type,
});

// Curved 3D ribbon ("Collections")
export const COLLECTIONS: Photo[] = [
  work('sez-2329', 'Cyan Haze', 'Concert · Colour'),
  work('sez-2371', 'Monochrome Voice', 'Concert · Black & White'),
  work('sez-2441', 'Blue Hour Ballad', 'Concert · Stage light'),
  work('sez-2474', 'Through the Smoke', 'Concert · Atmosphere'),
  work('sez-2540', 'Reach', 'Concert · Gesture'),
  work('sez-2335', 'Static Sky', 'Concert · LED wall'),
  work('sez-2549-2', 'High Note', 'Concert · Black & White'),
  work('sez-2598', 'Hands to the Light', 'Concert · Emotion'),
  work('sez-2690', 'Emerald Stage', 'Concert · Colour'),
  work('sez-3714-prompt', 'Light Trails', 'Concert · Creative edit'),
  work('sez-3707', 'Red Jacket', 'Concert · Portrait'),
  work('sez-2361', 'Open Arms', 'Concert · Performance'),
];

// 3D ring ("Frames '26") — 6 makes a perfect hexagon (4–8 also work)
export const FRAMES: Photo[] = [
  work('sez-2630', 'Lost in the Song'),
  work('sez-2576', 'Rock On'),
  work('sez-3636', 'Between the Beams'),
  work('sez-2635', 'Neon Dream'),
  work('sez-2667', 'White Silhouette'),
  work('sez-3646', 'Crimson Spotlight'),
];
