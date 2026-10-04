import { describe, it, expect } from 'vitest';
import { isYouTubeUrl, detectSource, cleanDishTitle } from '../src/services/oembed';

describe('YouTube oEmbed and Title Extraction Service', () => {
  it('correctly identifies YouTube URLs', () => {
    expect(isYouTubeUrl('https://www.youtube.com/watch?v=k_l5fN0tI9c')).toBe(true);
    expect(isYouTubeUrl('https://youtu.be/k_l5fN0tI9c')).toBe(true);
    expect(isYouTubeUrl('https://youtube.com/shorts/k_l5fN0tI9c?feature=share')).toBe(true);
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
