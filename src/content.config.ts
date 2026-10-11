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
    instagram: optionalText,
    behance: optionalText,
    portrait: optionalText,
  }),
});

export const collections = { projects, site };
