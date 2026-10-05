import { describe, it, expect } from 'vitest';
import { Recipe, Category } from '../src/types';

describe('Phase 1 Home Screen Filters & Navigation', () => {
  const sampleCategories: Category[] = [
    {
      id: 'breakfast',
      name: 'Breakfast',
      subCategories: ['Paratha', 'Poha', 'Upma', 'South Indian', 'Eggs', 'Sandwich', 'Other']
    },
    {
      id: 'lunch-dinner',
      name: 'Lunch / Dinner',
      subCategories: ['Dal', 'Sabzi (Dry)', 'Sabzi (Gravy)', 'Sabzi (Paneer)', 'Rice', 'Roti / Paratha', 'Non-Veg', 'Salad / Raita', 'Other']
    },
    {
      id: 'tea-snacks',
      name: 'Tea / Snacks',
      subCategories: ['Pakoda', 'Chaat', 'Sandwich', 'Bakery', 'Namkeen', 'Other']
    },
    {
      id: 'sweets',
      name: 'Sweets',
      subCategories: ['Indian', 'Western', 'Other']
    }
  ];

  const sampleRecipes: Recipe[] = [
    {
      id: 'R1',
      name: 'Crispy Aloo Paratha',
      url: 'https://youtube.com/watch?v=1',
      meal: ['breakfast', 'lunch'],
      category: 'breakfast',
      subCategory: 'Paratha',
      tags: ['spicy', 'potato'],
      favourite: true,
      createdAt: '2026-10-01T10:00:00Z'
    },
    {
      id: 'R2',
      name: 'Kanda Poha',
      url: 'https://youtube.com/watch?v=2',
      meal: ['breakfast', 'tea'],
      category: 'breakfast',
      subCategory: 'Poha',
      tags: ['light', 'quick'],
      favourite: false,
      createdAt: '2026-10-02T10:00:00Z'
    },
    {
      id: 'R3',
      name: 'Paneer Butter Masala',
      url: 'https://youtube.com/watch?v=3',
      meal: ['lunch', 'dinner'],
      category: 'lunch-dinner',
      subCategory: 'Sabzi (Paneer)',
      tags: ['gravy', 'north-indian'],
      favourite: true,
      createdAt: '2026-10-03T10:00:00Z'
    },
    {
      id: 'R4',
      name: 'Dal Tadka',
      url: 'https://youtube.com/watch?v=4',
      meal: ['lunch', 'dinner'],
      category: 'lunch-dinner',
      subCategory: 'Dal',
      tags: ['dhaba', 'yellow-dal'],
      favourite: false,
      createdAt: '2026-10-04T10:00:00Z'
    },
    {
      id: 'R5',
      name: 'Gulab Jamun',
      url: 'https://youtube.com/watch?v=5',
      meal: ['dinner'],
      category: 'sweets',
      subCategory: 'Indian',
      tags: ['dessert'],
      favourite: true,
      createdAt: '2026-10-05T10:00:00Z'
    },
    {
      id: 'R6',
      name: 'Onion Pakoda',
      url: 'https://youtube.com/watch?v=6',
      meal: ['tea'],
      category: 'tea-snacks',
      subCategory: 'Pakoda',
      tags: ['rainy', 'crunchy'],
      favourite: false,
      createdAt: '2026-10-02T15:00:00Z'
    }
  ];

  // Helper matching the App.tsx filter logic
  function applyFilters(
    recipes: Recipe[],
    categories: Category[],
    primaryFilter: 'all' | 'favourites' | 'recent',
    mealFilter: string,
    subCategoryFilter: string,
    searchQuery: string
  ): Recipe[] {
    let result = [...recipes];

    // 1. Primary Filter: Favourites
    if (primaryFilter === 'favourites') {
      result = result.filter((r) => r.favourite);
    }

    // 2. Meal Filter
    if (mealFilter !== 'all') {
      if (mealFilter === 'breakfast') {
        result = result.filter((r) => r.meal?.includes('breakfast') || r.category === 'breakfast');
      } else if (mealFilter === 'lunch') {
        result = result.filter((r) => r.meal?.includes('lunch') || r.category === 'lunch-dinner');
      } else if (mealFilter === 'dinner') {
        result = result.filter((r) => r.meal?.includes('dinner') || r.category === 'lunch-dinner');
      } else if (mealFilter === 'tea-snacks') {
        result = result.filter((r) => r.meal?.includes('tea') || r.category === 'tea-snacks');
      } else if (mealFilter === 'sweets') {
        result = result.filter((r) => r.category === 'sweets' || (r.meal as string[])?.includes('sweets'));
      } else {
        result = result.filter((r) => r.category === mealFilter);
      }
    }

    // 3. Subcategory Filter
    if (subCategoryFilter && subCategoryFilter !== 'all') {
      result = result.filter((r) => r.subCategory === subCategoryFilter);
    }

    // 4. Primary Filter: Recently Added (Sort)
    if (primaryFilter === 'recent') {
      result.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    }

    // 5. Instant Search
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter((r) => {
        const nameMatch = r.name.toLowerCase().includes(q);
        const subMatch = r.subCategory ? r.subCategory.toLowerCase().includes(q) : false;
        const catObj = categories.find((c) => c.id === r.category);
        const catMatch = (catObj?.name || r.category).toLowerCase().includes(q);
        const tagMatch = r.tags ? r.tags.some((t) => t.toLowerCase().includes(q)) : false;
        return nameMatch || subMatch || catMatch || tagMatch;
      });
    }

    return result;
  }

  it('A. Returns all recipes by default (primaryFilter=all, mealFilter=all)', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'all', 'all', '');
    expect(res).toHaveLength(6);
  });

  it('B. Filters by Favourites only', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'favourites', 'all', 'all', '');
    expect(res).toHaveLength(3);
    expect(res.map((r) => r.id)).toEqual(['R1', 'R3', 'R5']);
  });

  it('C. Sorts by Recently Added descending', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'recent', 'all', 'all', '');
    expect(res[0].id).toBe('R5'); // Oct 5
    expect(res[1].id).toBe('R4'); // Oct 4
    expect(res[2].id).toBe('R3'); // Oct 3
  });

  it('D. Filters by Meal Tab: Breakfast', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'breakfast', 'all', '');
    expect(res.map((r) => r.id)).toEqual(['R1', 'R2']);
  });

  it('E. Filters by Meal Tab: Lunch', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'lunch', 'all', '');
    expect(res.map((r) => r.id)).toEqual(['R1', 'R3', 'R4']);
  });

  it('F. Filters by Meal Tab: Tea/Snacks', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'tea-snacks', 'all', '');
    expect(res.map((r) => r.id)).toEqual(['R2', 'R6']);
  });

  it('G. Filters by Meal Tab: Sweets', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'sweets', 'all', '');
    expect(res.map((r) => r.id)).toEqual(['R5']);
  });

  it('H. Filters by Contextual Subcategory (Breakfast + Paratha)', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'breakfast', 'Paratha', '');
    expect(res.map((r) => r.id)).toEqual(['R1']);
  });

  it('I. Supports combination: Breakfast + Paratha + search term ("spicy")', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'all', 'breakfast', 'Paratha', 'spicy');
    expect(res.map((r) => r.id)).toEqual(['R1']);

    const emptyRes = applyFilters(sampleRecipes, sampleCategories, 'all', 'breakfast', 'Paratha', 'chocolate');
    expect(emptyRes).toHaveLength(0);
  });

  it('J. Supports combination: Favourites + Breakfast', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'favourites', 'breakfast', 'all', '');
    expect(res.map((r) => r.id)).toEqual(['R1']);
  });

  it('K. Supports combination: Recently Added + Lunch', () => {
    const res = applyFilters(sampleRecipes, sampleCategories, 'recent', 'lunch', 'all', '');
    // Lunch has R1 (Oct 1), R3 (Oct 3), R4 (Oct 4). Ordered newest first:
    expect(res.map((r) => r.id)).toEqual(['R4', 'R3', 'R1']);
  });

  it('L. Clearing meal filter ("all") restores full recipe list', () => {
    let res = applyFilters(sampleRecipes, sampleCategories, 'all', 'sweets', 'all', '');
    expect(res).toHaveLength(1);
    res = applyFilters(sampleRecipes, sampleCategories, 'all', 'all', 'all', '');
    expect(res).toHaveLength(6);
  });
});
