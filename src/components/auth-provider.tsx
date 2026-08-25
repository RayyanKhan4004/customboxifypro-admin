"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePathname } from "next/navigation";

import { apiGet, apiPost, clearClientSessionCookies } from "@/lib/api";
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
  const queryClient = useQueryClient();
  const pathname = usePathname();
  const isPublicAuthPage =
    pathname === "/login" || pathname === "/reset-password";
  const [user, setUser] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(!isPublicAuthPage);
  const sessionRequestId = useRef(0);
  const sessionCheckStarted = useRef(false);
  const sessionInvalidated = useRef(false);

  useEffect(() => {
    if (
      isPublicAuthPage ||
      user ||
      sessionCheckStarted.current ||
      sessionInvalidated.current
    ) {
      return;
    }

    sessionCheckStarted.current = true;
    const requestId = ++sessionRequestId.current;

    apiGet<AdminUser>("/admin/auth/me")
      .then((admin) => {
        if (requestId === sessionRequestId.current) {
          setUser(admin);
        }
      })
      .catch(() => {
        if (requestId === sessionRequestId.current) {
          setUser(null);
        }
      })
      .finally(() => {
        if (requestId === sessionRequestId.current) {
          setLoading(false);
        }
      });
  }, [isPublicAuthPage, user]);

  useEffect(() => {
    const handleSessionExpired = () => {
      sessionInvalidated.current = true;
      sessionRequestId.current += 1;
      queryClient.clear();
      setUser(null);
      setLoading(false);
    };
    window.addEventListener("admin-session-expired", handleSessionExpired);
    return () => window.removeEventListener("admin-session-expired", handleSessionExpired);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    sessionInvalidated.current = false;
    const requestId = ++sessionRequestId.current;
    setLoading(true);
    try {
      const session = await apiPost<AdminSessionResponse | null>(
        "/admin/auth/login",
        { email, password },
      );
      const admin = session?.admin ?? await apiGet<AdminUser>("/admin/auth/me");
      if (requestId === sessionRequestId.current) {
        setUser(admin);
      }
    } finally {
      if (requestId === sessionRequestId.current) {
        setLoading(false);
      }
    }
  }, []);

  const logout = useCallback(async () => {
    sessionRequestId.current += 1;
    try {
      await apiPost("/admin/auth/logout");
    } catch {
      // Local cleanup still completes when the API is unavailable.
    } finally {
      await clearClientSessionCookies();
    }
    queryClient.clear();
    setUser(null);
    window.location.replace("/login");
  }, [queryClient]);

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
