import React, { createContext, useContext } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { isLoaded, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const user = clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "",
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
      }
    : null;
  const loading = !isLoaded;

  async function logout() {
    await signOut();
  }

  return (
    <AuthContext.Provider
      value={{ user, loading, logout, setUser: () => {} }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
