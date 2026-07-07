'use client';

import { createContext, type ReactNode, useState, useCallback, useMemo } from 'react';
import { AuthUser, logout as logoutRequest } from '../services/auth';

type AuthContextValue = {
  loading: boolean;
  logout: () => ReturnType<typeof logoutRequest>;
  // refreshUser: () => Promise<void>;
  user: AuthUser | null;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading] = useState(false);

  // const refreshUser = useCallback(async () => {
  //   setLoading(true);

  //   try {
  //     const result = await getCurrentUser();

  //     setUser(result.error ? null : (result.data?.data ?? null));
  //   } catch {
  //     setUser(null);
  //   } finally {
  //     setLoading(false);
  //   }
  // }, []);

  const logout = useCallback(async () => {
    const result = await logoutRequest();

    if (!result.error) {
      setUser(null);
    }
    return result;
  }, []);

  // useEffect(() => {
  //   if(isPublicRoute(pathname)){
  //     setUser(null);
  //     setLoading(false);
  //     return;
  //   }
  //   void refreshUser();
  // }, [pathname, refreshUser]);

  const value = useMemo(() => ({ loading, logout, user }), [loading, logout, user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
