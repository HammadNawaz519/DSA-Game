import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export const API_BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:8080';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('pvz_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem('pvz_user');
    if (savedUser && token) {
      try {
        setUser(JSON.parse(savedUser));
      } catch (e) {
        localStorage.removeItem('pvz_user');
      }
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      setUser(data.user);
      setToken(data.token);
      localStorage.setItem('pvz_token', data.token);
      localStorage.setItem('pvz_user', JSON.stringify(data.user));
      return { success: true };
    }
    return { success: false, error: data.error || 'Login failed' };
  };

  const register = async (username, password) => {
    const res = await fetch(`${API_BASE}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const data = await res.json();
    if (data.success) {
      // Auto login after register
      return await login(username, password);
    }
    return { success: false, error: data.error || 'Registration failed' };
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('pvz_token');
    localStorage.removeItem('pvz_user');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, register, logout, loading, API_BASE }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
