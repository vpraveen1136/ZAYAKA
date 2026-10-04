import React, { useState } from 'react';
import { X, Clipboard, Loader2, AlertCircle } from 'lucide-react';
import { Recipe, Category, MealType, RecipeSource } from '../types';
import { fetchYouTubeTitle, detectSource, isYouTubeUrl } from '../services/oembed';
import { findSimilarRecipe, DuplicateCheckResult } from '../services/duplicate';

interface RecipeFormModalProps {
  initialRecipe?: Recipe | null;
  categories: Category[];
  existingRecipes: Recipe[];
  onClose: () => void;
  onSave: (recipe: Recipe) => void;
}

export const RecipeFormModal: React.FC<RecipeFormModalProps> = ({
  initialRecipe,
  categories,
  existingRecipes,
  onClose,
  onSave
}) => {
  const isEditing = Boolean(initialRecipe);

  const [url, setUrl] = useState(initialRecipe?.url || '');
  const [name, setName] = useState(initialRecipe?.name || '');
  const [source, setSource] = useState<RecipeSource>(initialRecipe?.source || 'youtube');
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>(initialRecipe?.meal || ['lunch', 'dinner']);
  const [category, setCategory] = useState(initialRecipe?.category || categories[0]?.id || 'lunch-dinner');
  const [subCategory, setSubCategory] = useState(initialRecipe?.subCategory || '');
  const [tagsInput, setTagsInput] = useState(initialRecipe?.tags?.join(', ') || '');
  const [favourite, setFavourite] = useState(initialRecipe?.favourite || false);

  const [isExtracting, setIsExtracting] = useState(false);
  const [duplicateWarning, setDuplicateWarning] = useState<DuplicateCheckResult | null>(null);
  const [userAcknowledgedDuplicate, setUserAcknowledgedDuplicate] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Current category subcategories
  const currentCategoryObj = categories.find((c) => c.id === category);
  const availableSubCategories = currentCategoryObj?.subCategories || [];

  // YouTube auto-title extraction
  const handleUrlBlurOrChange = async (newUrl: string) => {
    setUrl(newUrl);
    if (!newUrl) return;

    const detected = detectSource(newUrl);
    setSource(detected);

    if (isYouTubeUrl(newUrl) && (!name || !isEditing)) {
      setIsExtracting(true);
      try {
        const extractedTitle = await fetchYouTubeTitle(newUrl);
        if (extractedTitle) {
          setName(extractedTitle);
          // Check for duplicate on extracted name
          const dup = findSimilarRecipe(extractedTitle, existingRecipes, initialRecipe?.id);
          if (dup.isDuplicate) {
            setDuplicateWarning(dup);
          }
        }
      } catch (e) {
        console.warn('Auto extraction failed:', e);
      } finally {
        setIsExtracting(false);
      }
    }
  };

  // Check duplicate when name changes
  const handleNameChange = (newName: string) => {
    setName(newName);
    setUserAcknowledgedDuplicate(false);
    if (newName.trim().length >= 3) {
      const dup = findSimilarRecipe(newName, existingRecipes, initialRecipe?.id);
      setDuplicateWarning(dup.isDuplicate ? dup : null);
    } else {
      setDuplicateWarning(null);
    }
  };

  const handlePasteClipboard = async () => {
    try {
      if (navigator.clipboard && navigator.clipboard.readText) {
        const text = await navigator.clipboard.readText();
        if (text && text.startsWith('http')) {
          await handleUrlBlurOrChange(text);
        }
      }
    } catch (e) {
      console.warn('Clipboard read failed:', e);
    }
  };

  const toggleMeal = (meal: MealType) => {
    setSelectedMeals((prev) =>
      prev.includes(meal) ? prev.filter((m) => m !== meal) : [...prev, meal]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    if (!url.trim()) {
      setValidationError('Please enter a Recipe URL.');
      return;
    }
    try {
      new URL(url.trim());
    } catch {
      setValidationError('Please enter a valid URL (e.g. https://youtube.com/...)');
      return;
    }

    if (!name.trim()) {
      setValidationError('Dish name is required.');
      return;
    }

    if (selectedMeals.length === 0) {
      setValidationError('Please select at least one meal (Breakfast, Lunch, Dinner, Tea).');
      return;
    }

    if (!category) {
      setValidationError('Please select a category.');
      return;
    }

    // If duplicate warning is active and not yet acknowledged
    if (duplicateWarning?.isDuplicate && !userAcknowledgedDuplicate && !isEditing) {
      return; // UI renders duplicate prompt
    }

    const tags = tagsInput
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);

    const now = new Date().toISOString();
    const recipeToSave: Recipe = {
      id: initialRecipe?.id || `R${Date.now().toString().slice(-5)}`,
      name: name.trim(),
      url: url.trim(),
      source,
      meal: selectedMeals,
      category,
      subCategory: subCategory.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      favourite,
      addedBy: initialRecipe?.addedBy || 'family',
      createdAt: initialRecipe?.createdAt || now,
      updatedAt: now
    };

    onSave(recipeToSave);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-grabber" />

        <div className="modal-header">
          <h2 style={{ fontSize: '1.4rem' }}>
            {isEditing ? 'Edit Recipe' : 'Add Recipe'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Recipe URL */}
          <div className="form-group">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Recipe URL *
              </label>
              <button
                type="button"
                onClick={handlePasteClipboard}
                style={{
                  minHeight: '28px',
                  padding: '2px 8px',
                  background: '#F3ECE1',
                  color: 'var(--accent-terracotta)',
                  fontSize: '0.78rem',
                  gap: '4px',
                  borderRadius: '6px'
                }}
              >
                <Clipboard size={12} />
                <span>Paste</span>
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <input
                type="url"
                className="form-input"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onBlur={(e) => handleUrlBlurOrChange(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                required
              />
              {isExtracting && (
                <div style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--accent-terracotta)' }}>
                  <Loader2 size={18} className="animate-spin" />
                </div>
              )}
            </div>
            {isYouTubeUrl(url) && (
              <div style={{ fontSize: '0.78rem', color: '#10B981', marginTop: '4px', fontWeight: 600 }}>
                ✓ YouTube link detected
              </div>
            )}
          </div>

          {/* Dish Name */}
          <div className="form-group">
            <label className="form-label">Dish Name *</label>
            <input
              type="text"
              className="form-input"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Paneer Butter Masala"
              required
            />
          </div>

          {/* Duplicate Detection Prompt (Requirement 6 & 16) */}
          {duplicateWarning?.isDuplicate && !userAcknowledgedDuplicate && (
            <div
              className="alert-box"
              style={{
                background: '#FFFBEB',
                borderColor: '#FCD34D',
                color: '#92400E',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, marginBottom: '4px' }}>
                <AlertCircle size={16} />
                <span>Possible existing recipe</span>
              </div>
              <p style={{ fontSize: '0.86rem', marginBottom: '8px' }}>
                &quot;<strong>{duplicateWarning.matchedRecipe?.name}</strong>&quot; is already in your catalogue.
              </p>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  type="button"
                  onClick={() => setUserAcknowledgedDuplicate(true)}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    background: '#D97706',
                    color: '#FFFFFF',
                    fontSize: '0.82rem',
                    borderRadius: '8px'
                  }}
                >
                  Add as another recipe
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    background: '#FFFFFF',
                    color: '#4B5563',
                    border: '1px solid #D1D5DB',
                    fontSize: '0.82rem',
                    borderRadius: '8px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Meal Multi-select Chips */}
          <div className="form-group">
            <label className="form-label">Meal *</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {(['breakfast', 'lunch', 'dinner', 'tea'] as MealType[]).map((m) => {
                const active = selectedMeals.includes(m);
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMeal(m)}
                    className={`pill-btn ${active ? 'active' : ''}`}
                    style={{ textTransform: 'capitalize', height: '40px' }}
                  >
                    {active ? '✓ ' : ''}{m}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Category Dropdown */}
          <div className="form-group">
            <label className="form-label">Category *</label>
            <select
              className="form-select"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubCategory('');
              }}
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* Subcategory Dropdown */}
          {availableSubCategories.length > 0 && (
            <div className="form-group">
              <label className="form-label">Subcategory (optional)</label>
              <select
                className="form-select"
                value={subCategory}
                onChange={(e) => setSubCategory(e.target.value)}
              >
                <option value="">Select subcategory...</option>
                {availableSubCategories.map((sub) => (
                  <option key={sub} value={sub}>
                    {sub}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Tags */}
          <div className="form-group">
            <label className="form-label">Tags (comma-separated, optional)</label>
            <input
              type="text"
              className="form-input"
              value={tagsInput}
              onChange={(e) => setTagsInput(e.target.value)}
              placeholder="north-indian, spicy, quick"
            />
          </div>

          {/* Favourite Checkbox */}
          <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '10px', marginTop: '12px' }}>
            <input
              type="checkbox"
              id="fav-check"
              checked={favourite}
              onChange={(e) => setFavourite(e.target.checked)}
              style={{ width: '20px', height: '20px', accentColor: 'var(--accent-terracotta)', cursor: 'pointer' }}
            />
            <label htmlFor="fav-check" style={{ fontSize: '0.95rem', fontWeight: 600, cursor: 'pointer' }}>
              ⭐ Mark as Favourite
            </label>
          </div>

          {validationError && (
            <div style={{ color: '#DC2626', fontSize: '0.88rem', marginBottom: '16px', fontWeight: 500 }}>
              {validationError}
            </div>
          )}

          {/* Save Button */}
          <button
            type="submit"
            style={{
              width: '100%',
              height: '52px',
              background: 'var(--accent-terracotta)',
              color: '#FFFFFF',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: '14px',
              marginTop: '16px'
            }}
          >
            SAVE
          </button>
        </form>
      </div>
    </div>
  );
};
