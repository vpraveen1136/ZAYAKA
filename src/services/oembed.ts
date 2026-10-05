import { RecipeSource } from '../types';

/**
 * Extract YouTube video ID from common YouTube URL formats:
 * - https://www.youtube.com/watch?v=VIDEO_ID
 * - https://youtu.be/VIDEO_ID
 * - https://www.youtube.com/shorts/VIDEO_ID
 * - https://www.youtube.com/embed/VIDEO_ID
 * Safely returns null for non-YouTube URLs or invalid URLs.
 */
export function extractYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();
  if (!trimmed) return null;

  try {
    // 1. Check youtu.be/VIDEO_ID
    const youtuBeMatch = trimmed.match(/^https?:\/\/(?:www\.|m\.)?youtu\.be\/([a-zA-Z0-9_-]+)/i);
    if (youtuBeMatch && youtuBeMatch[1]) {
      return youtuBeMatch[1];
    }

    // 2. Check youtube.com/shorts/VIDEO_ID or youtube.com/embed/VIDEO_ID
    const pathMatch = trimmed.match(/^https?:\/\/(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/(?:shorts|embed)\/([a-zA-Z0-9_-]+)/i);
    if (pathMatch && pathMatch[1]) {
      return pathMatch[1];
    }

    // 3. Check youtube.com/watch?v=VIDEO_ID
    const watchMatch = trimmed.match(/^https?:\/\/(?:www\.|m\.)?youtube(?:-nocookie)?\.com\/watch\?[^#]*\bv=([a-zA-Z0-9_-]+)/i);
    if (watchMatch && watchMatch[1]) {
      return watchMatch[1];
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Generate YouTube medium quality thumbnail URL from video ID:
 * https://i.ytimg.com/vi/{VIDEO_ID}/mqdefault.jpg
 */
export function getYouTubeThumbnailUrl(url: string | null | undefined): string | null {
  const videoId = extractYouTubeVideoId(url);
  if (!videoId) return null;
  return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return extractYouTubeVideoId(url) !== null;
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
