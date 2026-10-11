import type { APIRoute } from 'astro';
import { getSettings, url } from '../lib/projects';

// Roboti, kteří sbírají obsah pro trénink AI. Vyhledávače (Google, Bing,
// Seznam) blokovány nejsou, web se v nich dál zobrazuje.
const AI_BOTS = [
  'GPTBot',
  'ChatGPT-User',
  'CCBot',
  'Google-Extended',
  'ClaudeBot',
  'anthropic-ai',
  'PerplexityBot',
  'Bytespider',
  'Applebot-Extended',
  'meta-externalagent',
  'cohere-ai',
  'Diffbot',
  'ImagesiftBot',
];

export const GET: APIRoute = async ({ site }) => {
  const { blockAi } = await getSettings();
  const lines = ['User-agent: *', 'Allow: /', ''];
  if (blockAi) {
    for (const bot of AI_BOTS) lines.push(`User-agent: ${bot}`);
    lines.push('Disallow: /', '');
  }
  lines.push(`Sitemap: ${new URL(url('/sitemap-index.xml'), site).href}`, '');
  return new Response(lines.join('\n'), {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
