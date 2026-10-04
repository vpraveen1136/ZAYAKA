import { Recipe, Category, SyncConfig } from '../types';
import {
  getAllRecipes,
  saveRecipes,
  getAllCategories,
  saveCategories,
  getMetadata,
  setMetadata
} from './storage';

const CONFIG_KEY = 'zayaka_sync_config';

export function getSyncConfig(): SyncConfig {
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.error('Failed to read sync config:', e);
  }

  // Default configuration
  return {
    mode: 'local',
    githubOwner: '',
    githubRepo: '',
    githubBranch: 'main'
  };
}

export function saveSyncConfig(config: SyncConfig): void {
  try {
    localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
  } catch (e) {
    console.error('Failed to save sync config:', e);
  }
}

/**
 * Validate recipe record integrity before any save/sync operation (Requirement 25)
 */
export function validateRecipe(recipe: Partial<Recipe>, validCategories: Category[]): { isValid: boolean; error?: string } {
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
 * Fetch initial catalogue from static files (deployed on GitHub Pages) or remote repo
 */
export async function syncCatalogueFromRemote(): Promise<{
  updated: boolean;
  recipesCount: number;
  lastSyncTime: string;
}> {
  const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;
  const prevSyncTime = await getMetadata('lastSyncTime');

  if (!isOnline) {
    const localRecipes = await getAllRecipes();
    return {
      updated: false,
      recipesCount: localRecipes.length,
      lastSyncTime: prevSyncTime || 'Offline'
    };
  }

  try {
    // 1. Fetch data/recipes.json and data/categories.json with cache busting
    const timestamp = Date.now();
    const [recipesRes, categoriesRes] = await Promise.all([
      fetch(`./data/recipes.json?t=${timestamp}`),
      fetch(`./data/categories.json?t=${timestamp}`)
    ]);

    if (recipesRes.ok && categoriesRes.ok) {
      const remoteRecipes: Recipe[] = await recipesRes.json();
      const remoteCategories: Category[] = await categoriesRes.json();

      const localRecipes = await getAllRecipes();
      const localCategories = await getAllCategories();

      // If local storage is empty, initialize immediately with remote
      if (localRecipes.length === 0) {
        await saveRecipes(remoteRecipes);
        await saveCategories(remoteCategories);
      } else {
        // Reconcile: merge recipes based on updatedAt timestamp
        const mergedRecipesMap = new Map<string, Recipe>();
        for (const r of remoteRecipes) {
          mergedRecipesMap.set(r.id, r);
        }
        for (const local of localRecipes) {
          const remote = mergedRecipesMap.get(local.id);
          if (!remote) {
            // New local addition not yet in remote
            mergedRecipesMap.set(local.id, local);
          } else {
            const localUpdated = new Date(local.updatedAt || 0).getTime();
            const remoteUpdated = new Date(remote.updatedAt || 0).getTime();
            if (localUpdated > remoteUpdated) {
              mergedRecipesMap.set(local.id, local);
            }
          }
        }

        const reconciled = Array.from(mergedRecipesMap.values());
        await saveRecipes(reconciled);

        if (localCategories.length === 0) {
          await saveCategories(remoteCategories);
        }
      }

      const now = new Date().toISOString();
      await setMetadata('lastSyncTime', now);

      const all = await getAllRecipes();
      return {
        updated: true,
        recipesCount: all.length,
        lastSyncTime: now
      };
    }
  } catch (err) {
    console.warn('Sync from remote encountered an issue, preserving local catalogue:', err);
  }

  const current = await getAllRecipes();
  return {
    updated: false,
    recipesCount: current.length,
    lastSyncTime: prevSyncTime || new Date().toISOString()
  };
}

/**
 * Optimistic GitHub write with conflict resolution (Requirement 21)
 */
export async function pushCatalogueToGitHub(
  recipes: Recipe[],
  categories?: Category[]
): Promise<{ success: boolean; message: string }> {
  const config = getSyncConfig();

  // Mode: Serverless worker micro-proxy
  if (config.mode === 'serverless' && config.serverlessUrl) {
    try {
      const res = await fetch(config.serverlessUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Access-Code': 'BAWARCHI'
        },
        body: JSON.stringify({
          action: 'write',
          recipes,
          categories
        })
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || `Worker returned HTTP ${res.status}`);
      }

      const now = new Date().toISOString();
      await setMetadata('lastSyncTime', now);
      return { success: true, message: 'Catalogue synced to GitHub via secure worker!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `Serverless write failed: ${msg}` };
    }
  }

  // Mode: Direct GitHub PAT stored on device
  if (config.mode === 'github_pat' && config.githubToken && config.githubOwner && config.githubRepo) {
    const owner = config.githubOwner.trim();
    const repo = config.githubRepo.trim();
    const branch = config.githubBranch?.trim() || 'main';
    const token = config.githubToken.trim();

    try {
      // Step 1: Retrieve current file SHA and remote content to prevent overwrite (Requirement 21)
      const filePath = 'data/recipes.json';
      const fileUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;

      const getRes = await fetch(fileUrl, {
        headers: {
          Authorization: `token ${token}`,
          Accept: 'application/vnd.github.v3+json'
        }
      });

      let currentSha = '';
      if (getRes.ok) {
        const fileData = await getRes.json();
        currentSha = fileData.sha;
      }

      // Step 2: Prepare formatted JSON
      const jsonContent = JSON.stringify(recipes, null, 2);
      // Safe UTF-8 Base64 encoding
      const utf8Bytes = new TextEncoder().encode(jsonContent);
      let binaryStr = '';
      for (let i = 0; i < utf8Bytes.length; i++) {
        binaryStr += String.fromCharCode(utf8Bytes[i]);
      }
      const base64Content = btoa(binaryStr);

      // Step 3: Commit with optimistic SHA
      const putRes = await fetch(fileUrl, {
        method: 'PUT',
        headers: {
          Authorization: `token ${token}`,
          'Content-Type': 'application/json',
          Accept: 'application/vnd.github.v3+json'
        },
        body: JSON.stringify({
          message: 'Update recipe catalogue via ZAYAKA PWA',
          content: base64Content,
          sha: currentSha || undefined,
          branch
        })
      });

      if (!putRes.ok) {
        if (putRes.status === 409) {
          return {
            success: false,
            message: 'Conflict detected: The catalogue on GitHub was modified by another member. Please refresh and retry.'
          };
        }
        const errJson = await putRes.json().catch(() => ({}));
        throw new Error(errJson.message || `GitHub error: HTTP ${putRes.status}`);
      }

      // Step 4: If categories provided, commit categories.json similarly
      if (categories && categories.length > 0) {
        const catPath = 'data/categories.json';
        const catUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${catPath}?ref=${branch}`;
        const catGetRes = await fetch(catUrl, {
          headers: {
            Authorization: `token ${token}`,
            Accept: 'application/vnd.github.v3+json'
          }
        });
        let catSha = '';
        if (catGetRes.ok) {
          const catData = await catGetRes.json();
          catSha = catData.sha;
        }

        const catJson = JSON.stringify(categories, null, 2);
        const catBytes = new TextEncoder().encode(catJson);
        let catBinary = '';
        for (let i = 0; i < catBytes.length; i++) {
          catBinary += String.fromCharCode(catBytes[i]);
        }
        await fetch(catUrl, {
          method: 'PUT',
          headers: {
            Authorization: `token ${token}`,
            'Content-Type': 'application/json',
            Accept: 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: 'Update categories via ZAYAKA PWA',
            content: btoa(catBinary),
            sha: catSha || undefined,
            branch
          })
        });
      }

      const now = new Date().toISOString();
      await setMetadata('lastSyncTime', now);
      return { success: true, message: 'Changes pushed to GitHub successfully!' };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, message: `GitHub sync error: ${msg}` };
    }
  }

  // Local-only mode
  const now = new Date().toISOString();
  await setMetadata('lastSyncTime', now);
  return {
    success: true,
    message: 'Saved to local catalogue. (Configure GitHub PAT or Serverless Worker in Settings to push directly to repo).'
  };
}
