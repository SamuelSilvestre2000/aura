import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { Permission, can } from '../constants/permissions';
import { getSessionUser, login as authLogin, logout as authLogout } from '../services/auth';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (name: string, pin: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const sessionUser = await getSessionUser();
    setUser(sessionUser);
  }, []);

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, [refresh]);

  const login = useCallback(async (name: string, pin: string) => {
    const loggedIn = await authLogin(name, pin);
    if (!loggedIn) return false;
    setUser(loggedIn);
    return true;
  }, []);

  const logout = useCallback(async () => {
    await authLogout();
    setUser(null);
  }, []);

  const isAdmin = user?.role === 'admin';

  const canDo = useCallback(
    (permission: Permission) => (user ? can(user.role, permission) : false),
    [user]
  );

  const value = useMemo(
    () => ({ user, loading, login, logout, isAdmin, can: canDo, refresh }),
    [user, loading, login, logout, isAdmin, canDo, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return ctx;
}
