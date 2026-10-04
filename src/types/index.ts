export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'tea';

export type RecipeSource = 'youtube' | 'website';

export interface Recipe {
  id: string;
  name: string;
  url: string;
  source?: RecipeSource;
  meal: MealType[];
  category: string;
  subCategory?: string;
  tags?: string[];
  favourite?: boolean;
  addedBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface Category {
  id: string;
  name: string;
  subCategories: string[];
}

export type AccessRole = 'viewer' | 'editor';

export interface AccessState {
  code: string | null;
  role: AccessRole | null;
  isLoggedIn: boolean;
}

export interface SyncConfig {
  serverlessUrl: string;
}

export type SyncState = 'synced' | 'syncing' | 'failed' | 'offline_pending';

export interface SyncStatus {
  lastSyncTime: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  syncState: SyncState;
  error: string | null;
}
