import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// Pages CMS ukládá prázdné seznamy a nevyplněná pole jako null nebo "".
const list = z.preprocess(
  (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v.filter(Boolean) : [v]),
  z.array(z.string()),
);
const flag = z.boolean().nullish().transform((v) => v ?? false);
const optionalText = z
  .string()
  .nullish()
  .transform((v) => v?.trim() || undefined);
// Odkaz bez protokolu ("instagram.com/jmeno") doplníme na https://.
const withProtocol = (v: string) => (/^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v}`);
const optionalUrl = optionalText.transform((v) => (v ? withProtocol(v) : undefined));
const socials = z.preprocess(
  (v) => (Array.isArray(v) ? v.filter((s) => s?.name?.trim() && s?.url?.trim()) : []),
  z.array(
    z.object({
      name: z.string().trim(),
      url: z.string().trim().transform(withProtocol),
    }),
  ),
);

const projects = defineCollection({
  loader: glob({ base: './src/content/projects', pattern: '**/*.md' }),
  schema: z.object({
    title: z.string().min(1),
    date: z.coerce.date(),
    category: z.enum(['foto', 'grafika']),
    tags: list,
    // Cesty k obrázkům v src/assets/…, převádí je src/lib/images.ts
    cover: z.string().min(1),
    gallery: list,
    client: optionalText,
    location: optionalText,
    link: optionalUrl,
    featured: flag,
    draft: flag,
  }),
});

const site = defineCollection({
  loader: glob({ base: './src/content/site', pattern: '*.md' }),
  schema: z.object({
    name: z.string().min(1),
    tagline: optionalText,
    intro: optionalText,
    cta: optionalText,
    email: optionalText,
    socials,
    portrait: optionalText,
  }),
});

const flagOn = z.boolean().nullish().transform((v) => v ?? true);
const orDefault = <T extends string>(values: [T, ...T[]], fallback: T) =>
  z
    .enum(values)
    .nullish()
    .catch(fallback)
    .transform((v) => v ?? fallback);

const settings = defineCollection({
  loader: glob({ base: './src/content/settings', pattern: '*.md' }),
  schema: z.object({
    watermark: z.preprocess(
      (v) => v ?? {},
      z.object({
        enabled: flagOn,
        text: optionalText,
        position: orDefault(['corner', 'center', 'tiled'], 'corner'),
        opacity: z.preprocess(
          (v) => (v === '' || v == null ? undefined : Number(v)),
          z.number().min(5).max(100).optional().catch(undefined).transform((v) => v ?? 55),
        ),
        size: orDefault(['small', 'medium', 'large'], 'medium'),
      }),
    ),
    protectImages: flagOn,
    blockAi: flagOn,
  }),
});

export const collections = { projects, site, settings };
