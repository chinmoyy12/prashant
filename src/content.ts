// =========================================================
//  Edit your photos & titles here.
//  Put your own images in public/photos/ and change `src`.
// =========================================================

export interface Photo { src: string; title: string; type?: string }

// Curved 3D ribbon ("Collections")
export const COLLECTIONS: Photo[] = [
  { src: 'photos/street-rain.jpg',      title: 'Rain Diaries',     type: 'Street · Monochrome' },
  { src: 'photos/portrait-rim.jpg',     title: 'Golden Edge',      type: 'Portrait · Rim light' },
  { src: 'photos/vintage-road.jpg',     title: 'Faded Roads',      type: 'Creative Vintage · Film look' },
  { src: 'photos/concert-beams.jpg',    title: 'Stage Lights',     type: 'Concert · Live' },
  { src: 'photos/nature-mountains.jpg', title: 'Layers of Dawn',   type: 'Nature · Landscape' },
  { src: 'photos/street-shadows.jpg',   title: 'Lines & Shadows',  type: 'Street · Geometry' },
  { src: 'photos/portrait-window.jpg',  title: 'Window Light',     type: 'Portrait · Monochrome' },
  { src: 'photos/nature-forest.jpg',    title: 'Forest Rays',      type: 'Nature · Light' },
  { src: 'photos/concert-singer.jpg',   title: 'One Voice',        type: 'Concert · Spotlight' },
  { src: 'photos/vintage-sea.jpg',      title: 'Salt & Film',      type: 'Creative Vintage · Seaside' },
];

// 3D ring ("Frames '26") — keep 6 for a perfect hexagon (4–8 also work)
export const FRAMES: Photo[] = [
  { src: 'photos/street-crowd.jpg',    title: 'Unseen Streets' },
  { src: 'photos/night-bokeh.jpg',     title: 'City After Dark' },
  { src: 'photos/nature-field.jpg',    title: 'Golden Hour' },
  { src: 'photos/portrait-window.jpg', title: 'Faces & Feelings' },
  { src: 'photos/concert-beams.jpg',   title: 'Stage Lights' },
  { src: 'photos/vintage-sea.jpg',     title: 'Faded Film' },
];
