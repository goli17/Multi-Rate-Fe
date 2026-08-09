import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from './api';

type AuthState = {
  email: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() =>
    getToken() ? localStorage.getItem('mrp_email') : null,
  );

  const login = useCallback(async (userEmail: string, password: string) => {
    const res = await api.login(userEmail, password);
    setToken(res.accessToken);
    localStorage.setItem('mrp_email', res.user.email);
    setEmail(res.user.email);
  }, []);

  const signup = useCallback(async (userEmail: string, password: string) => {
    const res = await api.signup(userEmail, password);
    setToken(res.accessToken);
    localStorage.setItem('mrp_email', res.user.email);
    setEmail(res.user.email);
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem('mrp_email');
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({ email, ready: true, login, signup, logout }),
    [email, login, signup, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
