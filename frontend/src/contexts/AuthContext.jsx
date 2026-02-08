import React, { createContext, useContext, useMemo, useCallback } from "react";
import { useClerk, useUser } from "@clerk/clerk-react";

const AuthContext = createContext(null);

const noop = () => {};

export function AuthProvider({ children }) {
  const { isLoaded, user: clerkUser } = useUser();
  const { signOut } = useClerk();
  const user = clerkUser
    ? {
        id: clerkUser.id,
        name: clerkUser.fullName || clerkUser.firstName || "",
        email: clerkUser.primaryEmailAddress?.emailAddress || "",
        imageUrl: clerkUser.imageUrl || "",
        role:
          clerkUser.publicMetadata?.role ||
          clerkUser.privateMetadata?.role ||
          clerkUser.unsafeMetadata?.role ||
          "user",
      }
    : null;
  const loading = !isLoaded;

  const logout = useCallback(async () => {
    await signOut();
  }, [signOut]);

  const value = useMemo(
    () => ({ user, loading, logout, setUser: noop }),
    [user, loading, logout]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
