import { Recipe, Category } from '../types';

const DB_NAME = 'zayaka_catalog_db';
const DB_VERSION = 1;
const STORE_RECIPES = 'recipes';
const STORE_CATEGORIES = 'categories';
const STORE_META = 'metadata';

let dbInstance: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbInstance) return Promise.resolve(dbInstance);

  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      return reject(new Error('IndexedDB not supported'));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_RECIPES)) {
        db.createObjectStore(STORE_RECIPES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_CATEGORIES)) {
        db.createObjectStore(STORE_CATEGORIES, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(STORE_META)) {
        db.createObjectStore(STORE_META, { keyPath: 'key' });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error);
    };
  });
}

// LocalStorage fallback helpers
const LS_RECIPES_KEY = 'zayaka_cached_recipes';
const LS_CATEGORIES_KEY = 'zayaka_cached_categories';
const LS_META_PREFIX = 'zayaka_meta_';

export async function getAllRecipes(): Promise<Recipe[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_RECIPES, 'readonly');
      const store = tx.objectStore(STORE_RECIPES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for recipes:', err);
    const data = localStorage.getItem(LS_RECIPES_KEY);
    return data ? JSON.parse(data) : [];
  }
}

export async function saveRecipes(recipes: Recipe[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_RECIPES, 'readwrite');
      const store = tx.objectStore(STORE_RECIPES);
      store.clear();
      for (const recipe of recipes) {
        store.put(recipe);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for saving recipes:', err);
  }
  // Keep localStorage updated as backup
  try {
    localStorage.setItem(LS_RECIPES_KEY, JSON.stringify(recipes));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

export async function addOrUpdateRecipe(recipe: Recipe): Promise<void> {
  const current = await getAllRecipes();
  const index = current.findIndex((r) => r.id === recipe.id);
  if (index >= 0) {
    current[index] = recipe;
  } else {
    current.unshift(recipe);
  }
  await saveRecipes(current);
}

export async function deleteRecipe(id: string): Promise<void> {
  const current = await getAllRecipes();
  const filtered = current.filter((r) => r.id !== id);
  await saveRecipes(filtered);
}

export async function getAllCategories(): Promise<Category[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readonly');
      const store = tx.objectStore(STORE_CATEGORIES);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for categories:', err);
    const data = localStorage.getItem(LS_CATEGORIES_KEY);
    return data ? JSON.parse(data) : [];
  }
}

export async function saveCategories(categories: Category[]): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_CATEGORIES, 'readwrite');
      const store = tx.objectStore(STORE_CATEGORIES);
      store.clear();
      for (const cat of categories) {
        store.put(cat);
      }
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for saving categories:', err);
  }
  try {
    localStorage.setItem(LS_CATEGORIES_KEY, JSON.stringify(categories));
  } catch (e) {
    console.error('LocalStorage write failed:', e);
  }
}

export async function getMetadata(key: string): Promise<any> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readonly');
      const store = tx.objectStore(STORE_META);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result ? req.result.value : null);
      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    const data = localStorage.getItem(`${LS_META_PREFIX}${key}`);
    return data ? JSON.parse(data) : null;
  }
}

export async function setMetadata(key: string, value: any): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_META, 'readwrite');
      const store = tx.objectStore(STORE_META);
      store.put({ key, value });
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.warn('Falling back to localStorage for metadata:', err);
  }
  try {
    localStorage.setItem(`${LS_META_PREFIX}${key}`, JSON.stringify(value));
  } catch (e) {
    console.error('LocalStorage metadata write failed:', e);
  }
}
