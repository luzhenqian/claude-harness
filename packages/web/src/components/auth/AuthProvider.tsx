'use client';

import { createContext, useContext, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';

interface AuthContext {
  user: { id: string; name: string; avatarUrl: string } | null;
  loading: boolean;
  logout: () => void;
}

const AuthCtx = createContext<AuthContext>({ user: null, loading: true, logout: () => {} });

export function AuthProvider({ children }: { children: ReactNode }) {
  const auth = useAuth();
  return <AuthCtx.Provider value={auth}>{children}</AuthCtx.Provider>;
}

export function useAuthContext() { return useContext(AuthCtx); }
