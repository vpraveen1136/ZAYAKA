import React from 'react';
import { Star, Clock } from 'lucide-react';
import { Category } from '../types';

interface CategoryPillsProps {
  categories: Category[];
  activeFilter: {
    type: 'all' | 'category' | 'subcategory' | 'favourite' | 'recent';
    value: string;
  };
  onSelectFilter: (filter: {
    type: 'all' | 'category' | 'subcategory' | 'favourite' | 'recent';
    value: string;
  }) => void;
}

export const CategoryPills: React.FC<CategoryPillsProps> = ({
  categories,
  activeFilter,
  onSelectFilter
}) => {
  const isSelected = (type: string, val: string) => {
    return activeFilter.type === type && activeFilter.value === val;
  };

  const handleToggle = (type: 'category' | 'subcategory' | 'favourite' | 'recent', val: string) => {
    if (isSelected(type, val)) {
      onSelectFilter({ type: 'all', value: '' });
    } else {
      onSelectFilter({ type, value: val });
    }
  };

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Quick Access: Favourites & Recently Added & All */}
      <div className="filter-section" style={{ marginBottom: '12px' }}>
        <div className="pills-scroll">
          <button
            type="button"
            className={`pill-btn ${activeFilter.type === 'all' ? 'active' : ''}`}
            onClick={() => onSelectFilter({ type: 'all', value: '' })}
          >
            All Recipes
          </button>

          <button
            type="button"
            className={`pill-btn fav-pill ${isSelected('favourite', 'true') ? 'active' : ''}`}
            onClick={() => handleToggle('favourite', 'true')}
          >
            <Star size={15} style={{ marginRight: '6px', fill: isSelected('favourite', 'true') ? '#FFFFFF' : '#D97706' }} />
            Favourites
          </button>

          <button
            type="button"
            className={`pill-btn ${isSelected('recent', 'true') ? 'active' : ''}`}
            onClick={() => handleToggle('recent', 'true')}
          >
            <Clock size={15} style={{ marginRight: '6px' }} />
            Recently Added
          </button>
        </div>
      </div>

      {/* Render each dynamic category with subcategories */}
      {categories.map((cat) => (
        <div key={cat.id} className="filter-section">
          <div
            className="filter-section-title"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer'
            }}
            onClick={() => handleToggle('category', cat.id)}
          >
            <span
              style={{
                color: isSelected('category', cat.id) ? 'var(--accent-terracotta)' : 'inherit',
                fontWeight: isSelected('category', cat.id) ? 800 : 700
              }}
            >
              {cat.name} {isSelected('category', cat.id) && '✓'}
            </span>
          </div>

          <div className="pills-scroll">
            {cat.subCategories.map((sub) => {
              const active = isSelected('subcategory', sub);
              return (
                <button
                  key={sub}
                  type="button"
                  className={`pill-btn ${active ? 'active' : ''}`}
                  onClick={() => handleToggle('subcategory', sub)}
                >
                  {sub}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
