import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { authApi, setAuthToken as saveToken, getAuthToken } from '@/services/api';
import { logger } from '@lark-apaas/client-toolkit-lite';

export interface CurrentUser {
  id: string;
  username: string;
  name: string;
  role: string;
  email?: string;
  phone?: string;
  department?: string;
  avatar?: string;
  status?: string;
}

interface AuthContextType {
  user: CurrentUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setLoading(false);
      setUser(null);
      return;
    }
    try {
      const data = (await authApi.me() as unknown) as CurrentUser;
      setUser(data);
    } catch (err) {
      logger.info('加载用户信息失败:', String(err));
      saveToken('');
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = async (username: string, password: string) => {
    const result = (await authApi.login(username, password) as unknown) as { token: string; user: CurrentUser };
    saveToken(result.token);
    setUser(result.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    saveToken('');
    setUser(null);
  };

  const refreshUser = async () => {
    await loadUser();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
