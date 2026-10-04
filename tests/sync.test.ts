import { describe, it, expect } from 'vitest';
import { validateRecipe } from '../src/services/sync';
import { formatCookMessage } from '../src/services/sharing';
import { Category, Recipe } from '../src/types';

describe('Data Integrity & Sync Validation', () => {
  const categories: Category[] = [
    { id: 'breakfast', name: 'Breakfast', subCategories: ['Poha', 'Paratha'] },
    { id: 'lunch-dinner', name: 'Lunch / Dinner', subCategories: ['Dal', 'Sabzi'] }
  ];

  it('passes a fully valid recipe record', () => {
    const valid: Partial<Recipe> = {
      id: 'R100',
      name: 'Paneer Butter Masala',
      url: 'https://youtube.com/watch?v=xyz',
      meal: ['lunch', 'dinner'],
      category: 'lunch-dinner'
    };
    const res = validateRecipe(valid, categories);
    expect(res.isValid).toBe(true);
  });

  it('rejects recipes with missing name', () => {
    const invalid: Partial<Recipe> = {
      id: 'R101',
      name: '   ',
      url: 'https://youtube.com/watch?v=xyz',
      meal: ['lunch'],
      category: 'lunch-dinner'
    };
    const res = validateRecipe(invalid, categories);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('Dish name');
  });

  it('rejects recipes with invalid URL', () => {
    const invalid: Partial<Recipe> = {
      id: 'R102',
      name: 'Poha',
      url: 'not-a-valid-url',
      meal: ['breakfast'],
      category: 'breakfast'
    };
    const res = validateRecipe(invalid, categories);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('URL');
  });

  it('rejects recipes with empty meal types', () => {
    const invalid: Partial<Recipe> = {
      id: 'R103',
      name: 'Poha',
      url: 'https://youtube.com/watch?v=xyz',
      meal: [],
      category: 'breakfast'
    };
    const res = validateRecipe(invalid, categories);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('meal');
  });

  it('rejects recipes with non-existent category', () => {
    const invalid: Partial<Recipe> = {
      id: 'R104',
      name: 'Poha',
      url: 'https://youtube.com/watch?v=xyz',
      meal: ['breakfast'],
      category: 'non-existent-category'
    };
    const res = validateRecipe(invalid, categories);
    expect(res.isValid).toBe(false);
    expect(res.error).toContain('category');
  });

  it('formats concise WhatsApp message as required', () => {
    const recipe: Recipe = {
      id: 'R105',
      name: 'Paneer Butter Masala',
      url: 'https://youtu.be/k_l5fN0tI9c',
      meal: ['dinner'],
      category: 'lunch-dinner'
    };
    const msg = formatCookMessage(recipe);
    expect(msg).toBe('Please prepare *Paneer Butter Masala*.\n\nRecipe: https://youtu.be/k_l5fN0tI9c');
  });
});
