// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// Až budeš mít vlastní doménu: nastav `site` na ni (např. 'https://jmeno.cz')
// a řádek s `base` smaž. Všechny odkazy na webu se přizpůsobí samy.
export default defineConfig({
  site: 'https://hyvexxx.github.io',
  base: '/portfolio',
  // Cache zmenšených obrázků mimo node_modules, aby ji GitHub Action mohla
  // uložit mezi buildy (npm ci node_modules maže).
  cacheDir: './.astro-cache',
  compressHTML: true,
  // Sharp + vodoznak (nastavuje se v Pages CMS → Nastavení webu).
  image: {
    service: { entrypoint: './src/lib/watermark-service.ts' },
  },
  integrations: [sitemap()],
});
