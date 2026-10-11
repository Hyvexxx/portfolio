import type { APIRoute } from 'astro';
import sharp from 'sharp';

// Ikona pro plochu iPhonu (180×180) – stejný motiv jako favicon.svg,
// jen na plném pozadí, protože iOS průhlednost nepodporuje.
const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 180 180">
  <rect width="180" height="180" fill="#0b0b0c"/>
  <circle cx="124" cy="56" r="20" fill="#2b59ff"/>
</svg>`;

export const GET: APIRoute = async () => {
  const png = await sharp(Buffer.from(svg)).png().toBuffer();
  return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png' } });
};
