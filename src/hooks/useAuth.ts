import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useLocation } from "react-router";
import { LOGIN_PATH } from "@/const";
import { getCurrentUser, logoutUser } from "@/lib/localApi";

type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};

export function useAuth(options?: UseAuthOptions) {
  const { redirectOnUnauthenticated = false, redirectPath = LOGIN_PATH } =
    options ?? {};

  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState(() => getCurrentUser());

  const isLoading = false;
  const error = null;

  const logout = useCallback(() => {
    logoutUser();
    setUser(null);
    navigate(redirectPath);
  }, [navigate, redirectPath]);

  useEffect(() => {
    if (redirectOnUnauthenticated && !user) {
      const currentPath = location.pathname;
      if (currentPath !== redirectPath) {
        navigate(redirectPath);
      }
    }
  }, [redirectOnUnauthenticated, user, navigate, redirectPath, location.pathname]);

  const refresh = useCallback(() => {
    setUser(getCurrentUser());
  }, []);

  return useMemo(
    () => ({
      user,
      isAuthenticated: !!user,
      isLoading,
      error,
      logout,
      refresh,
    }),
    [user, isLoading, error, logout, refresh],
  );
}

export function useOfflineMode(): boolean {
  return true; // Always offline
}

export function useLocalAuth() {
  return {
    login: (_username: string, _password: string) => {
      return { success: true };
    },
    register: (_username: string, _password: string) => {
      return { success: true };
    },
  };
}
