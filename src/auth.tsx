import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { api, getToken, setToken } from './api';

type SignupResult =
  | { requiresVerification: true; email: string }
  | { requiresVerification: false; email: string };

type AuthState = {
  email: string | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<SignupResult>;
  completeLogin: (accessToken: string, email: string) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [email, setEmail] = useState<string | null>(() =>
    getToken() ? localStorage.getItem('mrp_email') : null,
  );

  const completeLogin = useCallback((accessToken: string, userEmail: string) => {
    setToken(accessToken);
    localStorage.setItem('mrp_email', userEmail);
    setEmail(userEmail);
  }, []);

  const login = useCallback(
    async (userEmail: string, password: string) => {
      const res = await api.login(userEmail, password);
      completeLogin(res.accessToken, res.user.email);
    },
    [completeLogin],
  );

  const signup = useCallback(
    async (userEmail: string, password: string): Promise<SignupResult> => {
      const res = await api.signup(userEmail, password);
      if (res.accessToken && res.user) {
        completeLogin(res.accessToken, res.user.email);
        return { requiresVerification: false, email: res.user.email };
      }
      return {
        requiresVerification: true,
        email: res.email ?? userEmail,
      };
    },
    [completeLogin],
  );

  const logout = useCallback(() => {
    setToken(null);
    localStorage.removeItem('mrp_email');
    setEmail(null);
  }, []);

  const value = useMemo(
    () => ({ email, ready: true, login, signup, completeLogin, logout }),
    [email, login, signup, completeLogin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
