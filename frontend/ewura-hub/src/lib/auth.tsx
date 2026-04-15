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

  const { data: fetchedUser, isLoading, isError } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      retry: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      refetchOnReconnect: false,
      gcTime: 24 * 60 * 60 * 1000, // 24 hours
    },
  });

  useEffect(() => {
    if (!isLoading) {
      if (isError || !fetchedUser) {
        setUser(null);
      } else {
        setUser(fetchedUser);
      }
    }
  }, [fetchedUser, isLoading, isError]);

  const login = (newUser: User) => {
    setUser(newUser);
    queryClient.setQueryData(getGetMeQueryKey(), newUser);
    // Force refetch on mobile after login to ensure session persists
    setTimeout(() => {
      queryClient.invalidateQueries({ queryKey: getGetMeQueryKey() });
    }, 500);
  };

  const logout = () => {
    setUser(null);
    queryClient.setQueryData(getGetMeQueryKey(), null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
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
