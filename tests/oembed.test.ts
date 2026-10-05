import { describe, it, expect } from 'vitest';
import {
  isYouTubeUrl,
  detectSource,
  cleanDishTitle,
  extractYouTubeVideoId,
  getYouTubeThumbnailUrl
} from '../src/services/oembed';

describe('YouTube oEmbed and Title Extraction Service', () => {
  it('correctly identifies YouTube URLs', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=k_l5fN0tI9c')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/k_l5fN0tI9c')).toBe(true);
    expect(isYouTubeUrl('https://youtube.com/shorts/k_l5fN0tI9c?feature=share')).toBe(true);
    expect(isYouTubeUrl('https://www.youtube.com/embed/k_l5fN0tI9c')).toBe(true);
    expect(isYouTubeUrl('https://hebbarskitchen.com/paneer-butter-masala/')).toBe(false);
  });

  it('detects correct source for URLs', () => {
    expect(detectSource('https://youtu.be/abc12345')).toBe('youtube');
    expect(detectSource('https://cookwithmanali.com/recipe')).toBe('website');
  });

  it('strips chef channels and noise from video titles', () => {
    const raw = 'Restaurant Style Paneer Butter Masala | Easy Recipe | Chef Ranveer Brar';
    const cleaned = cleanDishTitle(raw);
    expect(cleaned).toBe('Paneer Butter Masala');
  });

  it('cleans promotional words and how-to prefixes', () => {
    const raw2 = 'How to make Crispy Kanda Poha at home - Easy Breakfast Recipe';
    const cleaned2 = cleanDishTitle(raw2);
    expect(cleaned2).toContain('Kanda Poha');
  });

  it('handles bracketed notes gracefully', () => {
    const raw3 = 'Dhaba Style Dal Tadka [Hindi] (Quick & Delicious)';
    const cleaned3 = cleanDishTitle(raw3);
    expect(cleaned3).toContain('Dal Tadka');
  });
});

describe('Phase 2 YouTube Video ID & Thumbnail Extraction', () => {
  it('1. extracts video ID from standard youtube.com/watch URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=k_l5fN0tI9c')).toBe('k_l5fN0tI9c');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?v=k_l5fN0tI9c&feature=share')).toBe('k_l5fN0tI9c');
    expect(extractYouTubeVideoId('https://www.youtube.com/watch?feature=share&v=k_l5fN0tI9c')).toBe('k_l5fN0tI9c');
    expect(extractYouTubeVideoId('https://m.youtube.com/watch?v=k_l5fN0tI9c')).toBe('k_l5fN0tI9c');
  });

  it('2. extracts video ID from youtu.be URL', () => {
    expect(extractYouTubeVideoId('https://youtu.be/k_l5fN0tI9c')).toBe('k_l5fN0tI9c');
    expect(extractYouTubeVideoId('https://youtu.be/k_l5fN0tI9c?si=abc123xyz')).toBe('k_l5fN0tI9c');
  });

  it('3. extracts video ID from YouTube Shorts URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/J32V_rL3Uls')).toBe('J32V_rL3Uls');
    expect(extractYouTubeVideoId('https://www.youtube.com/shorts/J32V_rL3Uls?feature=share')).toBe('J32V_rL3Uls');
  });

  it('4. extracts video ID from YouTube embed URL', () => {
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/k_l5fN0tI9c')).toBe('k_l5fN0tI9c');
    expect(extractYouTubeVideoId('https://www.youtube.com/embed/k_l5fN0tI9c?autoplay=1')).toBe('k_l5fN0tI9c');
    expect(extractYouTubeVideoId('https://www.youtube-nocookie.com/embed/k_l5fN0tI9c')).toBe('k_l5fN0tI9c');
  });

  it('5. safely returns null for invalid URLs or empty strings', () => {
    expect(extractYouTubeVideoId('not-a-url')).toBeNull();
    expect(extractYouTubeVideoId('')).toBeNull();
    expect(extractYouTubeVideoId('   ')).toBeNull();
    expect(extractYouTubeVideoId(null)).toBeNull();
    expect(extractYouTubeVideoId(undefined)).toBeNull();
  });

  it('6. safely returns null for non-YouTube URLs', () => {
    expect(extractYouTubeVideoId('https://example.com/recipe/paneer')).toBeNull();
    expect(extractYouTubeVideoId('https://cookwithmanali.com/paneer-butter-masala/')).toBeNull();
    expect(extractYouTubeVideoId('https://instagram.com/p/12345/')).toBeNull();
    expect(extractYouTubeVideoId('https://youtube.com/feed/subscriptions')).toBeNull();
  });

  it('7. generates correct medium-quality thumbnail URL (mqdefault.jpg)', () => {
    const thumbUrl = getYouTubeThumbnailUrl('https://www.youtube.com/watch?v=k_l5fN0tI9c');
    expect(thumbUrl).toBe('https://i.ytimg.com/vi/k_l5fN0tI9c/mqdefault.jpg');

    const shortThumb = getYouTubeThumbnailUrl('https://www.youtube.com/shorts/J32V_rL3Uls');
    expect(shortThumb).toBe('https://i.ytimg.com/vi/J32V_rL3Uls/mqdefault.jpg');

    const youtuBeThumb = getYouTubeThumbnailUrl('https://youtu.be/ABC123xyz');
    expect(youtuBeThumb).toBe('https://i.ytimg.com/vi/ABC123xyz/mqdefault.jpg');
  });

  it('8. returns null thumbnail for non-YouTube or invalid URLs allowing recipe card fallback', () => {
    expect(getYouTubeThumbnailUrl('https://tarla-dalal.com/recipe-1')).toBeNull();
    expect(getYouTubeThumbnailUrl('invalid-url')).toBeNull();
    expect(getYouTubeThumbnailUrl(null)).toBeNull();
  });
});
