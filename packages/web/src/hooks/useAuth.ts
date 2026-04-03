'use client';

import { useState, useEffect, useCallback } from 'react';
import { getToken, setToken, clearToken } from '@/lib/auth';
import { api } from '@/lib/api-client';

interface User { id: string; name: string; avatarUrl: string; }

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = getToken();
    if (!token) { setLoading(false); return; }
    api.getMe().then(setUser).catch(() => clearToken()).finally(() => setLoading(false));
  }, []);

  const handleCallback = useCallback((token: string) => {
    setToken(token);
    api.getMe().then(setUser);
  }, []);

  const logout = useCallback(() => { clearToken(); setUser(null); }, []);

  return { user, loading, handleCallback, logout };
}
