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

export function saveUsers(users){ localStorage.setItem('cv_users', JSON.stringify(users)); }

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

  async function doLogin(email, password){
    const users = loadUsers();
    const found = users.find((u) => u.email === email && u.password === password);
    if (!found) throw new Error('User not found or invalid credentials');
    if (!found.approved) {
      throw new Error('Votre compte est en attente de validation par un administrateur.');
    }
    const t = 'local-' + Date.now();
    setUser({ id: found.id, name: found.name, email: found.email, role: found.role, approved: found.approved, profile: found.profile || {} });
    setToken(t); localStorage.setItem('cv_token', t);
    return { user: { id: found.id, name: found.name, email: found.email, role: found.role, approved: found.approved, profile: found.profile || {} }, token: t };
  }

  async function doRegister(payload){
    const users = loadUsers();
    const id = users.length ? Math.max(...users.map((u)=>u.id)) + 1 : 1;
    const isBootstrapAdmin = payload.role === 'admin' && !users.some((user) => user.role === 'admin' && user.approved);
    const record = {
      id,
      name: payload.name || payload.firstName || 'Utilisateur',
      email: payload.email,
      password: payload.password || 'changeme',
      role: payload.role || 'student',
      approved: isBootstrapAdmin,
      approvedAt: isBootstrapAdmin ? new Date().toISOString() : null,
      approvedBy: isBootstrapAdmin ? 'system' : null,
      profile: {
        headline: '',
        bio: '',
        displayName: '',
        tags: [],
        schoolId: '',
        companyId: '',
        studentId: '',
      },
    };
    users.push(record); saveUsers(users);
    if (record.approved) {
      const t = 'local-' + Date.now();
      setUser({ id: record.id, name: record.name, email: record.email, role: record.role, approved: record.approved, profile: record.profile });
      setToken(t); localStorage.setItem('cv_token', t);
      return { user: { id: record.id, name: record.name, email: record.email, role: record.role, approved: record.approved, profile: record.profile }, token: t };
    }

    setUser(null);
    setToken(null);
    return { user: { id: record.id, name: record.name, email: record.email, role: record.role, approved: record.approved, profile: record.profile }, pending: true };
  }

  function logout(){ setUser(null); setToken(null); localStorage.removeItem('cv_token'); localStorage.removeItem('cv_auth'); }

  function refreshUser() {
    if (!user) return null;

    const users = loadUsers();
    const persisted = users.find((candidate) => candidate.id === user.id);

    if (!persisted) {
      setUser(null);
      setToken(null);
      return null;
    }

    const nextUser = {
      id: persisted.id,
      name: persisted.name,
      email: persisted.email,
      role: persisted.role,
      approved: persisted.approved,
      profile: persisted.profile || {},
    };

    setUser(nextUser);
    localStorage.setItem('cv_auth', JSON.stringify({ user: nextUser, token }));
    return nextUser;
  }

  return React.createElement(AuthContext.Provider, { value: { user, token, login: doLogin, register: doRegister, logout, refreshUser, loadUsers, saveUsers, updateUserRecord, getAuthStats } }, children);
}

export function useAuth(){ return useContext(AuthContext); }

export default AuthContext;
