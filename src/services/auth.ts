import { AccessRole, AccessState } from '../types';

const STORAGE_KEY_CODE = 'zayaka_access_code';
const STORAGE_KEY_ROLE = 'zayaka_access_role';

export const ACCESS_CODES: Record<string, AccessRole> = {
  ZAYAKA: 'viewer',
  BAWARCHI: 'editor'
};

export function getStoredAccess(): AccessState {
  try {
    const code = localStorage.getItem(STORAGE_KEY_CODE)?.trim().toUpperCase() || null;
    const role = (localStorage.getItem(STORAGE_KEY_ROLE) as AccessRole) || null;

    if (code && role && ACCESS_CODES[code] === role) {
      return {
        code,
        role,
        isLoggedIn: true
      };
    }
  } catch (err) {
    console.error('Error reading access from storage:', err);
  }

  return {
    code: null,
    role: null,
    isLoggedIn: false
  };
}

export function verifyAndSaveAccess(rawCode: string): { success: boolean; role?: AccessRole; error?: string } {
  const normalized = rawCode.trim().toUpperCase();

  if (!normalized) {
    return { success: false, error: 'Please enter an access code.' };
  }

  const role = ACCESS_CODES[normalized];
  if (!role) {
    return { success: false, error: 'Invalid access code. Please check and try again.' };
  }

  try {
    localStorage.setItem(STORAGE_KEY_CODE, normalized);
    localStorage.setItem(STORAGE_KEY_ROLE, role);
  } catch (err) {
    console.error('Error saving access code:', err);
  }

  return { success: true, role };
}

export function clearAccess(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_CODE);
    localStorage.removeItem(STORAGE_KEY_ROLE);
  } catch (err) {
    console.error('Error clearing access:', err);
  }
}
