import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const GUEST_USER_ID_KEY = "spelling_playground_guest_id";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isGuestMode: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  guestLoginMutation: UseMutationResult<SelectUser, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const [guestUserId, setGuestUserId] = useState<number | null>(() => {
    const stored = localStorage.getItem(GUEST_USER_ID_KEY);
    return stored ? parseInt(stored, 10) : null;
  });

  const {
    data: sessionUser,
    error: sessionError,
    isLoading: sessionLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  const {
    data: guestUser,
    error: guestError,
    isLoading: guestLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/guest-user", guestUserId],
    queryFn: async () => {
      if (!guestUserId) return undefined;
      const res = await fetch(`/api/guest-user/${guestUserId}`);
      if (!res.ok) {
        localStorage.removeItem(GUEST_USER_ID_KEY);
        setGuestUserId(null);
        return undefined;
      }
      return res.json();
    },
    enabled: !!guestUserId && !sessionUser,
  });

  const user = sessionUser || guestUser || null;
  const error = sessionError || guestError || null;
  const isLoading = sessionLoading || (!!guestUserId && guestLoading);
  const isGuestMode = !sessionUser && !!guestUser;

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
      // Refresh notification count on login
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos/count"] });
      queryClient.invalidateQueries({ queryKey: ["/api/user-to-dos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const res = await apiRequest("POST", "/api/register", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      queryClient.setQueryData(["/api/user"], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Registration failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      if (isGuestMode) {
        localStorage.removeItem(GUEST_USER_ID_KEY);
        setGuestUserId(null);
        return;
      }
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
      queryClient.removeQueries({ queryKey: ["/api/guest-user"] });
      queryClient.removeQueries({ queryKey: ["/api/word-lists"] });
      queryClient.removeQueries({ queryKey: ["/api/word-lists/shared-with-me"] });
      queryClient.removeQueries({ queryKey: ["/api/user-groups"] });
      queryClient.removeQueries({ queryKey: ["/api/user-to-dos"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Logout failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const guestLoginMutation = useMutation({
    mutationFn: async () => {
      const existingGuestId = localStorage.getItem(GUEST_USER_ID_KEY);
      if (existingGuestId) {
        const res = await fetch(`/api/guest-user/${existingGuestId}`);
        if (res.ok) {
          return res.json();
        }
      }
      const res = await apiRequest("POST", "/api/guest-user", {});
      return res.json();
    },
    onSuccess: (user: SelectUser) => {
      localStorage.setItem(GUEST_USER_ID_KEY, user.id.toString());
      setGuestUserId(user.id);
      queryClient.setQueryData(["/api/guest-user", user.id], user);
    },
    onError: (error: Error) => {
      toast({
        title: "Guest login failed",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isGuestMode,
        loginMutation,
        logoutMutation,
        registerMutation,
        guestLoginMutation,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
