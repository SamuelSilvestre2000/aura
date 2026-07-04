import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { User } from '../types';
import { Permission, can } from '../constants/permissions';
import {
  getSessionUser,
  login as authLogin,
  logout as authLogout,
  onAuthSessionChange,
} from '../services/auth';
import { isSupabaseConfigured } from '../services/supabase/client';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  isAdmin: boolean;
  can: (permission: Permission) => boolean;
  refresh: () => Promise<void>;
  usesSupabase: boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const usesSupabase = isSupabaseConfigured();

  const refresh = useCallback(async () => {
    const sessionUser = await getSessionUser();
    setUser(sessionUser);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;

    (async () => {
      await refresh();
      if (!cancelled) setLoading(false);

      if (usesSupabase) {
        unsubscribe = await onAuthSessionChange((nextUser) => {
          if (!cancelled) setUser(nextUser);
        });
      }
    })();

    return () => {
      cancelled = true;
      unsubscribe?.();
    };
  }, [refresh, usesSupabase]);

  const login = useCallback(async (email: string, password: string) => {
    const loggedIn = await authLogin(email, password);
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
    () => ({ user, loading, login, logout, isAdmin, can: canDo, refresh, usesSupabase }),
    [user, loading, login, logout, isAdmin, canDo, usesSupabase]
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
