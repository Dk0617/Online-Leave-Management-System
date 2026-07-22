"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import { AuthUser, Role } from "@/src/types";
import { api, ApiError, setToken, getToken, normalizeAuthUser } from "@/src/api";

const USER_KEY = "ols_session_user";

export const ROLE_HOME: Record<Role, string> = {
  ADMIN: "/admin",
  STUDENT: "/student",
  HOD: "/hod",
  TROOP: "/troop",
  SQUADRAN: "/squadran",
  SDD: "/sdd",
  GATE: "/gate",
};

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<AuthUser | null>;
  requestOtp: (email: string) => Promise<void>;
  loginWithOtp: (email: string, code: string) => Promise<AuthUser | null>;
  logout: () => void;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  refreshUser: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = getToken();
    const raw = window.localStorage.getItem(USER_KEY);
    if (token && raw) {
      try {
        setUser(JSON.parse(raw) as AuthUser);
      } catch {
        setToken(null);
        window.localStorage.removeItem(USER_KEY);
      }
    }
    setLoading(false);
  }, []);

  async function login(username: string, password: string): Promise<AuthUser | null> {
    try {
      const data = await api.post<{ token: string; user: Record<string, unknown> }>(
        "/auth/login",
        { username, password }
      );
      const normalized = normalizeAuthUser(data.user);
      setToken(data.token);
      window.localStorage.setItem(USER_KEY, JSON.stringify(normalized));
      setUser(normalized);
      return normalized;
    } catch (err) {
      if (err instanceof ApiError) return null;
      throw err;
    }
  }

  async function requestOtp(email: string): Promise<void> {
    await api.post("/auth/otp/request", { email });
  }

  async function loginWithOtp(email: string, code: string): Promise<AuthUser | null> {
    const data = await api.post<{ token: string; user: Record<string, unknown> }>(
      "/auth/otp/verify",
      { email, code }
    );
    const normalized = normalizeAuthUser(data.user);
    setToken(data.token);
    window.localStorage.setItem(USER_KEY, JSON.stringify(normalized));
    setUser(normalized);
    return normalized;
  }

  function logout() {
    setUser(null);
    setToken(null);
    window.localStorage.removeItem(USER_KEY);
    router.push("/");
  }

  useEffect(() => {
    function handleUnauthorized() {
      setUser(null);
      setToken(null);
      window.localStorage.removeItem(USER_KEY);
      router.push("/");
    }
    window.addEventListener("auth:unauthorized", handleUnauthorized);
    return () => window.removeEventListener("auth:unauthorized", handleUnauthorized);
  }, [router]);

  async function changePassword(currentPassword: string, newPassword: string) {
    await api.post("/auth/change-password", { currentPassword, newPassword });
    if (user) {
      const updated = { ...user, mustChangePassword: false };
      setUser(updated);
      window.localStorage.setItem(USER_KEY, JSON.stringify(updated));
    }
  }

  function refreshUser() {
    const raw = window.localStorage.getItem(USER_KEY);
    if (raw) setUser(JSON.parse(raw) as AuthUser);
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, login, requestOtp, loginWithOtp, logout, changePassword, refreshUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
