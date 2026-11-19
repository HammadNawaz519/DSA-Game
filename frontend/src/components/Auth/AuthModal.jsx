import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';

/* SVG eye icon — no emoji */
const EyeOpen = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
    <circle cx="12" cy="12" r="3"/>
  </svg>
);

const EyeClosed = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
    <line x1="1" y1="1" x2="23" y2="23"/>
  </svg>
);

const AlertIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

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

  const getPasswordStrength = () => {
    if (!password) return 0;
    let s = 0;
    if (password.length >= 6) s += 33;
    if (/[A-Z]/.test(password) || /[0-9]/.test(password)) s += 33;
    if (/[^A-Za-z0-9]/.test(password) && password.length >= 8) s += 34;
    return s;
  };

  const strengthColor = () => {
    const v = getPasswordStrength();
    if (v > 66) return '#5aaa2a';
    if (v > 33) return '#d4900a';
    return '#b53028';
  };

  return (
    <div className="modal-backdrop">
      <div style={{
        width: 420,
        maxWidth: '92vw',
        background: 'rgba(8, 16, 7, 0.97)',
        border: '2px solid rgba(80, 130, 40, 0.5)',
        borderTop: '3px solid rgba(100, 170, 50, 0.7)',
        borderRadius: 6,
        padding: 32,
        boxShadow: '0 20px 60px rgba(0,0,0,0.9)',
        animation: 'slide-up 0.2s ease',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
          <div>
            <h2 style={{
              fontFamily: "'Barlow Condensed', sans-serif",
              fontWeight: 700,
              fontSize: 22,
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              color: '#fce8c4',
              marginBottom: 4,
            }}>
              {isRegister ? 'Create Account' : 'Welcome Back'}
            </h2>
            <p style={{ color: 'rgba(160, 145, 120, 0.7)', fontSize: 13 }}>
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
            ✕
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: 'rgba(181, 48, 40, 0.18)',
            border: '1px solid rgba(181, 48, 40, 0.5)',
            borderRadius: 4, padding: '10px 14px',
            marginBottom: 18, fontSize: 13, color: '#ff9b8a',
          }}>
            <AlertIcon />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Username */}
          <div>
            <label style={{
              display: 'block', marginBottom: 6,
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
              display: 'block', marginBottom: 6,
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
                {showPassword ? <EyeClosed /> : <EyeOpen />}
              </button>
            </div>

            {/* Strength bar — only on register */}
            {isRegister && password && (
              <div style={{ marginTop: 7 }}>
                <div style={{ height: 3, background: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${getPasswordStrength()}%`,
                    background: strengthColor(),
                    transition: 'width 0.3s, background 0.3s',
                    borderRadius: 2,
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          {isRegister && (
            <div>
              <label style={{
                display: 'block', marginBottom: 6,
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
          marginTop: 18, textAlign: 'center',
          fontSize: 13, color: 'rgba(160, 145, 120, 0.65)',
        }}>
          {isRegister ? (
            <>
              Already have an account?{' '}
              <button
                onClick={() => setIsRegister(false)}
                style={{ background: 'none', border: 'none', color: '#90c860', cursor: 'pointer', fontSize: 13, padding: 0 }}
              >
                Sign in
              </button>
            </>
          ) : (
            <>
              New recruit?{' '}
              <button
                onClick={() => setIsRegister(true)}
                style={{ background: 'none', border: 'none', color: '#90c860', cursor: 'pointer', fontSize: 13, padding: 0 }}
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
