import type { ImageMetadata } from 'astro';
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
    year: data.date.getFullYear(),
    category: data.category,
    tags,
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

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** Odkaz v rámci webu s ohledem na `base` z astro.config.mjs. */
export function url(path = '/'): string {
  return `${base}${path.startsWith('/') ? path : `/${path}`}`;
}

export const projectUrl = (project: Project) => url(`/projekty/${project.id}/`);

/** Název pro view transition – cover se při přechodu „přelije“ z karty do detailu. */
export const transitionName = (project: Project) =>
  `cover-${project.id.replace(/[^a-zA-Z0-9_-]/g, '-')}`;

/** 4 → "04" */
export const pad = (n: number) => String(n).padStart(2, '0');

/** České tvary: 1 obrázek, 2–4 obrázky, 5+ obrázků. */
export function plural(n: number, forms: [string, string, string]): string {
  const form = n === 1 ? forms[0] : n >= 2 && n <= 4 ? forms[1] : forms[2];
  return `${n} ${form}`;
}
