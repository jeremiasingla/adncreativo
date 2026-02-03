import React, { createContext, useContext, useState, useEffect } from "react";
import { apiUrl } from "../api/config.js";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const ac = new AbortController();
    (async () => {
      try {
        let res = await fetch(apiUrl("/auth/me"), { credentials: "include", signal: ac.signal });
        if (res.status === 401) {
          const refreshRes = await fetch(apiUrl("/auth/refresh"), {
            method: "POST",
            credentials: "include",
            signal: ac.signal,
          });
          if (refreshRes.ok) {
            const data = await refreshRes.json();
            setUser(data.user ?? null);
          } else {
            setUser(null);
          }
        } else {
          const data = res.ok ? await res.json() : { user: null };
          setUser(data.user ?? null);
        }
      } catch (err) {
        if (err.name !== "AbortError") setUser(null);
      } finally {
        setLoading(false);
      }
    })();
    return () => ac.abort();
  }, []);

  async function logout() {
    await fetch(apiUrl("/auth/logout"), { method: "POST", credentials: "include" });
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, loading, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
