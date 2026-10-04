import React, { useState } from 'react';
import { verifyAndSaveAccess } from '../services/auth';
import { AccessRole } from '../types';
import { Utensils } from 'lucide-react';

interface WelcomeModalProps {
  onSuccess: (role: AccessRole) => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ onSuccess }) => {
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsVerifying(true);

    try {
      const result = await verifyAndSaveAccess(code);
      if (result.success && result.role) {
        onSuccess(result.role);
      } else {
        setError(result.error || 'Invalid access code.');
      }
    } catch {
      setError('An error occurred during verification.');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: '#FBF8F3',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        zIndex: 100
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          background: '#FFFFFF',
          border: '1px solid var(--border-subtle)',
          borderRadius: '24px',
          padding: '32px 24px',
          boxShadow: '0 8px 30px rgba(0, 0, 0, 0.05)',
          textAlign: 'center'
        }}
      >
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background: '#F3ECE1',
            color: 'var(--accent-terracotta)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto'
          }}
        >
          <Utensils size={32} />
        </div>

        <h2 style={{ fontSize: '1.6rem', marginBottom: '24px', lineHeight: 1.3 }}>
          Enter access code to continue
        </h2>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '16px' }}>
            <input
              type="text"
              className="form-input"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="Access code"
              autoCapitalize="characters"
              autoCorrect="off"
              spellCheck="false"
              autoFocus
              disabled={isVerifying}
              style={{
                textAlign: 'center',
                letterSpacing: '0.15em',
                fontSize: '1.2rem',
                fontWeight: 700
              }}
            />
          </div>

          {error && (
            <div
              style={{
                color: '#DC2626',
                fontSize: '0.86rem',
                marginBottom: '16px',
                fontWeight: 500
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isVerifying}
            style={{
              width: '100%',
              height: '50px',
              background: 'var(--accent-terracotta)',
              color: '#FFFFFF',
              fontSize: '1.05rem',
              fontWeight: 700,
              borderRadius: '14px',
              opacity: isVerifying ? 0.7 : 1
            }}
          >
            {isVerifying ? 'Checking...' : 'Continue'}
          </button>
        </form>
      </div>
    </div>
  );
};
