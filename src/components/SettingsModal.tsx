import React, { useState } from 'react';
import { X, RefreshCw, LogOut, FolderTree, Download, Shield, Check } from 'lucide-react';
import { AccessRole, SyncStatus, SyncConfig, Recipe, Category } from '../types';
import { getSyncConfig, saveSyncConfig } from '../services/sync';

interface SettingsModalProps {
  role: AccessRole | null;
  syncStatus: SyncStatus;
  recipes: Recipe[];
  categories: Category[];
  onClose: () => void;
  onRefresh: () => void;
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
  onResetAccess,
  onOpenCategoryManager
}) => {
  const [syncConfig, setSyncConfig] = useState<SyncConfig>(getSyncConfig());
  const [saveSuccessMsg, setSaveSuccessMsg] = useState(false);

  const handleSaveSyncConfig = (e: React.FormEvent) => {
    e.preventDefault();
    saveSyncConfig(syncConfig);
    setSaveSuccessMsg(true);
    setTimeout(() => setSaveSuccessMsg(false), 2500);
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
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Catalogue Sync</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>
              {formatLastSync(syncStatus.lastSyncTime)}
            </span>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
            <span style={{ fontSize: '0.86rem', color: 'var(--text-muted)' }}>Catalogue in Storage</span>
            <span style={{ fontSize: '0.86rem', fontWeight: 600 }}>{recipes.length} recipes · {categories.length} categories</span>
          </div>

          <button
            type="button"
            onClick={onRefresh}
            style={{
              width: '100%',
              height: '42px',
              background: '#FFFFFF',
              border: '1px solid var(--border-subtle)',
              fontSize: '0.88rem',
              color: 'var(--text-main)',
              gap: '6px'
            }}
          >
            <RefreshCw size={16} />
            <span>Refresh Catalogue Now</span>
          </button>
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

            {/* GitHub Remote Sync Configuration */}
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
                <Shield size={16} color="var(--accent-terracotta)" />
                <span>GitHub Write Synchronisation</span>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
                Credentials are saved solely in this device&apos;s private storage and never committed to GitHub.
              </p>

              <form onSubmit={handleSaveSyncConfig}>
                <div className="form-group" style={{ marginBottom: '10px' }}>
                  <label className="form-label" style={{ fontSize: '0.8rem' }}>Write Mechanism</label>
                  <select
                    className="form-select"
                    style={{ height: '40px', fontSize: '0.88rem' }}
                    value={syncConfig.mode}
                    onChange={(e) => setSyncConfig({ ...syncConfig, mode: e.target.value as any })}
                  >
                    <option value="local">Local Storage Only (Default / Offline Safe)</option>
                    <option value="github_pat">Direct GitHub Token (Saved on this device)</option>
                    <option value="serverless">Serverless Micro-Proxy Worker</option>
                  </select>
                </div>

                {syncConfig.mode === 'github_pat' && (
                  <>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.85rem' }}
                        placeholder="GitHub Owner (username/org)"
                        value={syncConfig.githubOwner}
                        onChange={(e) => setSyncConfig({ ...syncConfig, githubOwner: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <input
                        type="text"
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.85rem' }}
                        placeholder="GitHub Repository name"
                        value={syncConfig.githubRepo}
                        onChange={(e) => setSyncConfig({ ...syncConfig, githubRepo: e.target.value })}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: '8px' }}>
                      <input
                        type="password"
                        className="form-input"
                        style={{ height: '38px', fontSize: '0.85rem' }}
                        placeholder="GitHub Fine-Grained Token (repo contents:write)"
                        value={syncConfig.githubToken || ''}
                        onChange={(e) => setSyncConfig({ ...syncConfig, githubToken: e.target.value })}
                      />
                    </div>
                  </>
                )}

                {syncConfig.mode === 'serverless' && (
                  <div className="form-group" style={{ marginBottom: '8px' }}>
                    <input
                      type="url"
                      className="form-input"
                      style={{ height: '38px', fontSize: '0.85rem' }}
                      placeholder="https://zayaka-sync.yourworker.workers.dev"
                      value={syncConfig.serverlessUrl || ''}
                      onChange={(e) => setSyncConfig({ ...syncConfig, serverlessUrl: e.target.value })}
                    />
                  </div>
                )}

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
                    Save Sync Settings
                  </button>
                  {saveSuccessMsg && (
                    <span style={{ fontSize: '0.82rem', color: '#10B981', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Check size={14} /> Saved!
                    </span>
                  )}
                </div>
              </form>
            </div>
          </>
        )}

        {/* Switch Access / Sign Out (Requirement 2) */}
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

        {/* Version info */}
        <div style={{ textAlign: 'center', marginTop: '20px', fontSize: '0.76rem', color: '#9CA3AF' }}>
          ZAYAKA v1.0.0 · Family Recipe Catalogue PWA
        </div>
      </div>
    </div>
  );
};
