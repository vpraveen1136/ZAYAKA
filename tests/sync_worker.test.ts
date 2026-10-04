import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  pushCatalogueToGitHub,
  flushPendingSync,
  saveSyncConfig
} from '../src/services/sync';
import {
  getPendingSync,
  clearPendingSync
} from '../src/services/storage';
import { verifyAndSaveAccess } from '../src/services/auth';
import { Recipe } from '../src/types';
import { APP_VERSION } from '../src/config/version';

describe('GitHub Synchronization & Worker Layer', () => {
  const sampleRecipe: Recipe = {
    id: 'R9999',
    name: 'Shahi Paneer',
    url: 'https://youtube.com/watch?v=shahipaneer',
    meal: ['dinner'],
    category: 'lunch-dinner'
  };

  beforeEach(async () => {
    localStorage.clear();
    await clearPendingSync();
    vi.restoreAllMocks();
  });

  it('rejects write operations if the user is not in Editor mode (Requirement 14, 15)', async () => {
    // Log in as Viewer (ZAYAKA)
    await verifyAndSaveAccess('ZAYAKA');

    const res = await pushCatalogueToGitHub([sampleRecipe]);
    expect(res.success).toBe(false);
    expect(res.error).toBe('Unauthorized');
    expect(res.message).toContain('Unauthorized');
  });

  it('stages writes into pending sync if device is offline (Requirement 8)', async () => {
    await verifyAndSaveAccess('BAWARCHI');

    // Simulate offline
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    const res = await pushCatalogueToGitHub([sampleRecipe]);
    expect(res.success).toBe(false);
    expect(res.isOffline).toBe(true);

    const pending = await getPendingSync();
    expect(pending).not.toBeNull();
    expect(pending?.recipes?.[0].id).toBe('R9999');
  });

  it('reports "Not synced to GitHub" if worker URL is not configured (Requirement 7)', async () => {
    await verifyAndSaveAccess('BAWARCHI');
    saveSyncConfig({ serverlessUrl: '' });

    const res = await pushCatalogueToGitHub([sampleRecipe]);
    expect(res.success).toBe(false);
    expect(res.message).toContain('Not synced to GitHub');
    expect(res.error).toBe('Worker URL not configured');

    // Queued in pending sync
    const pending = await getPendingSync();
    expect(pending).not.toBeNull();
  });

  it('sends editor credential and payload to Worker when online (Requirement 1, 13, 15)', async () => {
    await verifyAndSaveAccess('BAWARCHI');
    const workerUrl = 'https://zayaka-sync.test.workers.dev';
    saveSyncConfig({ serverlessUrl: workerUrl });

    // Mock successful worker response
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (url, init) => {
      expect(url).toBe(workerUrl);
      expect(init?.method).toBe('POST');
      const headers = init?.headers as Record<string, string>;
      expect(headers['X-Access-Code']).toBe('BAWARCHI');

      const body = JSON.parse(init?.body as string);
      expect(body.action).toBe('write');
      expect(body.recipes[0].name).toBe('Shahi Paneer');

      return new Response(
        JSON.stringify({
          success: true,
          sha: { recipes: 'sha_12345' },
          timestamp: new Date().toISOString()
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    });

    const res = await pushCatalogueToGitHub([sampleRecipe]);
    expect(res.success).toBe(true);
    expect(res.message).toContain('written to GitHub');

    // Pending sync queue should be cleared
    const pending = await getPendingSync();
    expect(pending).toBeNull();
  });

  it('handles remote conflict (HTTP 409) and warns editor (Requirement 9)', async () => {
    await verifyAndSaveAccess('BAWARCHI');
    saveSyncConfig({ serverlessUrl: 'https://zayaka-sync.test.workers.dev' });

    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'Conflict detected', conflict: true }), {
        status: 409,
        headers: { 'Content-Type': 'application/json' }
      })
    );

    const res = await pushCatalogueToGitHub([sampleRecipe]);
    expect(res.success).toBe(false);
    expect(res.isConflict).toBe(true);
    expect(res.message).toContain('Conflict detected');
  });

  it('flushes pending queue when connectivity is restored', async () => {
    await verifyAndSaveAccess('BAWARCHI');
    saveSyncConfig({ serverlessUrl: 'https://zayaka-sync.test.workers.dev' });

    // Stage pending change
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await pushCatalogueToGitHub([sampleRecipe]);
    expect(await getPendingSync()).not.toBeNull();

    // Come back online
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ success: true }), { status: 200 })
    );

    const flushRes = await flushPendingSync();
    expect(flushRes.flushed).toBe(true);
    expect(await getPendingSync()).toBeNull();
  });

  it('verifies PWA versioning is defined and updated', () => {
    expect(APP_VERSION).toBe('1.1.0');
  });
});
