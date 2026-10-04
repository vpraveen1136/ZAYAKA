import { describe, it, expect } from 'vitest';
import { findSimilarRecipe, normalizeDishName } from '../src/services/duplicate';
import { Recipe } from '../src/types';

describe('Duplicate Detection Service', () => {
  const sampleCatalogue: Recipe[] = [
    {
      id: 'R0001',
      name: 'Paneer Butter Masala',
      url: 'https://youtube.com/watch?v=1',
      meal: ['lunch', 'dinner'],
      category: 'lunch-dinner'
    },
    {
      id: 'R0002',
      name: 'Kanda Poha',
      url: 'https://youtube.com/watch?v=2',
      meal: ['breakfast'],
      category: 'breakfast'
    },
    {
      id: 'R0003',
      name: 'Dal Makhani',
      url: 'https://youtube.com/watch?v=3',
      meal: ['dinner'],
      category: 'lunch-dinner'
    }
  ];

  it('normalizes dish names correctly', () => {
    expect(normalizeDishName('  Paneer   Butter  Masala!  ')).toBe('paneer butter masala');
    expect(normalizeDishName('Dal-Tadka (Dhaba Style)')).toBe('dal tadka dhaba style');
  });

  it('detects exact dish name matches regardless of casing', () => {
    const res = findSimilarRecipe('paneer butter masala', sampleCatalogue);
    expect(res.isDuplicate).toBe(true);
    expect(res.matchedRecipe?.id).toBe('R0001');
    expect(res.confidence).toBe(1.0);
  });

  it('detects inverted token names like "Butter Paneer Masala"', () => {
    const res = findSimilarRecipe('Butter Paneer Masala', sampleCatalogue);
    expect(res.isDuplicate).toBe(true);
    expect(res.matchedRecipe?.id).toBe('R0001');
  });

  it('detects substring containment matches like "Restaurant Style Paneer Butter Masala"', () => {
    const res = findSimilarRecipe('Restaurant Style Paneer Butter Masala', sampleCatalogue);
    expect(res.isDuplicate).toBe(true);
    expect(res.matchedRecipe?.id).toBe('R0001');
  });

  it('does not flag completely different dishes', () => {
    const res = findSimilarRecipe('Palak Corn Subzi', sampleCatalogue);
    expect(res.isDuplicate).toBe(false);
    expect(res.matchedRecipe).toBeNull();
  });

  it('ignores the recipe itself when editing', () => {
    const res = findSimilarRecipe('Paneer Butter Masala', sampleCatalogue, 'R0001');
    expect(res.isDuplicate).toBe(false);
  });
});
