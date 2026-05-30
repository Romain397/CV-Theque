import React, { createContext, useContext, useEffect, useState } from 'react';

const AuthContext = createContext(null);

const DEFAULT_ADMIN = {
  id: 1,
  name: 'Administrateur CV-Theque',
  email: 'admin@cvtheque.local',
  password: 'admin123',
  role: 'admin',
  approved: true,
  approvedAt: new Date().toISOString(),
  approvedBy: 'system',
  profile: {
    headline: 'Administrateur de la plateforme',
    bio: '',
    tags: [],
  },
};

function normalizeUsers(users) {
  return users.map((user) => ({
    approved: false,
    profile: {
      headline: '',
      bio: '',
      displayName: '',
      tags: [],
      schoolId: '',
      companyId: '',
      studentId: '',
      ...(user.profile || {}),
      tags: Array.isArray(user.profile?.tags) ? user.profile.tags : [],
    },
    ...user,
    approved: Boolean(user.approved),
  }));
}

const API_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Synchronous loader used by UI for immediate rendering (reads localStorage).
// We keep a background sync to update local storage from the backend when possible.
export function loadUsers(){
  try {
    const rawUsers = JSON.parse(localStorage.getItem('cv_users') || '[]');
    const users = normalizeUsers(rawUsers);
    if (users.length === 0) {
      localStorage.setItem('cv_users', JSON.stringify([DEFAULT_ADMIN]));
      return [DEFAULT_ADMIN];
    }

    if (!users.some((user) => user.role === 'admin' && user.approved)) {
      const nextId = users.length ? Math.max(...users.map((user) => user.id)) + 1 : DEFAULT_ADMIN.id;
      const seededUsers = [...users, { ...DEFAULT_ADMIN, id: nextId }];
      localStorage.setItem('cv_users', JSON.stringify(seededUsers));
      return seededUsers;
    }

    const hasChanged = JSON.stringify(rawUsers) !== JSON.stringify(users);
    if (hasChanged) {
      localStorage.setItem('cv_users', JSON.stringify(users));
    }

    return users;
  } catch (e) {
    localStorage.setItem('cv_users', JSON.stringify([DEFAULT_ADMIN]));
    return [DEFAULT_ADMIN];
  }
}

// Save locally immediately, and attempt to persist to backend asynchronously.
export function saveUsers(users){
  try {
    localStorage.setItem('cv_users', JSON.stringify(users));
  } catch (e) {
    // ignore
  }

  // Async persist (best-effort)
  (async () => {
    try {
      const token = localStorage.getItem('cv_token');
      const authHeader = token ? { Authorization: `Bearer ${token}` } : {};
      for (const user of users) {
        if (user.id) {
          await fetch(`${API_URL}/users/${user.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', ...authHeader },
            body: JSON.stringify(user),
          });
        } else {
          await fetch(`${API_URL}/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(user),
          });
        }
      }
    } catch (e) {
      // network error — keep local copy
    }
  })();
}

// Background sync: try to pull users from backend and update localStorage
export async function syncUsersFromServer(){
    try {
      const token = localStorage.getItem('cv_token');
      const res = await fetch(`${API_URL}/users`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      if (!res.ok) return null;
      const users = await res.json();
    const normalized = normalizeUsers(users);
    localStorage.setItem('cv_users', JSON.stringify(normalized));
    return normalized;
  } catch (e) {
    return null;
  }
}

export function getAuthStats() {
  const users = loadUsers();
  return {
    total: users.length,
    approved: users.filter((user) => user.approved).length,
    pending: users.filter((user) => !user.approved).length,
    students: users.filter((user) => user.role === 'student').length,
    schools: users.filter((user) => user.role === 'school').length,
    companies: users.filter((user) => user.role === 'company').length,
    admins: users.filter((user) => user.role === 'admin').length,
  };
}

export function updateUserRecord(userId, updater) {
  const users = loadUsers();
  const nextUsers = users.map((user) => (user.id === userId ? updater(user) : user));
  saveUsers(nextUsers);
  return nextUsers;
}

export function AuthProvider({ children }){
  const [user, setUser] = useState(() => {
    const raw = localStorage.getItem('cv_auth');
    return raw ? JSON.parse(raw).user : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('cv_token'));

  useEffect(()=>{
    if (user && token) localStorage.setItem('cv_auth', JSON.stringify({ user, token }));
    else { localStorage.removeItem('cv_auth'); localStorage.removeItem('cv_token'); }
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;

    const users = loadUsers();
    const persistedUser = users.find((candidate) => candidate.id === user.id);
    if (!persistedUser || !persistedUser.approved) {
      setUser(null);
      setToken(null);
    }
  }, [user, token]);

  // On mount, try to sync users from server in background (updates localStorage)
  useEffect(() => {
    syncUsersFromServer().then((u)=>{
      if (u) {
        // if current user no longer approved, clear auth
        if (user && !u.some((x) => x.id === user.id && x.approved)) {
          setUser(null); setToken(null);
        }
      }
    });
  }, []);

  async function doLogin(email, password){
    const res = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'User not found or invalid credentials');
    }
    const payload = await res.json();
    const found = payload.user;
    const t = payload.token;
    setUser({ id: found.id, name: found.name, email: found.email, role: found.role, approved: found.approved, profile: found.profile || {} });
    setToken(t); localStorage.setItem('cv_token', t);
    return { user: { id: found.id, name: found.name, email: found.email, role: found.role, approved: found.approved, profile: found.profile || {} }, token: t };
  }

  async function doRegister(payload){
    const res = await fetch(`${API_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const body = await res.json();
    if (!res.ok) {
      throw new Error(body.error || 'Registration failed');
    }

    const record = body.user;
    if (body.token) {
      setUser({ id: record.id, name: record.name, email: record.email, role: record.role, approved: record.approved, profile: record.profile });
      setToken(body.token); localStorage.setItem('cv_token', body.token);
      return { user: record, token: body.token };
    }

    setUser(null);
    setToken(null);
    return { user: record, pending: true };
  }

  function logout(){ setUser(null); setToken(null); localStorage.removeItem('cv_token'); localStorage.removeItem('cv_auth'); }

  function refreshUser() {
    if (!user) return null;
    // fetch fresh user from backend
    try {
      const token = localStorage.getItem('cv_token');
      const res = fetch(`${API_URL}/users/${user.id}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
      return res.then((r)=> r.ok ? r.json() : null).then((u)=>{
        if (!u) { setUser(null); setToken(null); return null; }
        const nextUser = { id: u.id, name: u.name, email: u.email, role: u.role, approved: u.approved, profile: u.profile || {} };
        setUser(nextUser);
        localStorage.setItem('cv_auth', JSON.stringify({ user: nextUser, token }));
        return nextUser;
      }).catch(()=>{ setUser(null); setToken(null); return null; });
    } catch (e) {
      setUser(null); setToken(null); return null;
    }
  }

  return React.createElement(AuthContext.Provider, { value: { user, token, login: doLogin, register: doRegister, logout, refreshUser, loadUsers, saveUsers, updateUserRecord, getAuthStats } }, children);
}

export function useAuth(){ return useContext(AuthContext); }

export default AuthContext;
