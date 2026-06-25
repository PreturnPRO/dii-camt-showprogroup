import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { UserRole } from '@/types';
import { api, ApiError, clearStoredToken, getStoredToken, normalizeUser, setStoredToken } from '@/lib/api';
import { hydrateFrontendData } from '@/lib/backend-data-bridge';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  nameThai: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  raw: unknown;
}

interface RegisterPayload {
  email: string;
  password: string;
  name: string;
  nameThai: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  profile: Record<string, unknown>;
}

interface AuthContextType {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string, role?: UserRole) => Promise<boolean>;
  companyLogin: (phone: string) => Promise<boolean>;
  register: (payload: RegisterPayload) => Promise<boolean>;
  updateProfile: (payload: Record<string, unknown>) => Promise<boolean>;
  logout: () => Promise<void>;
  switchRole: (role: UserRole) => Promise<void>;
  refreshSession: () => Promise<void>;
}

const globalAuthContext = globalThis as typeof globalThis & {
  __SHOWPRO_AUTH_CONTEXT__?: React.Context<AuthContextType | undefined>;
};

const AuthContext =
  globalAuthContext.__SHOWPRO_AUTH_CONTEXT__ ??
  (globalAuthContext.__SHOWPRO_AUTH_CONTEXT__ = createContext<AuthContextType | undefined>(undefined));

const demoAccountByRole: Record<UserRole, string> = {
  student: 'alice@student.showpro.local',
  lecturer: 'narin@showpro.local',
  staff: 'staff@showpro.local',
  company: 'talent@northernsoft.local',
  admin: 'admin@showpro.local',
};

const demoAccountsEnabled = import.meta.env.VITE_ENABLE_DEMO_ACCOUNTS === 'true';

const normalizeSessionUser = (rawUser: unknown): AuthUser => normalizeUser(rawUser as never);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const applySessionUser = useCallback(async (rawUser: unknown) => {
    try {
      await hydrateFrontendData(rawUser as never);
    } catch (error) {
      console.warn('Unable to hydrate live data for this session', error);
    }
    setUser(normalizeSessionUser(rawUser));
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const response = await api.auth.me();
      await applySessionUser(response.user);
    } catch (error) {
      clearStoredToken();
      setUser(null);

      if (!(error instanceof ApiError && error.status === 401)) {
        console.error('Failed to restore session', error);
      }
    } finally {
      setIsLoading(false);
    }
  }, [applySessionUser]);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  const login = useCallback(
    async (email: string, password: string, role?: UserRole): Promise<boolean> => {
      const response = await api.auth.login(email, password);
      setStoredToken(response.token);
      await applySessionUser(response.user);
      return true;
    },
    [applySessionUser],
  );

  const companyLogin = useCallback(
    async (phone: string): Promise<boolean> => {
      const response = await api.auth.companyLogin(phone);
      sessionStorage.setItem('showpro_company_first_access', 'true');
      setStoredToken(response.token);
      await applySessionUser(response.user);
      return true;
    },
    [applySessionUser],
  );

  const register = useCallback(
    async (payload: RegisterPayload): Promise<boolean> => {
      const response = await api.auth.register({
        ...payload,
        role: payload.role.toUpperCase(),
      });
      setStoredToken(response.token);
      await applySessionUser(response.user);
      return true;
    },
    [applySessionUser],
  );

  const updateProfile = useCallback(
    async (payload: Record<string, unknown>): Promise<boolean> => {
      const response = await api.auth.updateProfile(payload);
      await applySessionUser(response.user);
      return true;
    },
    [applySessionUser],
  );

  const logout = useCallback(async () => {
    try {
      if (getStoredToken()) {
        await api.auth.logout();
      }
    } catch (error) {
      console.warn('Logout request failed, clearing local session anyway.', error);
    } finally {
      clearStoredToken();
      setUser(null);
    }
  }, []);

  const switchRole = useCallback(
    async (role: UserRole) => {
      if (!demoAccountsEnabled) {
        throw new Error('Demo account switching is disabled.');
      }
      await login(demoAccountByRole[role], 'Password123!', role);
    },
    [login],
  );

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      companyLogin,
      register,
      updateProfile,
      logout,
      switchRole,
      refreshSession,
    }),
    [companyLogin, isLoading, login, logout, refreshSession, register, switchRole, updateProfile, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
