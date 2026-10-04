import React, { useState } from 'react';
import { X, RefreshCw, LogOut, FolderTree, Download, Cloud, Check, AlertCircle } from 'lucide-react';
import { AccessRole, SyncStatus, SyncConfig, Recipe, Category } from '../types';
import { getSyncConfig, saveSyncConfig } from '../services/sync';
import { APP_VERSION } from '../config/version';

interface SettingsModalProps {
  role: AccessRole | null;
  syncStatus: SyncStatus;
  recipes: Recipe[];
  categories: Category[];
  onClose: () => void;
  onRefresh: () => void;
  onRetrySync: () => void;
  onResetAccess: () => void;
  onOpenCategoryManager: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  role,
  syncStatus,
  recipes,
  categories,
  onClose,
  onRefresh,
  onRetrySync,
  onResetAccess,
  onOpenCategoryManager
}) => {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(getSyncConfig());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);
  const [testResult, setTestResult] = useState<{ status: 'testing' | 'ok' | 'err'; message: string } | null>(null);

  const handleSaveSyncConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSyncConfig(syncConfig);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
  };

  const handleTestWorkerConnection = async () => {
    if (!syncConfig.serverlessUrl) {
      setTestResult({ status: 'err', message: 'Please enter a worker URL first.' });
      return;
    }
    setTestResult({ status: 'testing', message: 'Testing connection to worker...' });
    try {
      const res = await fetch(`${syncConfig.serverlessUrl.replace(/\/+$/, '')}/health`, {
        method: 'GET',
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setTestResult({
          status: 'ok',
          message: `Connected to Cloudflare Worker! Repo: ${data.repo || 'Connected'}`
        });
      } else {
        setTestResult({
          status: 'err',
          message: `Worker returned HTTP ${res.status}. Please check URL.`
        });
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ status: 'err', message: `Cannot reach worker: ${msg}` });
    }
  };

  const handleExportJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(recipes, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'recipes.json');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const formatLastSync = (iso: string | null) => {
    if (!iso) return 'Not yet synced';
    if (iso === 'Offline') return 'Offline';
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-grabber" />

        <div className="modal-header">
          <h2 style={{ fontSize: '1.4rem' }}>Settings</h2>
          <button
            type="button"
            onClick={onClose}
            style={{ width: '36px', height: '36px', borderRadius: '50%', color: 'var(--text-muted)' }}
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Current Access Mode */}
        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px',
            background: 'var(--bg-color)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Current Access Level</span>
            <span
              style={{
                fontSize: '0.8rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '3px 10px',
                borderRadius: '8px',
                background: role === 'editor' ? '#FEF3C7' : '#E0F2FE',
                color: role === 'editor' ? '#92400E' : '#0369A1'
              }}
            >
              {role === 'editor' ? 'Editor' : 'Viewer'}
            </span>
          </div>

          <div style={{ fontSize: '0.84rem', color: 'var(--text-muted)' }}>
            {role === 'editor'
              ? 'You can add, edit, delete recipes, manage categories, and star favourites.'
              : 'You can browse, search, view, and send recipes to WhatsApp.'}
          </div>
        </div>

        {/* Sync Status info */}
        <div
          style={{
            border: '1px solid var(--border-subtle)',
            borderRadius: '16px',
            padding: '16px',
            background: 'var(--bg-color)',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Network Status</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 600, color: syncStatus.isOnline ? '#10B981' : '#D97706' }}>
              {syncStatus.isOnline ? 'Online' : 'Offline'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>GitHub Sync Status</span>
            <span
              style={{
                fontSize: '0.86rem',
                fontWeight: 600,
                color:
                  syncStatus.syncState === 'failed'
                    ? '#DC2626'
                    : syncStatus.pendingCount > 0
                    ? '#D97706'
                    : '#10B981'
              }}
            >
              {syncStatus.syncState === 'failed'
                ? 'Not synced to GitHub'
                : syncStatus.pendingCount > 0
                ? `${syncStatus.pendingCount} pending sync`
                : 'Synced with GitHub'}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Last Synced</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
              {formatLastSync(syncStatus.lastSyncTime)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Local Cache Copy</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{recipes.length} recipes · {categories.length} categories</span>
          </div>

          {syncStatus.error && (
            <div
              style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '8px 12px',
                borderRadius: '8px',
                fontSize: '0.82rem',
                marginBottom: '10px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <AlertCircle size={15} />
              <span>{syncStatus.error}</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onRefresh}
              style={{
                flex: 1,
                height: '42px',
                background: '#FFFFFF',
                border: '1px solid var(--border-subtle)',
                fontSize: '0.88rem',
                color: 'var(--text-main)',
                gap: '6px'
              }}
            >
              <RefreshCw size={16} />
              <span>Refresh Catalogue</span>
            </button>

            {(syncStatus.syncState === 'failed' || syncStatus.pendingCount > 0) && (
              <button
                type="button"
                onClick={onRetrySync}
                style={{
                  flex: 1,
                  height: '42px',
                  background: 'var(--accent-terracotta)',
                  color: '#FFFFFF',
                  fontSize: '0.88rem',
                  gap: '6px'
                }}
              >
                <span>Retry Sync</span>
              </button>
            )}
          </div>
        </div>

        {/* Editor Only Actions */}
        {role === 'editor' && (
          <>
            <div style={{ marginBottom: '16px' }}>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenCategoryManager();
                }}
                style={{
                  width: '100%',
                  height: '48px',
                  background: '#F3ECE1',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  fontSize: '0.94rem',
                  gap: '8px',
                  marginBottom: '10px'
                }}
              >
                <FolderTree size={18} />
                <span>Manage Categories</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                style={{
                  width: '100%',
                  height: '44px',
                  background: '#FFFFFF',
                  color: 'var(--text-main)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: '12px',
                  fontSize: '0.88rem',
                  gap: '8px'
                }}
              >
                <Download size={16} />
                <span>Export recipes.json Backup</span>
              </button>
            </div>

            {/* Cloudflare Worker Synchronisation Configuration */}
            <div
              style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: '16px',
                padding: '16px',
                background: 'var(--bg-color)',
                marginBottom: '16px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '0.95rem', marginBottom: '6px' }}>
                <Cloud size={16} color="var(--accent-terracotta)" />
                <span>Cloudflare Sync Worker</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Performs secure writes to GitHub without storing tokens in the browser.
              </p>

              <form onSubmit={handleSaveSyncConfig}>
                <div className="form-group" style={{ marginBottom: '8px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Sync Worker URL</label>
                  <input
                    type="url"
                    className="form-input"
                    style={{ height: '40px', fontSize: '0.85rem' }}
                    placeholder="https://zayaka-sync.<username>.workers.dev"
                    value={syncConfig.serverlessUrl}
                    onChange={(e) => setSyncConfig({ ...syncConfig, serverlessUrl: e.target.value })}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '10px' }}>
                  <button
                    type="submit"
                    style={{
                      height: '38px',
                      padding: '0 14px',
                      background: 'var(--accent-terracotta)',
                      color: '#FFFFFF',
                      fontSize: '0.85rem'
                    }}
                  >
                    Save URL
                  </button>

                  <button
                    type="button"
                    onClick={handleTestWorkerConnection}
                    style={{
                      height: '38px',
                      padding: '0 12px',
                      background: '#FFFFFF',
                      border: '1px solid var(--border-subtle)',
                      color: 'var(--text-main)',
                      fontSize: '0.85rem'
                    }}
                  >
                    Test Connection
                  </button>

                  {saveSuccessMsg && (
                    <span style={{ fontSize: '0.82rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Saved!
                    </span>
                  )}
                </div>

                {testResult && (
                  <div
                    style={{
                      marginTop: '10px',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.82rem',
                      background: testResult.status === 'ok' ? '#ECFDF5' : '#FEF2F2',
                      color: testResult.status === 'ok' ? '#065F46' : '#991B1B',
                      border: `1px solid ${testResult.status === 'ok' ? '#A7F3D0' : '#FECACA'}`
                    }}
                  >
                    {testResult.message}
                  </div>
                )}
              </form>
            </div>
          </>
        )}

        {/* Switch Access / Sign Out */}
        <div style={{ marginTop: '16px' }}>
          <button
            type="button"
            onClick={onResetAccess}
            style={{
              width: '100%',
              height: '46px',
              background: '#FEE2E2',
              color: '#DC2626',
              borderRadius: '12px',
              fontSize: '0.9rem',
              gap: '6px'
            }}
          >
            <LogOut size={16} />
            <span>Switch access / Sign out</span>
          </button>
        </div>

        {/* Version info (Requirement: versioning visible in settings page) */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.76rem', color: '#9CA3AF' }}>
          ZAYAKA v{APP_VERSION} · Family Recipe Catalogue PWA
        </div>
      </div>
    </div>
  );
};
