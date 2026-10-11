import { join } from 'node:path';
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

// Cesta ke zdrojovému souboru každého obrázku – pro výpočet barvy placeholderu.
const sources = new Map<string, string>();

export function resolveImage(value: string, context: string): ImageMetadata {
  const path = normalize(value);
  const mod = modules[path];
  if (!mod) {
    throw new Error(
      `Obrázek "${value}" (${context}) nebyl nalezen. Cesta musí vést do src/assets/ ` +
        `a soubor musí být jpg, png, webp nebo avif.`,
    );
  }
  sources.set(mod.default.src, path);
  return mod.default;
}

const placeholders = new Map<string, Promise<string | undefined>>();

/** Průměrná barva obrázku (CSS rgb) – zobrazí se, než se obrázek načte. */
export function placeholder(image: ImageMetadata): Promise<string | undefined> {
  const path = sources.get(image.src);
  if (!path) return Promise.resolve(undefined);
  let color = placeholders.get(path);
  if (!color) {
    color = (async () => {
      try {
        const { default: sharp } = await import('sharp');
        const { data } = await sharp(join(process.cwd(), path))
          .resize(1, 1, { fit: 'fill' })
          .removeAlpha()
          .raw()
          .toBuffer({ resolveWithObject: true });
        return `rgb(${data[0]} ${data[1]} ${data[2]})`;
      } catch {
        return undefined;
      }
    })();
    placeholders.set(path, color);
  }
  return color;
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
export async function fullSize(image: ImageMetadata, watermark?: string): Promise<FullImage> {
  const width = Math.min(image.width, 2400);
  const result = await getImage({ src: image, width, format: 'webp', quality: 85, watermark });
  return {
    src: result.src,
    width,
    height: Math.round((image.height / image.width) * width),
  };
}
