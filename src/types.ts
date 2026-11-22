// Shared content model — used by the public site, the admin panel and the Netlify functions.

export interface PhotoImage {
  /** unique id: file name for built-in photos, `u-<hash>` for uploads */
  id: string;
  /** large (lightbox) */
  src: string;
  /** medium (3D galleries, journey) */
  md: string;
  /** small (phones, thumbnails) */
  sm: string;
  w: number;
  h: number;
  /** tiny blurred preview shown while loading */
  lqip: string;
  /** average colour, used as an instant placeholder */
  color: string;
  /** point kept in frame when cropped, 0–1 from the top-left */
  focus: [number, number];
}

export interface PhotoItem {
  img: PhotoImage;
  title: string;
  type?: string;
}

export type JourneySlot = 'street' | 'portraits' | 'vintage' | 'nature' | 'concerts';
export const JOURNEY_SLOTS: JourneySlot[] = ['street', 'portraits', 'vintage', 'nature', 'concerts'];

export interface SiteContent {
  version: number;
  updatedAt: string;
  text: { heroLead: string; aboutBody: string };
  journey: Record<JourneySlot, PhotoItem | null>;
  featured: PhotoItem[];
  collections: PhotoItem[];
  frames: PhotoItem[];
}

export const LIMITS = {
  featured: { min: 3, max: 3 },
  frames: { min: 4, max: 8 },
  collections: { min: 6, max: 60 },
  title: 80,
  type: 60,
  heroLead: 160,
  aboutBody: 900,
};
