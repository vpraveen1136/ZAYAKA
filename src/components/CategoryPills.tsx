import React from 'react';
import { Star, Clock } from 'lucide-react';
import { Category } from '../types';

export type PrimaryFilterType = 'all' | 'favourites' | 'recent';
export type MealFilterType = 'all' | 'breakfast' | 'lunch' | 'dinner' | 'tea-snacks' | 'sweets' | string;

export interface CategoryPillsProps {
  categories: Category[];
  primaryFilter: PrimaryFilterType;
  onSelectPrimaryFilter: (filter: PrimaryFilterType) => void;
  mealFilter: MealFilterType;
  onSelectMealFilter: (meal: MealFilterType) => void;
  subCategoryFilter: string;
  onSelectSubCategoryFilter: (sub: string) => void;
}

interface MealTabItem {
  id: MealFilterType;
  label: string;
}

const DEFAULT_MEAL_TABS: MealTabItem[] = [
  { id: 'all', label: 'All' },
  { id: 'breakfast', label: 'Breakfast' },
  { id: 'lunch', label: 'Lunch' },
  { id: 'dinner', label: 'Dinner' },
  { id: 'tea-snacks', label: 'Tea/Snacks' },
  { id: 'sweets', label: 'Sweets' }
];

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  primaryFilter,
  onSelectPrimaryFilter,
  mealFilter,
  onSelectMealFilter,
  subCategoryFilter,
  onSelectSubCategoryFilter
}) => {
  // Helper to map selected meal tab to corresponding Category object
  const getCategoryForMeal = (meal: MealFilterType): Category | undefined => {
    if (meal === 'breakfast') return categories.find((c) => c.id === 'breakfast');
    if (meal === 'lunch' || meal === 'dinner') return categories.find((c) => c.id === 'lunch-dinner');
    if (meal === 'tea-snacks') return categories.find((c) => c.id === 'tea-snacks');
    if (meal === 'sweets') return categories.find((c) => c.id === 'sweets');
    return categories.find((c) => c.id === meal);
  };

  // Support any custom categories added by user without hard-coding
  const customTabs: MealTabItem[] = categories
    .filter((c) => !['breakfast', 'lunch-dinner', 'tea-snacks', 'sweets'].includes(c.id))
    .map((c) => ({ id: c.id, label: c.name }));

  const mealTabs: MealTabItem[] = [...DEFAULT_MEAL_TABS, ...customTabs];
  const activeMealCategory = mealFilter !== 'all' ? getCategoryForMeal(mealFilter) : undefined;
  const contextualSubCategories = activeMealCategory?.subCategories || [];

  return (
    <div className="home-filters-container">
      {/* 1. Compact Primary Filters Row */}
      <div className="filter-row primary-filter-row" role="group" aria-label="Primary recipe filters">
        <button
          type="button"
          className={`pill-btn ${primaryFilter === 'all' ? 'active' : ''}`}
          onClick={() => {
            onSelectPrimaryFilter('all');
          }}
          aria-pressed={primaryFilter === 'all'}
        >
          All Recipes
        </button>

        <button
          type="button"
          className={`pill-btn fav-pill ${primaryFilter === 'favourites' ? 'active' : ''}`}
          onClick={() => onSelectPrimaryFilter(primaryFilter === 'favourites' ? 'all' : 'favourites')}
          aria-pressed={primaryFilter === 'favourites'}
        >
          <Star
            size={14}
            style={{
              marginRight: '6px',
              fill: primaryFilter === 'favourites' ? '#FFFFFF' : '#D97706',
              stroke: primaryFilter === 'favourites' ? '#FFFFFF' : '#D97706'
            }}
          />
          Favourites
        </button>

        <button
          type="button"
          className={`pill-btn ${primaryFilter === 'recent' ? 'active' : ''}`}
          onClick={() => onSelectPrimaryFilter(primaryFilter === 'recent' ? 'all' : 'recent')}
          aria-pressed={primaryFilter === 'recent'}
        >
          <Clock size={14} style={{ marginRight: '6px' }} />
          Recently Added
        </button>
      </div>

      {/* 2. Compact Horizontally-Scrollable Meal Filter Tabs */}
      <div className="filter-row meal-tabs-row" role="tablist" aria-label="Meal filters">
        {mealTabs.map((tab) => {
          const isMealActive = mealFilter === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`pill-btn ${isMealActive ? 'active' : ''}`}
              onClick={() => {
                onSelectMealFilter(tab.id);
                onSelectSubCategoryFilter('all');
              }}
              role="tab"
              aria-selected={isMealActive}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 3. Contextual Category / Subcategory Filter Row (Only when a specific meal is selected) */}
      {mealFilter !== 'all' && contextualSubCategories.length > 0 && (
        <div className="filter-row subcategory-row" role="tablist" aria-label="Subcategory filters">
          <button
            type="button"
            className={`pill-btn pill-sub ${subCategoryFilter === 'all' || !subCategoryFilter ? 'active' : ''}`}
            onClick={() => onSelectSubCategoryFilter('all')}
            role="tab"
            aria-selected={subCategoryFilter === 'all' || !subCategoryFilter}
          >
            All
          </button>
          {contextualSubCategories.map((sub) => {
            const isSubActive = subCategoryFilter === sub;
            return (
              <button
                key={sub}
                type="button"
                className={`pill-btn pill-sub ${isSubActive ? 'active' : ''}`}
                onClick={() => onSelectSubCategoryFilter(isSubActive ? 'all' : sub)}
                role="tab"
                aria-selected={isSubActive}
              >
                {sub}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
