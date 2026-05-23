'use client';
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import Cookies from 'js-cookie';
import { loginUser, registerUser, fetchMe } from '@/lib/api';

type User = { _id: string; name: string; email: string; role: 'admin' | 'customer'; phone?: string };

type AuthContextType = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: object) => Promise<void>;
  logout: () => void;
  isAdmin: boolean;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const saved = Cookies.get('riderr_token');
    if (saved) {
      setToken(saved);
      fetchMe(saved)
        .then(data => setUser(data.user))
        .catch(() => { Cookies.remove('riderr_token'); })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  async function login(email: string, password: string) {
    const data = await loginUser(email, password);
    if (data.error) throw new Error(data.error);
    Cookies.set('riderr_token', data.token, { expires: 7 });
    setToken(data.token);
    setUser(data.user);
  }

  async function register(formData: object) {
    const data = await registerUser(formData);
    if (data.error) throw new Error(data.error);
    Cookies.set('riderr_token', data.token, { expires: 7 });
    setToken(data.token);
    setUser(data.user);
  }

  function logout() {
    Cookies.remove('riderr_token');
    setToken(null);
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout, isAdmin: user?.role === 'admin' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
