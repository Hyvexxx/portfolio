import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';

// Všechny obrázky v src/assets – Pages CMS do obsahu zapisuje cesty
// ve tvaru "/src/assets/projects/<slozka>/<soubor>.jpg".
const modules = import.meta.glob<{ default: ImageMetadata }>(
  '/src/assets/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG,WEBP,AVIF}',
  { eager: true },
);

function normalize(value: string): string {
  let path = value.trim().replace(/\\/g, '/');
  try {
    path = decodeURI(path);
  } catch {
    // ponecháme cestu tak, jak je
  }
  return path.startsWith('/') ? path : `/${path}`;
}

export function resolveImage(value: string, context: string): ImageMetadata {
  const mod = modules[normalize(value)];
  if (!mod) {
    throw new Error(
      `Obrázek "${value}" (${context}) nebyl nalezen. Cesta musí vést do src/assets/ ` +
        `a soubor musí být jpg, png, webp nebo avif.`,
    );
  }
  return mod.default;
}

/** Šířky pro srcset – jen menší než originál, největší je originál sám. */
export function widthsFor(image: ImageMetadata, candidates: number[]): number[] {
  const widths = candidates.filter((w) => w < image.width);
  if (widths.length < candidates.length) widths.push(image.width);
  return widths;
}

export interface FullImage {
  src: string;
  width: number;
  height: number;
}

// Velká verze pro lightbox – nikdy ne větší než originál.
export async function fullSize(image: ImageMetadata): Promise<FullImage> {
  const width = Math.min(image.width, 2400);
  const result = await getImage({ src: image, width, format: 'webp', quality: 85 });
  return {
    src: result.src,
    width,
    height: Math.round((image.height / image.width) * width),
  };
}
