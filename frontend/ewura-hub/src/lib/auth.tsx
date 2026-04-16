import { createContext, useContext, useEffect, useState } from "react";
import { useGetMe, getGetMeQueryKey } from "@workspace/api-client-react";
import type { User } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";

interface AuthContextType {
  user: User | null | undefined;
  isLoading: boolean;
  login: (user: User) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  // Initialize auth state from localStorage and verify with backend
  useEffect(() => {
    const initAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          // Token exists, verify it with backend immediately
          queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
        } else {
          // No token, user is not authenticated
          setUser(null);
        }
      } catch (err) {
        console.error('Auth init error:', err);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };
    
    initAuth();
  }, [queryClient]);

  const { data: fetchedUser, isLoading: isFetching, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
      enabled: !!localStorage.getItem('token'), // Only fetch if we have a token
    },
  });

  // Update user when the backend response comes back
  useEffect(() => {
    if (!isFetching) {
      if (isError || !fetchedUser) {
        setUser(null);
        localStorage.removeItem('token');
      } else {
        setUser(fetchedUser);
      }
      setLoading(false);
    }
  }, [fetchedUser, isFetching, isError]);

  const login = (newUser: User) => {
    setUser(newUser);
    // Token should be set by the backend login response and stored by the API client
    queryClient.setQueryData(getGetMeQueryKey(), newUser);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('token');
    queryClient.setQueryData(getGetMeQueryKey(), null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading: loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
