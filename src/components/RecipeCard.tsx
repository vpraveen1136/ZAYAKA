import React, { useState } from 'react';
import { Star, Play, Send, ExternalLink, Utensils } from 'lucide-react';
import { Recipe, Category, AccessRole } from '../types';
import { shareToCook } from '../services/sharing';
import { getYouTubeThumbnailUrl, isYouTubeUrl } from '../services/oembed';

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
  const [imageError, setImageError] = useState(false);

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

  const isYT = isYouTubeUrl(recipe.url);
  const thumbnailUrl = !imageError ? getYouTubeThumbnailUrl(recipe.url) : null;
  const showThumbnail = Boolean(thumbnailUrl && !imageError);

  const handleOpenUrl = (e: React.MouseEvent | React.KeyboardEvent) => {
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
    <div
      className="recipe-card"
      onClick={() => onSelect(recipe)}
      role="article"
      aria-label={recipe.name}
    >
      {/* 1. 16:9 Thumbnail or Clean Generic Placeholder */}
      <div
        className="recipe-thumbnail-wrapper"
        onClick={handleOpenUrl}
        role="button"
        tabIndex={0}
        aria-label={`Open video for ${recipe.name}`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            handleOpenUrl(e);
          }
        }}
      >
        {showThumbnail ? (
          <>
            <img
              src={thumbnailUrl!}
              alt={recipe.name}
              loading="lazy"
              decoding="async"
              className="recipe-thumbnail-img"
              onError={() => setImageError(true)}
            />
            {/* Subtle Play Indicator Overlay */}
            <div className="recipe-play-overlay" aria-hidden="true">
              <div className="recipe-play-badge">
                <Play size={18} fill="#FFFFFF" color="#FFFFFF" style={{ marginLeft: '2px' }} />
              </div>
            </div>
          </>
        ) : (
          /* Non-YouTube or Image Error Fallback */
          <div className="recipe-placeholder-wrapper" aria-hidden="true">
            <div className="recipe-placeholder-icon">
              {isYT ? (
                <Play size={24} fill="var(--accent-terracotta)" color="var(--accent-terracotta)" />
              ) : (
                <Utensils size={26} color="var(--text-muted)" />
              )}
            </div>
            <span className="recipe-placeholder-label">
              {isYT ? 'Video Recipe' : 'Web Recipe'}
            </span>
          </div>
        )}
      </div>

      {/* 2. Recipe Card Body Content */}
      <div className="recipe-card-content">
        <div className="recipe-card-header">
          <div className="recipe-card-title-group">
            {recipe.favourite ? (
              <button
                type="button"
                onClick={handleStarClick}
                disabled={role !== 'editor'}
                className="btn-star-card"
                title={role === 'editor' ? 'Click to toggle favourite' : 'Favourite'}
                aria-label="Favourite"
              >
                <Star size={18} fill="#D97706" color="#D97706" />
              </button>
            ) : role === 'editor' ? (
              <button
                type="button"
                onClick={handleStarClick}
                className="btn-star-card"
                title="Add to favourites"
                aria-label="Add to favourites"
              >
                <Star size={18} color="#D1D5DB" />
              </button>
            ) : null}

            <h3 className="recipe-card-title">{recipe.name}</h3>
          </div>

          {recipe.source === 'youtube' && (
            <span className="badge-yt-source" title="YouTube video recipe">
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
            {recipe.source === 'youtube' ? <Play size={15} fill="currentColor" /> : <ExternalLink size={15} />}
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
    </div>
  );
};
