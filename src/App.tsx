import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Plus, BookOpen } from 'lucide-react';
import { Recipe, Category, AccessRole, SyncStatus } from './types';
import { getStoredAccess, clearAccess } from './services/auth';
import {
  getAllRecipes,
  addOrUpdateRecipe as dbAddOrUpdateRecipe,
  deleteRecipe as dbDeleteRecipe,
  getAllCategories,
  saveCategories,
  getPendingSync
} from './services/storage';
import {
  syncCatalogueFromRemote,
  pushCatalogueToGitHub,
  flushPendingSync
} from './services/sync';
import { Header } from './components/Header';
import { WelcomeModal } from './components/WelcomeModal';
import { SearchBar } from './components/SearchBar';
import { CategoryPills, PrimaryFilterType, MealFilterType } from './components/CategoryPills';
import { RecipeCard } from './components/RecipeCard';
import { RecipeDetailModal } from './components/RecipeDetailModal';
import { RecipeFormModal } from './components/RecipeFormModal';
import { CategoryManagerModal } from './components/CategoryManagerModal';
import { SettingsModal } from './components/SettingsModal';

export const App: React.FC = () => {
  // Authentication & Role
  const [access, setAccess] = useState(() => getStoredAccess());

  // Data State
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  // Sync & Network status
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    lastSyncTime: null,
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingCount: 0,
    syncState: 'synced',
    error: null
  });

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [primaryFilter, setPrimaryFilter] = useState<PrimaryFilterType>('all');
  const [mealFilter, setMealFilter] = useState<MealFilterType>('all');
  const [subCategoryFilter, setSubCategoryFilter] = useState<string>('all');

  // Modal states
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCategoryManagerOpen, setIsCategoryManagerOpen] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Show transient toast
  const showToast = (msg: string) => {
    setFeedbackMessage(msg);
    setTimeout(() => setFeedbackMessage(null), 4000);
  };

  // 1. Initial Load from IndexedDB & Background Sync
  const loadLocalAndSync = useCallback(async () => {
    try {
      // Immediate instantaneous load from local IndexedDB cache
      const [localRecipes, localCategories, pending] = await Promise.all([
        getAllRecipes(),
        getAllCategories(),
        getPendingSync()
      ]);

      if (localRecipes.length > 0) {
        setRecipes(localRecipes);
      }
      if (localCategories.length > 0) {
        setCategories(localCategories);
      }
      setLoading(false);

      const hasPending = Boolean(pending);
      const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: true,
        pendingCount: hasPending ? 1 : 0
      }));

      // If pending changes exist and we are online, attempt flush first
      if (hasPending && isOnline) {
        await flushPendingSync();
      }

      // Background remote sync from authoritative source (GitHub via Worker / Pages)
      const syncResult = await syncCatalogueFromRemote();

      const freshRecipes = await getAllRecipes();
      const freshCategories = await getAllCategories();
      const updatedPending = await getPendingSync();

      setRecipes(freshRecipes);
      setCategories(freshCategories);

      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        pendingCount: updatedPending ? 1 : 0,
        syncState: updatedPending ? (isOnline ? 'failed' : 'offline_pending') : 'synced',
        lastSyncTime: syncResult.lastSyncTime,
        error: syncResult.error || null
      }));
    } catch (err) {
      console.warn('Initial load / sync issue:', err);
      setLoading(false);
      setSyncStatus((prev) => ({ ...prev, isSyncing: false }));
    }
  }, []);

  useEffect(() => {
    loadLocalAndSync();

    // Online / Offline listeners
    const handleOnline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: true }));
      loadLocalAndSync();
    };
    const handleOffline = () => {
      setSyncStatus((prev) => ({ ...prev, isOnline: false }));
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // 2. Check for iPhone Share Sheet Web Share Target parameters
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const sharedUrl = urlParams.get('url') || urlParams.get('text');
      if (sharedUrl && (sharedUrl.startsWith('http') || sharedUrl.includes('youtu'))) {
        const match = sharedUrl.match(/(https?:\/\/[^\s]+)/g);
        const targetUrl = match ? match[0] : sharedUrl;

        setEditingRecipe({
          id: '',
          name: urlParams.get('title') || '',
          url: targetUrl,
          meal: ['lunch', 'dinner'],
          category: 'lunch-dinner'
        });
        setIsAddModalOpen(true);

        window.history.replaceState({}, document.title, window.location.pathname);
      }
    } catch (e) {
      console.warn('Failed parsing share target params:', e);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [loadLocalAndSync]);

  // Auth callbacks
  const handleAuthSuccess = (role: AccessRole) => {
    setAccess({ code: null, role, isLoggedIn: true });
    showToast(`Welcome! Logged in as ${role === 'editor' ? 'Editor' : 'Viewer'}`);
  };

  const handleResetAccess = () => {
    clearAccess();
    setAccess({ code: null, role: null, isLoggedIn: false });
    setIsSettingsOpen(false);
  };

  // Recipe CRUD actions (Editor only)
  const handleSaveRecipe = async (recipe: Recipe) => {
    try {
      // 1. Stage in local cache immediately so UI is responsive
      await dbAddOrUpdateRecipe(recipe);
      const updatedList = await getAllRecipes();
      setRecipes(updatedList);

      // 2. Authenticated write to GitHub via Worker
      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      const syncRes = await pushCatalogueToGitHub(updatedList, categories);

      if (syncRes.success) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'synced',
          pendingCount: 0,
          error: null
        }));
        showToast(`Saved "${recipe.name}" & synced to GitHub!`);
      } else if (syncRes.isOffline) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'offline_pending',
          pendingCount: 1,
          error: null
        }));
        showToast(`Saved locally — pending sync to GitHub (offline)`);
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'failed',
          pendingCount: 1,
          error: syncRes.message
        }));
        showToast(`Saved locally, but NOT synced to GitHub: ${syncRes.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncState: 'failed',
        error: msg
      }));
      showToast(`Error saving recipe: ${msg}`);
    }
  };

  const handleDeleteRecipe = async (recipeId: string) => {
    try {
      await dbDeleteRecipe(recipeId);
      const updatedList = await getAllRecipes();
      setRecipes(updatedList);

      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      const syncRes = await pushCatalogueToGitHub(updatedList, categories);

      if (syncRes.success) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'synced',
          pendingCount: 0,
          error: null
        }));
        showToast('Recipe deleted & synced to GitHub.');
      } else if (syncRes.isOffline) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'offline_pending',
          pendingCount: 1
        }));
        showToast('Deleted locally — pending sync to GitHub (offline)');
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'failed',
          pendingCount: 1,
          error: syncRes.message
        }));
        showToast(`Deleted locally, but NOT synced to GitHub: ${syncRes.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Delete failed: ${msg}`);
    }
  };

  const handleToggleFavourite = async (recipe: Recipe) => {
    if (access.role !== 'editor') return;
    const updatedRecipe: Recipe = {
      ...recipe,
      favourite: !recipe.favourite,
      updatedAt: new Date().toISOString()
    };
    await handleSaveRecipe(updatedRecipe);
    if (selectedRecipe && selectedRecipe.id === recipe.id) {
      setSelectedRecipe(updatedRecipe);
    }
  };

  // Categories Save action
  const handleSaveCategories = async (updatedCategories: Category[]) => {
    try {
      setCategories(updatedCategories);
      await saveCategories(updatedCategories);

      setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
      const syncRes = await pushCatalogueToGitHub(recipes, updatedCategories);

      if (syncRes.success) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'synced',
          pendingCount: 0,
          error: null
        }));
        showToast('Categories updated & synced to GitHub.');
      } else if (syncRes.isOffline) {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'offline_pending',
          pendingCount: 1
        }));
        showToast('Categories updated locally — pending sync (offline)');
      } else {
        setSyncStatus((prev) => ({
          ...prev,
          isSyncing: false,
          syncState: 'failed',
          pendingCount: 1,
          error: syncRes.message
        }));
        showToast(`Categories updated locally, but NOT synced to GitHub: ${syncRes.message}`);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Category update failed: ${msg}`);
    }
  };

  const handleRetrySync = async () => {
    setSyncStatus((prev) => ({ ...prev, isSyncing: true }));
    const res = await flushPendingSync();
    if (res.flushed) {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncState: 'synced',
        pendingCount: 0,
        error: null
      }));
      showToast('Successfully synced pending changes to GitHub!');
      await loadLocalAndSync();
    } else {
      setSyncStatus((prev) => ({
        ...prev,
        isSyncing: false,
        syncState: 'failed',
        error: res.message
      }));
      showToast(`Sync failed: ${res.message}`);
    }
  };

  // Filter & Search Logic (Fast and local against cached recipes)
  const filteredRecipes = useMemo(() => {
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

    // 3. Subcategory (Contextual Category) Filter
    if (subCategoryFilter && subCategoryFilter !== 'all') {
      result = result.filter((r) => r.subCategory === subCategoryFilter);
    }

    // 4. Primary Filter: Recently Added (Sort newest first)
    if (primaryFilter === 'recent') {
      result.sort((a, b) => {
        const timeA = new Date(a.createdAt || a.updatedAt || 0).getTime();
        const timeB = new Date(b.createdAt || b.updatedAt || 0).getTime();
        return timeB - timeA;
      });
    }

    // 5. Instant local search across: dish name, category, subcategory, tags
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
  }, [recipes, categories, primaryFilter, mealFilter, subCategoryFilter, searchQuery]);

  // If first launch and not authenticated, render WelcomeModal
  if (!access.isLoggedIn) {
    return <WelcomeModal onSuccess={handleAuthSuccess} />;
  }

  return (
    <>
      <Header
        role={access.role}
        syncStatus={syncStatus}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onRefresh={loadLocalAndSync}
      />

      <main className="container" style={{ flex: 1, paddingBottom: '80px' }}>
        {/* Instant Search Bar */}
        <SearchBar
          value={searchQuery}
          onChange={setSearchQuery}
          onClear={() => setSearchQuery('')}
        />

        {/* Compact Tiered Filter Navigation */}
        <CategoryPills
          categories={categories}
          primaryFilter={primaryFilter}
          onSelectPrimaryFilter={setPrimaryFilter}
          mealFilter={mealFilter}
          onSelectMealFilter={setMealFilter}
          subCategoryFilter={subCategoryFilter}
          onSelectSubCategoryFilter={setSubCategoryFilter}
        />

        {/* Transient feedback toast */}
        {feedbackMessage && (
          <div
            style={{
              background: syncStatus.syncState === 'failed' ? '#991B1B' : '#241E1A',
              color: '#FFFFFF',
              padding: '10px 16px',
              borderRadius: '12px',
              fontSize: '0.88rem',
              marginBottom: '14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(0,0,0,0.15)',
              animation: 'fadeIn 0.2s ease'
            }}
          >
            <span>{feedbackMessage}</span>
          </div>
        )}

        {/* Recipe Cards List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-muted)' }}>
            Loading catalogue...
          </div>
        ) : filteredRecipes.length > 0 ? (
          <div>
            {filteredRecipes.map((recipe) => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                categories={categories}
                role={access.role}
                onSelect={(r) => setSelectedRecipe(r)}
                onToggleFavourite={handleToggleFavourite}
              />
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: 'center',
              padding: '48px 20px',
              background: 'var(--bg-card)',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '20px',
              marginTop: '12px'
            }}
          >
            <BookOpen size={40} color="var(--text-muted)" style={{ margin: '0 auto 12px auto' }} />
            <h3 style={{ fontSize: '1.2rem', marginBottom: '6px' }}>No recipes found</h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
              {searchQuery
                ? `No recipes match "${searchQuery}". Try a different keyword.`
                : 'No recipes match the selected filters.'}
            </p>
            {(primaryFilter !== 'all' || mealFilter !== 'all' || subCategoryFilter !== 'all' || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setPrimaryFilter('all');
                  setMealFilter('all');
                  setSubCategoryFilter('all');
                  setSearchQuery('');
                }}
                style={{
                  marginTop: '14px',
                  background: 'var(--chip-bg)',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  padding: '0 16px',
                  height: '38px',
                  fontSize: '0.86rem',
                  borderRadius: '19px',
                  fontWeight: 600
                }}
              >
                Clear all filters
              </button>
            )}
            {access.role === 'editor' && !searchQuery && primaryFilter === 'all' && mealFilter === 'all' && (
              <button
                type="button"
                onClick={() => {
                  setEditingRecipe(null);
                  setIsAddModalOpen(true);
                }}
                style={{
                  marginTop: '16px',
                  background: 'var(--accent-terracotta)',
                  color: '#FFFFFF',
                  padding: '0 18px',
                  height: '42px',
                  fontSize: '0.9rem'
                }}
              >
                + Add First Recipe
              </button>
            )}
          </div>
        )}
      </main>

      {/* Floating Action Button "+ Add Recipe" (Visible ONLY to Editor) */}
      {access.role === 'editor' && (
        <button
          type="button"
          className="fab-add"
          onClick={() => {
            setEditingRecipe(null);
            setIsAddModalOpen(true);
          }}
          aria-label="Add Recipe"
        >
          <Plus size={20} />
          <span>Add Recipe</span>
        </button>
      )}

      {/* Recipe Detail Modal */}
      {selectedRecipe && (
        <RecipeDetailModal
          recipe={selectedRecipe}
          categories={categories}
          role={access.role}
          onClose={() => setSelectedRecipe(null)}
          onEdit={(recipe) => {
            setSelectedRecipe(null);
            setEditingRecipe(recipe);
            setIsAddModalOpen(true);
          }}
          onDelete={handleDeleteRecipe}
          onToggleFavourite={handleToggleFavourite}
        />
      )}

      {/* Add / Edit Recipe Modal */}
      {isAddModalOpen && (
        <RecipeFormModal
          initialRecipe={editingRecipe}
          categories={categories}
          existingRecipes={recipes}
          onClose={() => {
            setIsAddModalOpen(false);
            setEditingRecipe(null);
          }}
          onSave={handleSaveRecipe}
        />
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <SettingsModal
          role={access.role}
          syncStatus={syncStatus}
          recipes={recipes}
          categories={categories}
          onClose={() => setIsSettingsOpen(false)}
          onRefresh={loadLocalAndSync}
          onRetrySync={handleRetrySync}
          onResetAccess={handleResetAccess}
          onOpenCategoryManager={() => setIsCategoryManagerOpen(true)}
        />
      )}

      {/* Category Manager Modal (Editor Only) */}
      {isCategoryManagerOpen && (
        <CategoryManagerModal
          categories={categories}
          recipes={recipes}
          onClose={() => setIsCategoryManagerOpen(false)}
          onSaveCategories={handleSaveCategories}
        />
      )}
    </>
  );
};
export default App;
