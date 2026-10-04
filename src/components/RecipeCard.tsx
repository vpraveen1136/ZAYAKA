import React from 'react';
import { Star, Play, Send, ExternalLink } from 'lucide-react';
import { Recipe, Category, AccessRole } from '../types';
import { shareToCook } from '../services/sharing';

interface RecipeCardProps {
  recipe: Recipe;
  categories: Category[];
  role: AccessRole | null;
  onSelect: (recipe: Recipe) => void;
  onToggleFavourite?: (recipe: Recipe) => void;
}

export const RecipeCard: React.FC<RecipeCardProps> = ({
  recipe,
  categories,
  role,
  onSelect,
  onToggleFavourite
}) => {
  const categoryName = categories.find((c) => c.id === recipe.category)?.name || recipe.category;

  // Format meta line: "Sabzi (Paneer) · Lunch · Dinner"
  const metaParts: string[] = [];
  if (recipe.subCategory) {
    metaParts.push(recipe.subCategory);
  } else {
    metaParts.push(categoryName);
  }

  if (recipe.meal && recipe.meal.length > 0) {
    const mealCapitalized = recipe.meal.map(
      (m) => m.charAt(0).toUpperCase() + m.slice(1)
    );
    metaParts.push(...mealCapitalized);
  }

  const metaString = metaParts.join(' · ');

  const handleOpenUrl = (e: React.MouseEvent) => {
    e.stopPropagation();
    window.open(recipe.url, '_blank', 'noopener,noreferrer');
  };

  const handleSendToCook = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await shareToCook(recipe);
  };

  const handleStarClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (role === 'editor' && onToggleFavourite) {
      onToggleFavourite(recipe);
    }
  };

  return (
    <div className="recipe-card" onClick={() => onSelect(recipe)}>
      <div className="recipe-card-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {recipe.favourite ? (
            <button
              type="button"
              onClick={handleStarClick}
              disabled={role !== 'editor'}
              style={{
                padding: 0,
                minHeight: '28px',
                width: '28px',
                color: '#D97706',
                cursor: role === 'editor' ? 'pointer' : 'default'
              }}
              title={role === 'editor' ? 'Click to toggle favourite' : 'Favourite'}
              aria-label="Favourite"
            >
              <Star size={20} fill="#D97706" />
            </button>
          ) : role === 'editor' ? (
            <button
              type="button"
              onClick={handleStarClick}
              style={{
                padding: 0,
                minHeight: '28px',
                width: '28px',
                color: '#D1D5DB',
                cursor: 'pointer'
              }}
              title="Add to favourites"
              aria-label="Add to favourites"
            >
              <Star size={20} />
            </button>
          ) : null}

          <h3 className="recipe-card-title">{recipe.name}</h3>
        </div>

        {recipe.source === 'youtube' && (
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#DC2626',
              background: '#FEE2E2',
              padding: '2px 6px',
              borderRadius: '6px'
            }}
          >
            YT
          </span>
        )}
      </div>

      <div className="recipe-meta-line">{metaString}</div>

      <div className="recipe-actions">
        <button
          type="button"
          className="btn-open-recipe"
          onClick={handleOpenUrl}
          aria-label="Open Recipe URL"
        >
          {recipe.source === 'youtube' ? <Play size={16} fill="currentColor" /> : <ExternalLink size={16} />}
          <span>Open Recipe</span>
        </button>

        <button
          type="button"
          className="btn-send-cook"
          onClick={handleSendToCook}
          aria-label="Send to Cook on WhatsApp"
        >
          <Send size={15} />
          <span>Send to Cook</span>
        </button>
      </div>
    </div>
  );
};
