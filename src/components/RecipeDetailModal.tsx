import React, { useState } from 'react';
import { X, Play, Send, ExternalLink, Edit3, Trash2, Star, AlertTriangle } from 'lucide-react';
import { Recipe, Category, AccessRole } from '../types';
import { shareToCook } from '../services/sharing';

interface RecipeDetailModalProps {
  recipe: Recipe;
  categories: Category[];
  role: AccessRole | null;
  onClose: () => void;
  onEdit: (recipe: Recipe) => void;
  onDelete: (recipeId: string) => void;
  onToggleFavourite: (recipe: Recipe) => void;
}

export const RecipeDetailModal: React.FC<RecipeDetailModalProps> = ({
  recipe,
  categories,
  role,
  onClose,
  onEdit,
  onDelete,
  onToggleFavourite
}) => {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const categoryObj = categories.find((c) => c.id === recipe.category);
  const categoryName = categoryObj?.name || recipe.category;

  const handleOpenUrl = () => {
    window.open(recipe.url, '_blank', 'noopener,noreferrer');
  };

  const handleSendToCook = async () => {
    await shareToCook(recipe);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-grabber" />

        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {recipe.favourite ? (
              <span style={{ color: '#D97706', display: 'flex', alignItems: 'center' }}>
                <Star size={24} fill="#D97706" />
              </span>
            ) : null}
            <span
              style={{
                fontSize: '0.78rem',
                textTransform: 'uppercase',
                fontWeight: 700,
                color: 'var(--accent-terracotta)',
                letterSpacing: '0.05em'
              }}
            >
              Recipe Details
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Dish Title */}
        <h2 style={{ fontSize: '1.75rem', marginBottom: '16px', lineHeight: 1.25 }}>
          {recipe.name}
        </h2>

        {/* Meta Info Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}>
          <span
            style={{
              padding: '6px 12px',
              borderRadius: '10px',
              background: '#F3ECE1',
              fontSize: '0.85rem',
              fontWeight: 600,
              color: 'var(--text-main)'
            }}
          >
            Category: {categoryName}
          </span>

          {recipe.subCategory && (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                background: '#F3ECE1',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: 'var(--text-main)'
              }}
            >
              {recipe.subCategory}
            </span>
          )}

          {recipe.meal && recipe.meal.map((m) => (
            <span
              key={m}
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                background: '#FEF3C7',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: '#92400E',
                textTransform: 'capitalize'
              }}
            >
              {m}
            </span>
          ))}

          {recipe.source && (
            <span
              style={{
                padding: '6px 12px',
                borderRadius: '10px',
                background: recipe.source === 'youtube' ? '#FEE2E2' : '#E0F2FE',
                fontSize: '0.85rem',
                fontWeight: 600,
                color: recipe.source === 'youtube' ? '#DC2626' : '#0369A1',
                textTransform: 'capitalize'
              }}
            >
              {recipe.source}
            </span>
          )}
        </div>

        {/* Tags */}
        {recipe.tags && recipe.tags.length > 0 && (
          <div style={{ marginBottom: '24px' }}>
            <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>
              Tags
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
              {recipe.tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '8px',
                    border: '1px solid var(--border-subtle)',
                    fontSize: '0.82rem',
                    color: 'var(--text-muted)'
                  }}
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Delete Confirmation Alert (Requirement 25) */}
        {showDeleteConfirm && (
          <div className="alert-box" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 700 }}>
              <AlertTriangle size={18} />
              <span>Delete this recipe?</span>
            </div>
            <p style={{ fontSize: '0.86rem', marginBottom: '12px' }}>
              This will remove &quot;{recipe.name}&quot; from the catalogue for all family members.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                onClick={() => setShowDeleteConfirm(false)}
                style={{ flex: 1, height: '40px', background: '#FFFFFF', color: '#374151', border: '1px solid #D1D5DB' }}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  onDelete(recipe.id);
                  onClose();
                }}
                style={{ flex: 1, height: '40px', background: '#DC2626', color: '#FFFFFF' }}
              >
                Delete
              </button>
            </div>
          </div>
        )}

        {/* Primary Actions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '12px' }}>
          <button
            type="button"
            className="btn-send-cook"
            onClick={handleSendToCook}
            style={{ width: '100%', height: '52px', fontSize: '1.05rem', borderRadius: '14px' }}
          >
            <Send size={18} />
            <span>SEND TO COOK</span>
          </button>

          <button
            type="button"
            className="btn-open-recipe"
            onClick={handleOpenUrl}
            style={{ width: '100%', height: '50px', fontSize: '1rem', borderRadius: '14px' }}
          >
            {recipe.source === 'youtube' ? <Play size={18} fill="currentColor" /> : <ExternalLink size={18} />}
            <span>WATCH / OPEN RECIPE</span>
          </button>

          {/* Editor Actions */}
          {role === 'editor' && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '8px' }}>
              <button
                type="button"
                onClick={() => onToggleFavourite(recipe)}
                style={{
                  height: '46px',
                  background: recipe.favourite ? '#FFFBEB' : 'var(--bg-color)',
                  color: recipe.favourite ? '#B45309' : 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  gap: '6px'
                }}
              >
                <Star size={16} fill={recipe.favourite ? '#B45309' : 'none'} />
                <span>{recipe.favourite ? 'Starred' : 'Star'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  onEdit(recipe);
                  onClose();
                }}
                style={{
                  height: '46px',
                  background: 'var(--bg-color)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  gap: '6px'
                }}
              >
                <Edit3 size={16} />
                <span>Edit</span>
              </button>

              <button
                type="button"
                onClick={() => setShowDeleteConfirm(true)}
                style={{
                  height: '46px',
                  background: '#FEF2F2',
                  color: '#DC2626',
                  border: '1px solid #FECACA',
                  borderRadius: '12px',
                  fontSize: '0.86rem',
                  gap: '6px'
                }}
              >
                <Trash2 size={16} />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
