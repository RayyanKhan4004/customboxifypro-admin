"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { apiGet, apiPost } from "@/lib/api";
import type { AdminSessionResponse, AdminUser } from "@/lib/types";

interface AuthContextValue {
  user: AdminUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  can: (permission: string) => boolean;
  hasAny: (permissions: string[]) => boolean;
  setUser: (user: AdminUser) => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  loading: true,
  login: async () => {},
  logout: async () => {},
  can: () => false,
  hasAny: () => false,
  setUser: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    apiGet<AdminUser>("/admin/auth/me")
      .then(setUser)
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const session = await apiPost<AdminSessionResponse>("/admin/auth/login", {
      email,
      password,
    });
    setUser(session.admin);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiPost("/admin/auth/logout");
    } catch {
      // cookie is cleared client-side regardless
    }
    setUser(null);
    window.location.assign("/login");
  }, []);

  const can = useCallback(
    (permission: string) => user?.permissions?.includes(permission) ?? false,
    [user],
  );

  const hasAny = useCallback(
    (permissions: string[]) =>
      permissions.some((permission) =>
        user?.permissions?.includes(permission),
      ),
    [user],
  );

  return (
    <AuthContext.Provider
      value={{ user, loading, login, logout, can, hasAny, setUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  return useContext(AuthContext);
}
