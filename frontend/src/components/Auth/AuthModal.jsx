import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

export default function AuthModal({ isOpen, onClose }) {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    setLoading(true);
    const result = isRegister
      ? await register(username, password)
      : await login(username, password);

    setLoading(false);
    if (result.success) {
      onClose();
    } else {
      setError(result.error);
    }
  };

  return (
    <div className="modal-backdrop">
      <div style={{
        width: 380,
        maxWidth: '92vw',
        background: 'rgba(8, 16, 7, 0.97)',
        border: '2px solid rgba(80, 130, 40, 0.5)',
        borderTop: '3px solid rgba(100, 170, 50, 0.7)',
        borderRadius: 6,
        padding: 28,
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        animation: 'slide-up 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 20,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#fce8c4',
              marginBottom: 4,
            }}>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p style={{ color: 'rgba(160, 145, 120, 0.7)', fontSize: 12 }}>
              {isRegister
                ? 'Register to compete on the global leaderboard'
                : 'Sign in to access your tactical profile'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none', border: 'none', color: 'rgba(180,160,130,0.5)',
              cursor: 'pointer', fontSize: 18, lineHeight: 1, padding: 4,
              transition: 'color 0.1s',
            }}
            onMouseEnter={(e) => e.currentTarget.style.color = '#fce8c4'}
            onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(180,160,130,0.5)'}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(181, 48, 40, 0.18)',
            border: '1px solid rgba(181, 48, 40, 0.5)',
            borderRadius: 4, padding: '10px 14px',
            marginBottom: 16, fontSize: 12, color: '#ff9b8a',
          }}>
            <span style={{fontWeight: 'bold'}}>!</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Username */}
          <div>
            <label style={{
              display: 'block', marginBottom: 5,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(130, 190, 80, 0.8)',
            }}>
              Username
            </label>
            <input
              className="pvz-input"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. CrazyDave42"
              autoComplete="username"
            />
          </div>

          {/* Password */}
          <div>
            <label style={{
              display: 'block', marginBottom: 5,
              fontFamily: "'Barlow Condensed', sans-serif",
              fontSize: 11, fontWeight: 600,
              letterSpacing: '0.08em', textTransform: 'uppercase',
              color: 'rgba(130, 190, 80, 0.8)',
            }}>
              Password
            </label>
            <div style={{ position: 'relative' }}>
              <input
                className="pvz-input"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                style={{ paddingRight: 42 }}
                autoComplete={isRegister ? 'new-password' : 'current-password'}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none',
                  color: 'rgba(160, 145, 120, 0.6)', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', padding: 0,
                  transition: 'color 0.1s',
                }}
                onMouseEnter={(e) => e.currentTarget.style.color = '#fce8c4'}
                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(160, 145, 120, 0.6)'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? '🙈' : '👁'}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          {isRegister && (
            <div>
              <label style={{
                display: 'block', marginBottom: 5,
                fontFamily: "'Barlow Condensed', sans-serif",
                fontSize: 11, fontWeight: 600,
                letterSpacing: '0.08em', textTransform: 'uppercase',
                color: 'rgba(130, 190, 80, 0.8)',
              }}>
                Confirm Password
              </label>
              <input
                className="pvz-input"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="new-password"
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="pvz-btn"
            disabled={loading}
            style={{ width: '100%', justifyContent: 'center', padding: '12px', fontSize: 14, marginTop: 4 }}
          >
            {loading
              ? 'Processing...'
              : isRegister
                ? 'Register & Enter Garden'
                : 'Authenticate & Play'}
          </button>
        </form>

        {/* Switch mode */}
        <div style={{
          marginTop: 16, textAlign: 'center',
          fontSize: 12, color: 'rgba(160, 145, 120, 0.65)',
        }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: '#90c860', cursor: 'pointer', fontSize: 12, padding: 0 }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New recruit?{' '}
              <button
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: '#90c860', cursor: 'pointer', fontSize: 12, padding: 0 }}
              >
                Create account
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}