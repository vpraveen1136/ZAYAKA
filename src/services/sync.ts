import { Recipe, Category, SyncConfig } from '../types';
import {
  getAllRecipes,
  saveRecipes,
  getAllCategories,
  saveCategories,
  getMetadata,
  setMetadata,
  getPendingSync,
  setPendingSync,
  clearPendingSync
} from './storage';
import { getStoredEditorCredential } from './auth';

const CONFIG_KEY = 'zayaka_sync_config';

const DEFAULT_SYNC_CONFIG: SyncConfig = {
  serverlessUrl: ''
};

export function getSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        serverlessUrl: parsed.serverlessUrl || ''
      };
    }
  } catch (e) {
    console.error('Failed to read sync config:', e);
  }

  return DEFAULT_SYNC_CONFIG;
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save sync config:', e);
  }
}

// Track remote commit SHAs for optimistic concurrency
let lastKnownSha: { recipes?: string; categories?: string } = {};

/**
 * Validate recipe record integrity before any save/sync operation (Requirement 25)
 */
export function validateRecipe(
  recipe: Partial<Recipe>,
  validCategories: Category[]
): { isValid: boolean; error?: string } {
  if (!recipe.id || !recipe.id.trim()) {
    return { isValid: false, error: 'Recipe ID is missing.' };
  }
  if (!recipe.name || !recipe.name.trim()) {
    return { isValid: false, error: 'Dish name is required.' };
  }
  if (!recipe.url || !recipe.url.trim()) {
    return { isValid: false, error: 'Recipe URL is required.' };
  }

  try {
    new URL(recipe.url);
  } catch {
    return { isValid: false, error: 'Invalid Recipe URL format.' };
  }

  if (!recipe.meal || !Array.isArray(recipe.meal) || recipe.meal.length === 0) {
    return { isValid: false, error: 'At least one meal type (Breakfast, Lunch, Dinner, Tea) is required.' };
  }

  const validMeals = ['breakfast', 'lunch', 'dinner', 'tea'];
  for (const m of recipe.meal) {
    if (!validMeals.includes(m)) {
      return { isValid: false, error: `Invalid meal type: ${m}` };
    }
  }

  if (!recipe.category || !recipe.category.trim()) {
    return { isValid: false, error: 'Category is required.' };
  }

  if (validCategories.length > 0) {
    const categoryExists = validCategories.some((c) => c.id === recipe.category);
    if (!categoryExists) {
      return { isValid: false, error: `Invalid category selected: ${recipe.category}` };
    }
  }

  return { isValid: true };
}

/**
 * Fetch catalogue from authoritative source (Cloudflare Worker -> GitHub, or GitHub Pages static fallback)
 * GitHub is the source of truth; local IndexedDB is updated as the read cache.
 */
export async function syncCatalogueFromRemote(): Promise<{
  updated: boolean;
  recipesCount: number;
  lastSyncTime: string;
  source: 'worker_github' | 'github_pages' | 'offline_cache';
  error?: string;
}> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const prevSyncTime = await getMetadata('lastSyncTime');
  const config = getSyncConfig();

  if (!isOnline) {
    const localRecipes = await getAllRecipes();
    return {
      updated: false,
      recipesCount: localRecipes.length,
      lastSyncTime: prevSyncTime || 'Offline',
      source: 'offline_cache'
    };
  }

  // 1. If Worker URL is configured, read directly from GitHub via Worker (instant, 0-CDN delay)
  if (config.serverlessUrl) {
    try {
      const res = await fetch(`${config.serverlessUrl}?action=read&t=${Date.now()}`, {
        method: 'GET',
        headers: {
          Accept: 'application/json'
        }
      });

      if (res.ok) {
        const payload = await res.json();
        if (Array.isArray(payload.recipes)) {
          await saveRecipes(payload.recipes);
          if (Array.isArray(payload.categories) && payload.categories.length > 0) {
            await saveCategories(payload.categories);
          }

          if (payload.sha) {
            lastKnownSha = payload.sha;
          }

          const now = new Date().toISOString();
          await setMetadata('lastSyncTime', now);

          return {
            updated: true,
            recipesCount: payload.recipes.length,
            lastSyncTime: now,
            source: 'worker_github'
          };
        }
      }
    } catch (workerErr) {
      console.warn('Direct worker read failed, attempting static GitHub Pages fallback:', workerErr);
    }
  }

  // 2. Fallback: Fetch data/recipes.json and data/categories.json from GitHub Pages deployment
  try {
    const timestamp = Date.now();
    const [recipesRes, categoriesRes] = await Promise.all([
      fetch(`./data/recipes.json?t=${timestamp}`),
      fetch(`./data/categories.json?t=${timestamp}`)
    ]);

    if (recipesRes.ok && categoriesRes.ok) {
      const remoteRecipes: Recipe[] = await recipesRes.json();
      const remoteCategories: Category[] = await categoriesRes.json();

      await saveRecipes(remoteRecipes);
      await saveCategories(remoteCategories);

      const now = new Date().toISOString();
      await setMetadata('lastSyncTime', now);

      return {
        updated: true,
        recipesCount: remoteRecipes.length,
        lastSyncTime: now,
        source: 'github_pages'
      };
    }
  } catch (err) {
    console.warn('GitHub Pages catalogue fetch failed:', err);
  }

  const localRecipes = await getAllRecipes();
  return {
    updated: false,
    recipesCount: localRecipes.length,
    lastSyncTime: prevSyncTime || 'Offline',
    source: 'offline_cache'
  };
}

/**
 * Perform authenticated GitHub write via the Cloudflare Worker.
 * Enforces:
 * - Independent editor credential check
 * - Optimistic concurrency SHA check
 * - Staging into pending sync if offline or failed
 */
export async function pushCatalogueToGitHub(
  recipes: Recipe[],
  categories?: Category[]
): Promise<{
  success: boolean;
  message: string;
  isOffline?: boolean;
  isConflict?: boolean;
  error?: string;
}> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const config = getSyncConfig();
  const editorCredential = getStoredEditorCredential();

  // 1. Enforce editor credential presence on client
  if (!editorCredential) {
    return {
      success: false,
      message: 'Unauthorized: Editor access code is required for write operations.',
      error: 'Unauthorized'
    };
  }

  // 2. Offline handling (Requirement 8)
  if (!isOnline) {
    await setPendingSync({
      recipes,
      categories,
      timestamp: new Date().toISOString()
    });
    return {
      success: false,
      isOffline: true,
      message: 'Saved locally — pending sync to GitHub (device is offline).',
      error: 'Device is offline'
    };
  }

  // 3. Check worker URL configuration
  if (!config.serverlessUrl) {
    // Stage in pending sync so changes aren't lost
    await setPendingSync({
      recipes,
      categories,
      timestamp: new Date().toISOString()
    });
    return {
      success: false,
      message: 'Not synced to GitHub: Cloudflare Sync Worker URL is not configured in Settings.',
      error: 'Worker URL not configured'
    };
  }

  // 4. Send authenticated write request to Worker
  try {
    const res = await fetch(config.serverlessUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Access-Code': editorCredential
      },
      body: JSON.stringify({
        action: 'write',
        recipes,
        categories,
        expectedSha: lastKnownSha
      })
    });

    if (res.status === 401) {
      return {
        success: false,
        message: 'Not synced to GitHub: Worker rejected editor authorization (invalid code).',
        error: 'Unauthorized'
      };
    }

    if (res.status === 409) {
      return {
        success: false,
        isConflict: true,
        message: 'Not synced to GitHub: Conflict detected. Another family member modified the catalogue on GitHub. Please refresh.',
        error: 'Conflict'
      };
    }

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      const errMsg = errData.error || `Worker HTTP ${res.status}`;
      // Stage pending sync
      await setPendingSync({ recipes, categories, timestamp: new Date().toISOString() });
      return {
        success: false,
        message: `Not synced to GitHub: ${errMsg}`,
        error: errMsg
      };
    }

    const resJson = await res.json();
    if (resJson.sha) {
      lastKnownSha = { ...lastKnownSha, ...resJson.sha };
    }

    // Successfully committed to GitHub! Clear pending queue and update sync timestamp
    await clearPendingSync();
    const now = new Date().toISOString();
    await setMetadata('lastSyncTime', now);

    return {
      success: true,
      message: 'Catalogue written to GitHub successfully!'
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    // Stage in pending sync
    await setPendingSync({ recipes, categories, timestamp: new Date().toISOString() });
    return {
      success: false,
      message: `Not synced to GitHub: ${msg}`,
      error: msg
    };
  }
}

/**
 * Flush any pending changes that were queued while offline or when worker was unavailable
 */
export async function flushPendingSync(): Promise<{ flushed: boolean; message: string }> {
  const pending = await getPendingSync();
  if (!pending) {
    return { flushed: false, message: 'No pending changes to sync.' };
  }

  const recipes = pending.recipes || (await getAllRecipes());
  const categories = pending.categories || (await getAllCategories());

  const result = await pushCatalogueToGitHub(recipes, categories);
  if (result.success) {
    return { flushed: true, message: 'Pending changes synced to GitHub!' };
  }

  return { flushed: false, message: result.message };
}
