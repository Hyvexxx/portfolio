import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { getCollection, getEntry, type CollectionEntry } from 'astro:content';
import { resolveImage } from './images';

export const CATEGORIES = {
  foto: 'Fotografie',
  grafika: 'Grafika',
} as const;

export type Category = keyof typeof CATEGORIES;

export interface Project {
  id: string;
  title: string;
  date: Date;
  year: number;
  category: Category;
  tags: string[];
  client?: string;
  location?: string;
  link?: string;
  featured: boolean;
  cover: ImageMetadata;
  /** Všechny obrázky projektu – cover první, bez duplicit. */
  images: ImageMetadata[];
  entry: CollectionEntry<'projects'>;
}

export interface WorkImage {
  image: ImageMetadata;
  alt: string;
  project: Project;
}

export interface Tag {
  key: string;
  label: string;
  count: number;
}

const collator = new Intl.Collator('cs');

export const tagKey = (tag: string) => tag.trim().toLocaleLowerCase('cs');

function toProject(entry: CollectionEntry<'projects'>): Project {
  const { data } = entry;
  const where = `projekt "${data.title}"`;
  const cover = resolveImage(data.cover, where);
  const seen = new Set<string>();
  const images = [cover, ...data.gallery.map((p) => resolveImage(p, where))].filter((img) => {
    if (seen.has(img.src)) return false;
    seen.add(img.src);
    return true;
  });
  const tags = [...new Map(data.tags.map((t) => [tagKey(t), t.trim()])).values()];

  return {
    id: entry.id,
    title: data.title,
    date: data.date,
    // Datum "2026-01-01" je půlnoc UTC – getFullYear() by v zóně západně od UTC vrátil 2025.
    year: data.date.getUTCFullYear(),
    category: data.category,
    tags,
    client: data.client,
    location: data.location,
    link: data.link,
    featured: data.featured,
    cover,
    images,
    entry,
  };
}

async function load(): Promise<Project[]> {
  const entries = await getCollection('projects', ({ data }) => !data.draft);
  return entries
    .map(toProject)
    .sort(
      (a, b) =>
        Number(b.featured) - Number(a.featured) ||
        b.date.getTime() - a.date.getTime() ||
        collator.compare(a.title, b.title),
    );
}

let cached: Promise<Project[]> | undefined;

export function getProjects(): Promise<Project[]> {
  if (import.meta.env.DEV) return load();
  return (cached ??= load());
}

export function getAllImages(projects: Project[]): WorkImage[] {
  return projects.flatMap((project) =>
    project.images.map((image, i) => ({
      image,
      alt: `${project.title} – ${i + 1}`,
      project,
    })),
  );
}

export function getTags(projects: Project[]): Tag[] {
  const tags = new Map<string, Tag>();
  for (const project of projects) {
    for (const label of project.tags) {
      const key = tagKey(label);
      const tag = tags.get(key) ?? { key, label, count: 0 };
      tag.count++;
      tags.set(key, tag);
    }
  }
  return [...tags.values()].sort(
    (a, b) => b.count - a.count || collator.compare(a.label, b.label),
  );
}

export async function getSite() {
  const entry = await getEntry('site', 'about');
  if (!entry) throw new Error('Chybí soubor src/content/site/about.md');
  return {
    ...entry.data,
    portrait: entry.data.portrait
      ? resolveImage(entry.data.portrait, 'portrét v O mně')
      : undefined,
    entry,
  };
}

export type Site = Awaited<ReturnType<typeof getSite>>;

/** schema.org Person pro úvodní stránku a O mně. */
export async function personSchema(site: Site, origin: URL | undefined) {
  const portrait = site.portrait
    ? await getImage({ src: site.portrait, width: Math.min(site.portrait.width, 800), format: 'jpg' })
    : undefined;
  return {
    '@type': 'Person',
    name: site.name,
    description: site.tagline,
    url: new URL(url('/'), origin).href,
    email: site.email ? `mailto:${site.email}` : undefined,
    image: portrait ? new URL(portrait.src, origin).href : undefined,
    sameAs: site.socials.map((s) => s.url),
  };
}

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Odkaz v rámci webu s ohledem na `base` z astro.config.mjs. */
export function url(path = '/'): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const projectUrl = (project: Project) => url(`/projekty/${project.id}/`);

/** Název pro view transition – cover se při přechodu „přelije“ z karty do detailu. */
export const transitionName = (project: Project) =>
  `cover-${project.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

/** Markdown → prostý text pro meta description (bez **, odkazů, nadpisů…). */
export function plainText(markdown: string | undefined, max = 160): string {
  const text = (markdown ?? '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .replace(/^\s{0,3}(#{1,6}|>|[-*+]|\d+\.)\s+/gm, '')
    .replace(/[*_`~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** "https://www.instagram.com/jmeno/" → "instagram.com/jmeno" */
export const displayUrl = (link: string) =>
  link.replace(/^[a-z]+:\/\/(www\.)?/i, '').replace(/^mailto:/, '').replace(/\/$/, '');

/** 4 → "04" */
export const pad = (n: number) => String(n).padStart(2, '0');

/** České tvary: 1 obrázek, 2–4 obrázky, 5+ obrázků. */
export function plural(n: number, forms: [string, string, string]): string {
  const form = n === 1 ? forms[0] : n >= 2 && n <= 4 ? forms[1] : forms[2];
  return `${n} ${form}`;
}
