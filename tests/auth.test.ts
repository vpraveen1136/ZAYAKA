import React from 'react';
import { describe, it, expect, beforeEach } from 'vitest';
import ReactDOMServer from 'react-dom/server';
import {
  verifyAndSaveAccess,
  getStoredAccess,
  clearAccess,
  HASHES,
  hashAccessCode
} from '../src/services/auth';
import { WelcomeModal } from '../src/components/WelcomeModal';

describe('Auth & Access Model Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('recognizes valid viewer code and grants viewer mode', async () => {
    const res = await verifyAndSaveAccess('ZAYAKA');
    expect(res.success).toBe(true);
    expect(res.role).toBe('viewer');

    const stored = getStoredAccess();
    expect(stored.isLoggedIn).toBe(true);
    expect(stored.role).toBe('viewer');
  });

  it('recognizes valid editor code and grants editor mode', async () => {
    const res = await verifyAndSaveAccess('BAWARCHI');
    expect(res.success).toBe(true);
    expect(res.role).toBe('editor');

    const stored = getStoredAccess();
    expect(stored.isLoggedIn).toBe(true);
    expect(stored.role).toBe('editor');
  });

  it('handles lowercase and whitespace trimming gracefully', async () => {
    const resViewer = await verifyAndSaveAccess('  zayaka  ');
    expect(resViewer.success).toBe(true);
    expect(resViewer.role).toBe('viewer');

    const resEditor = await verifyAndSaveAccess('bawarchi ');
    expect(resEditor.success).toBe(true);
    expect(resEditor.role).toBe('editor');
  });

  it('rejects invalid or unauthorized codes without revealing valid codes', async () => {
    const res1 = await verifyAndSaveAccess('ADMIN');
    expect(res1.success).toBe(false);
    expect(res1.role).toBeUndefined();
    expect(res1.error).toBe('Invalid access code. Please try again.');

    const res2 = await verifyAndSaveAccess('');
    expect(res2.success).toBe(false);

    const stored = getStoredAccess();
    expect(stored.isLoggedIn).toBe(false);
  });

  it('clears access and returns unauthenticated state on sign out', async () => {
    await verifyAndSaveAccess('BAWARCHI');
    expect(getStoredAccess().isLoggedIn).toBe(true);

    clearAccess();
    const afterClear = getStoredAccess();
    expect(afterClear.isLoggedIn).toBe(false);
    expect(afterClear.code).toBeNull();
    expect(afterClear.role).toBeNull();
  });

  it('verifies client authentication uses cryptographic hashes rather than plaintext', async () => {
    const calculatedViewerHash = await hashAccessCode('ZAYAKA');
    const calculatedEditorHash = await hashAccessCode('BAWARCHI');

    expect(HASHES.VIEWER).toBe(calculatedViewerHash);
    expect(HASHES.EDITOR).toBe(calculatedEditorHash);
  });

  it('ensures neither valid access code appears anywhere in the rendered login UI', () => {
    const renderedHtml = ReactDOMServer.renderToString(
      React.createElement(WelcomeModal, { onSuccess: () => {} })
    );

    // Neither access code must appear in the rendered UI
    expect(renderedHtml).not.toContain('ZAYAKA');
    expect(renderedHtml).not.toContain('zayaka');
    expect(renderedHtml).not.toContain('BAWARCHI');
    expect(renderedHtml).not.toContain('bawarchi');

    // Labels or code prompts must not be rendered
    expect(renderedHtml).not.toContain('Viewer:');
    expect(renderedHtml).not.toContain('Editor:');

    // UI simply prompts user to enter code
    expect(renderedHtml).toContain('Enter access code to continue');
  });
});
