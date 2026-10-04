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
  mode: 'local' | 'github_pat' | 'serverless';
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  githubToken?: string; // Stored exclusively in device localStorage, never committed
  serverlessUrl?: string;
}

export interface SyncStatus {
  lastSyncTime: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  error: string | null;
}
