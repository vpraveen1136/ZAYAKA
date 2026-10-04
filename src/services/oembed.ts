import { RecipeSource } from '../types';

export function isYouTubeUrl(url: string): boolean {
  if (!url) return false;
  return /(?:youtube\.com\/(?:watch\?v=|shorts\/)|youtu\.be\/)/i.test(url.trim());
}

export function detectSource(url: string): RecipeSource {
  return isYouTubeUrl(url) ? 'youtube' : 'website';
}

/**
 * Clean and refine a raw YouTube title into a clean Dish Name.
 * Example:
 * "Restaurant Style Paneer Butter Masala | Easy Recipe by Ranveer Brar"
 * -> "Paneer Butter Masala"
 */
export function cleanDishTitle(rawTitle: string): string {
  if (!rawTitle) return '';

  let title = rawTitle;

  // 1. Remove emojis and special decorative glyphs
  title = title.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ');

  // 2. Remove common bracketed/parenthetical metadata (e.g. [Hindi], (Easy Recipe), (Dhaba Style))
  title = title.replace(/\[[^\]]*\]/g, ' ');
  title = title.replace(/\([^)]*(?:recipe|easy|style|hindi|english|quick|minutes|secret)[^)]*\)/gi, ' ');

  // 3. Split on common delimiters: '|', '•', '—', '-'
  const parts = title.split(/[|•—–]/);
  // Pick the segment most likely to be the dish name (usually the first part)
  title = parts[0] || title;

  // 4. Strip common recipe promotional prefixes and suffixes
  const noisePatterns = [
    /\bhow to (?:make|cook|prepare)\b/gi,
    /\brestaurant style\b/gi,
    /\bdhaba style\b/gi,
    /\bhotel style\b/gi,
    /\bhalwai style\b/gi,
    /\bauthentic\b/gi,
    /\bsecret recipe\b/gi,
    /\beasy recipe\b/gi,
    /\bquick (?:and|&) easy\b/gi,
    /\bstep by step\b/gi,
    /\bat home\b/gi,
    /\bghar par kaise banaye\b/gi,
    /\bbanane ka tarika\b/gi,
    /\bhealthy\b/gi,
    /\bdelicious\b/gi,
    /\btraditional\b/gi,
    /\bperfect\b/gi,
    /\brecipe\b/gi
  ];

  for (const pattern of noisePatterns) {
    title = title.replace(pattern, ' ');
  }

  // 5. Clean up non-alphanumeric separators, double spaces, and trim
  title = title.replace(/[:\-,\/]/g, ' ').replace(/\s+/g, ' ').trim();

  // 6. Title-case words nicely
  if (title.length > 0) {
    title = title
      .split(' ')
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
      .join(' ');
  }

  return title;
}

/**
 * Fetch video title using YouTube oEmbed without requiring an API key.
 */
export async function fetchYouTubeTitle(url: string): Promise<string | null> {
  if (!isYouTubeUrl(url)) return null;

  const trimmed = url.trim();

  // 1. Try official YouTube oEmbed API
  try {
    const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(trimmed)}&format=json`;
    const res = await fetch(oembedUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return cleanDishTitle(data.title) || data.title;
      }
    }
  } catch (err) {
    // Official endpoint may fail due to CORS in some browser configurations, fallback to noembed
    console.warn('YouTube oembed error, attempting fallback:', err);
  }

  // 2. Try noembed.com CORS proxy
  try {
    const fallbackUrl = `https://noembed.com/embed?url=${encodeURIComponent(trimmed)}`;
    const res = await fetch(fallbackUrl);
    if (res.ok) {
      const data = await res.json();
      if (data && data.title) {
        return cleanDishTitle(data.title) || data.title;
      }
    }
  } catch (err) {
    console.warn('Fallback oembed error:', err);
  }

  return null;
}
