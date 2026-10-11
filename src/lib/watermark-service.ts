// Image service: standardní sharp + vodoznak. Obrázky, kterým komponenta
// předá `watermark` (JSON s nastavením, viz getWatermark v projects.ts),
// dostanou při buildu vypálený text. Ostatní projdou beze změny.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { LocalImageService } from 'astro';
import sharpService from 'astro/assets/services/sharp';
import type { Sharp } from 'sharp';

export interface WatermarkOptions {
  text: string;
  position: 'corner' | 'center' | 'tiled';
  /** Krytí 5–100 (%). */
  opacity: number;
  size: 'small' | 'medium' | 'large';
}

const HASH_PROPS = ['src', 'width', 'height', 'format', 'quality', 'fit', 'position', 'background'];
const FONT_FILE = join(process.cwd(), 'node_modules/geist/dist/fonts/geist-sans/Geist-SemiBold.ttf');
const SIZE = { small: 0.022, medium: 0.03, large: 0.042 };
const POSITION_SCALE = { corner: 1, center: 2, tiled: 1.2 };
const QUALITY_PRESETS: Record<string, number> = { low: 25, mid: 50, high: 80, max: 100 };

type SharpFn = typeof import('sharp').default;
let sharpLib: SharpFn | undefined;
const loadSharp = async () => (sharpLib ??= (await import('sharp')).default);

function parse(value: unknown): WatermarkOptions | undefined {
  if (typeof value !== 'string' || !value) return undefined;
  try {
    const options = JSON.parse(value) as WatermarkOptions;
    return options.text ? options : undefined;
  } catch {
    return undefined;
  }
}

const escapeMarkup = (text: string) =>
  text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Text jako průhledné PNG – bílé písmo s jemným tmavým stínem pro čitelnost. */
async function renderText(sharp: SharpFn, text: string, px: number, opacity: number) {
  const font = existsSync(FONT_FILE)
    ? { font: `Geist SemiBold ${px}`, fontfile: FONT_FILE }
    : { font: `sans-serif bold ${px}` };
  const draw = (color: string, alpha: number) =>
    sharp({
      text: {
        text: `<span foreground="${color}" fgalpha="${Math.round(alpha)}%">${escapeMarkup(text)}</span>`,
        dpi: 72,
        rgba: true,
        ...font,
      },
    })
      .png()
      .toBuffer({ resolveWithObject: true });

  const [fg, shadow] = await Promise.all([draw('#ffffff', opacity), draw('#000000', opacity * 0.45)]);
  const blur = Math.max(1, Math.round(px * 0.06));
  const pad = blur * 3;
  const softShadow = await sharp(shadow.data)
    .extend({ top: pad, bottom: pad, left: pad, right: pad, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .blur(blur)
    .png()
    .toBuffer();

  return sharp({
    create: {
      width: fg.info.width + pad * 2,
      height: fg.info.height + pad * 2,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: softShadow, left: Math.round(blur / 2), top: Math.round(blur / 2) },
      { input: fg.data, left: pad, top: pad },
    ])
    .png()
    .toBuffer({ resolveWithObject: true });
}

async function applyWatermark(
  input: Uint8Array,
  options: WatermarkOptions,
  format: string,
  quality: number,
): Promise<Uint8Array | undefined> {
  const sharp = await loadSharp();
  const image = sharp(input);
  const { width = 0, height = 0 } = await image.metadata();
  if (!width || !height) return undefined;

  const opacity = Math.min(100, Math.max(5, options.opacity));
  let px = Math.max(11, Math.round(Math.sqrt(width * height) * SIZE[options.size] * POSITION_SCALE[options.position]));
  let layer = await renderText(sharp, options.text, px, opacity);
  // Text nesmí být širší než obrázek.
  const maxWidth = width * (options.position === 'corner' ? 0.7 : 0.9);
  if (layer.info.width > maxWidth) {
    px = Math.max(8, Math.floor((px * maxWidth) / layer.info.width));
    layer = await renderText(sharp, options.text, px, opacity);
  }

  let composite: Parameters<Sharp['composite']>[0];
  if (options.position === 'tiled') {
    const gap = Math.round(layer.info.width * 0.6);
    const tile = await sharp(layer.data)
      .rotate(-30, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .extend({ top: gap / 2, bottom: gap / 2, left: gap / 2, right: gap / 2, background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer({ resolveWithObject: true });
    const fits = tile.info.width <= width && tile.info.height <= height;
    composite = fits
      ? [{ input: tile.data, tile: true, gravity: 'northwest' }]
      : [{ input: layer.data, gravity: 'center' }];
  } else if (options.position === 'center') {
    composite = [{ input: layer.data, gravity: 'center' }];
  } else {
    const margin = Math.round(Math.min(width, height) * 0.025);
    composite = [
      {
        input: layer.data,
        left: Math.max(0, width - layer.info.width - margin),
        top: Math.max(0, height - layer.info.height - margin),
      },
    ];
  }

  const out = image.composite(composite).withExif({ IFD0: { Copyright: options.text } });
  switch (format) {
    case 'webp':
      return out.webp({ quality }).toBuffer();
    case 'jpg':
    case 'jpeg':
      return out.jpeg({ quality, mozjpeg: true }).toBuffer();
    case 'avif':
      return out.avif({ quality }).toBuffer();
    case 'png':
      return out.png().toBuffer();
    default:
      return undefined;
  }
}

function resolveQuality(quality: unknown): number {
  if (typeof quality === 'number') return quality;
  if (typeof quality === 'string') return QUALITY_PRESETS[quality] ?? (Number(quality) || 80);
  return 80;
}

const service: LocalImageService = {
  ...sharpService,
  propertiesToHash: [...HASH_PROPS, 'watermark'],

  getHTMLAttributes(options, config, logger) {
    const { watermark: _, ...rest } = options;
    return sharpService.getHTMLAttributes!(rest, config, logger);
  },

  // Dev server generuje obrázky přes /_image?… – vodoznak musí projít i URL.
  async getURL(options, config, logger) {
    const url = await sharpService.getURL(options, config, logger);
    return options.watermark && url.includes('?')
      ? `${url}&wm=${encodeURIComponent(String(options.watermark))}`
      : url;
  },

  parseURL: (async (url, config, logger) => {
    const transform = await sharpService.parseURL(url, config, logger);
    const wm = url.searchParams.get('wm');
    if (transform && wm) transform.watermark = wm;
    return transform;
  }) as LocalImageService['parseURL'],

  async transform(input, transform, config, logger) {
    const watermark = parse(transform.watermark);
    if (!watermark) return sharpService.transform(input, transform, config, logger);

    // Základní zmenšení v plné kvalitě, komprese až po vložení vodoznaku.
    const { watermark: _, quality, ...rest } = transform;
    const base = await sharpService.transform(input, { ...rest, quality: 100 }, config, logger);
    const data = await applyWatermark(base.data, watermark, base.format, resolveQuality(quality));
    return data ? { data, format: base.format } : base;
  },
};

export default service;
