import React, {
  createContext,
  useContext,
  useMemo,
  useCallback,
  useState,
  useEffect,
} from "react";
import { apiUrl } from "../api/config.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUserState] = useState(null);
  const [loading, setLoading] = useState(true);

  const setUser = useCallback((u) => {
    setUserState(u);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(apiUrl("/auth/me"), { credentials: "include" });
        if (cancelled) return;
        if (res.ok) {
          const data = await res.json();
          setUserState(data.user || null);
        } else {
          setUserState(null);
        }
      } catch (_) {
        if (!cancelled) setUserState(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await fetch(apiUrl("/auth/login"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "login_failed");
    setUserState(data.user || null);
    return data.user;
  }, []);

  const register = useCallback(async (email, password, name) => {
    const res = await fetch(apiUrl("/auth/register"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ email, password, name }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || "register_failed");
    setUserState(data.user || null);
    return data.user;
  }, []);

  const logout = useCallback(async () => {
    try {
      await fetch(apiUrl("/auth/logout"), {
        method: "POST",
        credentials: "include",
      });
    } catch (_) {}
    setUserState(null);
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, setUser }),
    [user, loading, login, register, logout, setUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
