import React from 'react';
import { Settings as SettingsIcon, RefreshCw, WifiOff } from 'lucide-react';
import { SyncStatus, AccessRole } from '../types';

interface HeaderProps {
  role: AccessRole | null;
  syncStatus: SyncStatus;
  onOpenSettings: () => void;
  onRefresh: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  role,
  syncStatus,
  onOpenSettings,
  onRefresh
}) => {
  const formatTime = (isoString: string | null) => {
    if (!isoString) return 'Not yet synced';
    if (isoString === 'Offline') return 'Offline';
    try {
      const d = new Date(isoString);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return isoString;
    }
  };

  return (
    <header className="app-header">
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <h1 className="brand-title">ZAYAKA</h1>
          {role && (
            <span
              style={{
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase',
                padding: '2px 8px',
                borderRadius: '6px',
                background: role === 'editor' ? '#FEF3C7' : '#E0F2FE',
                color: role === 'editor' ? '#92400E' : '#0369A1',
                letterSpacing: '0.04em'
              }}
            >
              {role === 'editor' ? 'BAWARCHI' : 'VIEWER'}
            </span>
          )}
        </div>
        
        {/* Sync Status Badge */}
        <div className="sync-badge" style={{ marginTop: '2px' }}>
          {!syncStatus.isOnline ? (
            <>
              <WifiOff size={11} color="#D97706" />
              <span style={{ color: '#D97706' }}>Offline — showing saved catalogue</span>
            </>
          ) : syncStatus.isSyncing ? (
            <>
              <span className="sync-dot syncing" />
              <span>Syncing catalogue...</span>
            </>
          ) : (
            <>
              <span className="sync-dot" />
              <span>Synced: {formatTime(syncStatus.lastSyncTime)}</span>
            </>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <button
          onClick={onRefresh}
          title="Refresh catalogue"
          style={{ width: '40px', height: '40px', color: 'var(--text-muted)' }}
          aria-label="Refresh catalogue"
        >
          <RefreshCw size={19} className={syncStatus.isSyncing ? 'animate-spin' : ''} />
        </button>

        <button
          onClick={onOpenSettings}
          title="Settings"
          style={{ width: '40px', height: '40px', color: 'var(--text-muted)' }}
          aria-label="Settings"
        >
          <SettingsIcon size={20} />
        </button>
      </div>
    </header>
  );
};
