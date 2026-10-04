import { describe, it, expect, beforeEach } from 'vitest';
import { verifyAndSaveAccess, getStoredAccess, clearAccess } from '../src/services/auth';

describe('Auth & Access Model Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recognizes ZAYAKA as viewer role', () => {
    const res = verifyAndSaveAccess('ZAYAKA');
    expect(res.success).toBe(true);
    expect(res.role).toBe('viewer');

    const stored = getStoredAccess();
    expect(stored.isLoggedIn).toBe(true);
    expect(stored.role).toBe('viewer');
    expect(stored.code).toBe('ZAYAKA');
  });

  it('recognizes BAWARCHI as editor role', () => {
    const res = verifyAndSaveAccess('BAWARCHI');
    expect(res.success).toBe(true);
    expect(res.role).toBe('editor');

    const stored = getStoredAccess();
    expect(stored.isLoggedIn).toBe(true);
    expect(stored.role).toBe('editor');
    expect(stored.code).toBe('BAWARCHI');
  });

  it('handles lowercase and whitespace trimming gracefully', () => {
    const resViewer = verifyAndSaveAccess('  zayaka  ');
    expect(resViewer.success).toBe(true);
    expect(resViewer.role).toBe('viewer');

    const resEditor = verifyAndSaveAccess('bawarchi ');
    expect(resEditor.success).toBe(true);
    expect(resEditor.role).toBe('editor');
  });

  it('rejects invalid or unauthorized codes', () => {
    const res1 = verifyAndSaveAccess('ADMIN');
    expect(res1.success).toBe(false);
    expect(res1.role).toBeUndefined();

    const res2 = verifyAndSaveAccess('');
    expect(res2.success).toBe(false);

    const stored = getStoredAccess();
    expect(stored.isLoggedIn).toBe(false);
  });

  it('clears access and returns unauthenticated state on sign out', () => {
    verifyAndSaveAccess('BAWARCHI');
    expect(getStoredAccess().isLoggedIn).toBe(true);

    clearAccess();
    const afterClear = getStoredAccess();
    expect(afterClear.isLoggedIn).toBe(false);
    expect(afterClear.code).toBeNull();
    expect(afterClear.role).toBeNull();
  });
});
