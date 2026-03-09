import { createContext, useContext, useCallback } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "./queryClient";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  displayName: string | null;
};

type AuthContextType = {
  user: AuthUser | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (data: { email: string; username: string; password: string; displayName?: string }) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useQuery<AuthUser | null>({
    queryKey: ["/api/me"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/me", { credentials: "include" });
        if (res.status === 401) return null;
        if (!res.ok) return null;
        return res.json();
      } catch {
        return null;
      }
    },
    staleTime: Infinity,
    retry: false,
  });

  const login = useCallback(async (username: string, password: string) => {
    await apiRequest("POST", "/api/auth/login", { username, password });
    await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
  }, []);

  const register = useCallback(async (data: { email: string; username: string; password: string; displayName?: string }) => {
    await apiRequest("POST", "/api/auth/register", data);
    await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
  }, []);

  const logout = useCallback(async () => {
    await apiRequest("POST", "/api/auth/logout");
    queryClient.clear();
    await queryClient.invalidateQueries({ queryKey: ["/api/me"] });
  }, []);

  return (
    <AuthContext.Provider value={{ user: user ?? null, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
