import { AccessRole, AccessState } from '../types';

const STORAGE_KEY_HASH = 'zayaka_access_hash';
const STORAGE_KEY_ROLE = 'zayaka_access_role';
const STORAGE_KEY_CREDENTIAL = 'zayaka_editor_credential';

// Cryptographic SHA-256 hashes of authorized access codes
// The client-side gate verifies hashes rather than embedding plaintext codes
export const HASHES = {
  VIEWER: '34a99bb9566d59be579549f499fd204f70b6812982ec87d31b33f13ce575f9eb',
  EDITOR: 'b807040a60f02e4202511469f1a1715aeb626261c2ee9bb3952875e648e202cd'
} as const;

export async function hashAccessCode(code: string): Promise<string> {
  const normalized = code.trim().toUpperCase();
  const encoder = new TextEncoder();
  const data = encoder.encode(normalized);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

export function getStoredAccess(): AccessState {
  try {
    const hash = localStorage.getItem(STORAGE_KEY_HASH);
    const role = localStorage.getItem(STORAGE_KEY_ROLE) as AccessRole | null;

    if (hash === HASHES.VIEWER && role === 'viewer') {
      return { code: null, role: 'viewer', isLoggedIn: true };
    }
    if (hash === HASHES.EDITOR && role === 'editor') {
      return { code: null, role: 'editor', isLoggedIn: true };
    }
  } catch (err) {
    console.error('Error reading access from storage:', err);
  }

  return { code: null, role: null, isLoggedIn: false };
}

export function getStoredEditorCredential(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY_CREDENTIAL);
  } catch {
    return null;
  }
}

export async function verifyAndSaveAccess(rawCode: string): Promise<{
  success: boolean;
  role?: AccessRole;
  error?: string;
}> {
  const normalized = rawCode.trim().toUpperCase();

  if (!normalized) {
    return { success: false, error: 'Please enter an access code.' };
  }

  const hash = await hashAccessCode(normalized);

  if (hash === HASHES.VIEWER) {
    try {
      localStorage.setItem(STORAGE_KEY_HASH, hash);
      localStorage.setItem(STORAGE_KEY_ROLE, 'viewer');
      localStorage.removeItem(STORAGE_KEY_CREDENTIAL);
    } catch (err) {
      console.error('Error saving access state:', err);
    }
    return { success: true, role: 'viewer' };
  }

  if (hash === HASHES.EDITOR) {
    try {
      localStorage.setItem(STORAGE_KEY_HASH, hash);
      localStorage.setItem(STORAGE_KEY_ROLE, 'editor');
      localStorage.setItem(STORAGE_KEY_CREDENTIAL, normalized);
    } catch (err) {
      console.error('Error saving access state:', err);
    }
    return { success: true, role: 'editor' };
  }

  return { success: false, error: 'Invalid access code. Please try again.' };
}

export function clearAccess(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_HASH);
    localStorage.removeItem(STORAGE_KEY_ROLE);
    localStorage.removeItem(STORAGE_KEY_CREDENTIAL);
  } catch (err) {
    console.error('Error clearing access:', err);
  }
}
