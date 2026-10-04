import React, { useState } from 'react';
import { X, Plus, Trash2, Edit2, Check, AlertTriangle } from 'lucide-react';
import { Category, Recipe } from '../types';

interface CategoryManagerModalProps {
  categories: Category[];
  recipes: Recipe[];
  onClose: () => void;
  onSaveCategories: (updatedCategories: Category[]) => void;
}

export const CategoryManagerModal: React.FC<CategoryManagerModalProps> = ({
  categories,
  recipes,
  onClose,
  onSaveCategories
}) => {
  const [cats, setCats] = useState<Category[]>(JSON.parse(JSON.stringify(categories)));
  const [newCatName, setNewCatName] = useState('');
  const [newSubName, setNewSubName] = useState<{ [catId: string]: string }>({});
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [editingCatName, setEditingCatName] = useState('');
  const [errorNotice, setErrorNotice] = useState<string | null>(null);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNotice(null);
    const trimmed = newCatName.trim();
    if (!trimmed) return;

    const id = trimmed.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
    if (cats.some((c) => c.id === id)) {
      setErrorNotice('A category with this name already exists.');
      return;
    }

    const updated = [...cats, { id, name: trimmed, subCategories: [] }];
    setCats(updated);
    setNewCatName('');
    onSaveCategories(updated);
  };

  const handleDeleteCategory = (catId: string) => {
    setErrorNotice(null);
    // Protect against deleting category used by recipes (Requirement 7)
    const usageCount = recipes.filter((r) => r.category === catId).length;
    if (usageCount > 0) {
      setErrorNotice(
        `Cannot delete this category: it is currently used by ${usageCount} recipe(s). Please reassign those recipes first.`
      );
      return;
    }

    const updated = cats.filter((c) => c.id !== catId);
    setCats(updated);
    onSaveCategories(updated);
  };

  const handleSaveRenameCategory = (catId: string) => {
    if (!editingCatName.trim()) return;
    const updated = cats.map((c) =>
      c.id === catId ? { ...c, name: editingCatName.trim() } : c
    );
    setCats(updated);
    setEditingCatId(null);
    onSaveCategories(updated);
  };

  const handleAddSubCategory = (catId: string) => {
    const subText = (newSubName[catId] || '').trim();
    if (!subText) return;

    const updated = cats.map((c) => {
      if (c.id === catId) {
        if (c.subCategories.includes(subText)) return c;
        return { ...c, subCategories: [...c.subCategories, subText] };
      }
      return c;
    });

    setCats(updated);
    setNewSubName({ ...newSubName, [catId]: '' });
    onSaveCategories(updated);
  };

  const handleDeleteSubCategory = (catId: string, subName: string) => {
    const updated = cats.map((c) => {
      if (c.id === catId) {
        return {
          ...c,
          subCategories: c.subCategories.filter((s) => s !== subName)
        };
      }
      return c;
    });
    setCats(updated);
    onSaveCategories(updated);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-grabber" />

        <div className="modal-header">
          <h2 style={{ fontSize: '1.4rem' }}>Manage Categories</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {errorNotice && (
          <div className="alert-box" style={{ background: '#FEE2E2', borderColor: '#FCA5A5', color: '#991B1B', marginBottom: '16px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 600 }}>
              <AlertTriangle size={16} />
              <span>{errorNotice}</span>
            </div>
          </div>
        )}

        {/* Add New Category Input */}
        <form onSubmit={handleAddCategory} style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="New Category (e.g. Desserts)"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button
            type="submit"
            style={{
              padding: '0 16px',
              background: 'var(--accent-terracotta)',
              color: '#FFFFFF',
              gap: '4px',
              borderRadius: '12px'
            }}
          >
            <Plus size={18} />
            <span>Add</span>
          </button>
        </form>

        {/* List of Categories & Subcategories */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {cats.map((cat) => (
            <div
              key={cat.id}
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '14px',
                padding: '14px',
                background: 'var(--bg-color)'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                {editingCatId === cat.id ? (
                  <div style={{ display: 'flex', gap: '6px', flex: 1, marginRight: '8px' }}>
                    <input
                      type="text"
                      className="form-input"
                      value={editingCatName}
                      onChange={(e) => setEditingCatName(e.target.value)}
                      style={{ height: '36px', fontSize: '0.95rem' }}
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => handleSaveRenameCategory(cat.id)}
                      style={{ height: '36px', padding: '0 10px', background: '#10B981', color: '#FFFFFF' }}
                    >
                      <Check size={16} />
                    </button>
                  </div>
                ) : (
                  <div style={{ fontWeight: 700, fontSize: '1.05rem', color: 'var(--text-main)' }}>
                    {cat.name}
                  </div>
                )}

                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditingCatId(cat.id);
                      setEditingCatName(cat.name);
                    }}
                    style={{ minHeight: '32px', width: '32px', color: 'var(--text-muted)' }}
                    title="Rename"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id)}
                    style={{ minHeight: '32px', width: '32px', color: '#DC2626' }}
                    title="Delete category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              {/* Subcategories list */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '10px' }}>
                {cat.subCategories.map((sub) => (
                  <span
                    key={sub}
                    style={{
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '8px',
                      padding: '4px 8px',
                      fontSize: '0.82rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    <span>{sub}</span>
                    <button
                      type="button"
                      onClick={() => handleDeleteSubCategory(cat.id, sub)}
                      style={{ minHeight: '20px', width: '20px', padding: 0, color: '#9CA3AF' }}
                      aria-label="Remove subcategory"
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>

              {/* Add subcategory input */}
              <div style={{ display: 'flex', gap: '6px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Add subcategory..."
                  value={newSubName[cat.id] || ''}
                  onChange={(e) => setNewSubName({ ...newSubName, [cat.id]: e.target.value })}
                  style={{ height: '36px', fontSize: '0.86rem', flex: 1 }}
                />
                <button
                  type="button"
                  onClick={() => handleAddSubCategory(cat.id)}
                  style={{
                    height: '36px',
                    padding: '0 12px',
                    background: '#F3ECE1',
                    color: 'var(--text-main)',
                    fontSize: '0.82rem'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
