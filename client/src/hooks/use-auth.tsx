import { createContext, ReactNode, useContext, useState } from "react";
import {
  useQuery,
  useMutation,
  UseMutationResult,
} from "@tanstack/react-query";
import { insertUserSchema, User as SelectUser, InsertUser } from "@shared/schema";
import { getQueryFn, apiRequest, queryClient } from "../lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useGuestSession } from "@/hooks/use-guest-session";

type AuthContextType = {
  user: SelectUser | null;
  isLoading: boolean;
  error: Error | null;
  isGuestMode: boolean;
  loginMutation: UseMutationResult<SelectUser, Error, LoginData>;
  logoutMutation: UseMutationResult<void, Error, void>;
  registerMutation: UseMutationResult<SelectUser, Error, InsertUser>;
  guestLoginMutation: UseMutationResult<void, Error, void>;
};

type LoginData = Pick<InsertUser, "username" | "password">;

const GUEST_USER: SelectUser = {
  id: 0,
  username: "guest",
  password: "",
  firstName: null,
  lastName: null,
  email: null,
  selectedAvatar: null,
  selectedTheme: "default",
  preferredVoice: null,
  stars: 0,
  role: "student",
  accountType: "free",
  createdAt: new Date(),
};

export const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();
  const { resetSession } = useGuestSession();
  const [isGuestMode, setIsGuestMode] = useState(false);

  const {
    data: sessionUser,
    error: sessionError,
    isLoading: sessionLoading,
  } = useQuery<SelectUser | undefined, Error>({
    queryKey: ["/api/user"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });

  // Detect legacy guest users (username starts with "guest_") and treat them as guest mode
  const isLegacyGuest = sessionUser?.username?.startsWith("guest_") ?? false;
  const effectiveIsGuestMode = isGuestMode || isLegacyGuest;
  
  // For legacy guests, use the GUEST_USER constant instead of the legacy record
  const user = isLegacyGuest 
    ? GUEST_USER 
    : (sessionUser || (isGuestMode ? GUEST_USER : null));
  const error = sessionError || null;
  const isLoading = sessionLoading;

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      const res = await apiRequest("POST", "/api/login", credentials);
      return await res.json();
    },
    onSuccess: (user: SelectUser) => {
      setIsGuestMode(false);
      queryClient.setQueryData(["/api/user"], user);
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
      setIsGuestMode(false);
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
        setIsGuestMode(false);
        resetSession();
        return;
      }
      await apiRequest("POST", "/api/logout");
    },
    onSuccess: () => {
      setIsGuestMode(false);
      resetSession();
      queryClient.setQueryData(["/api/user"], null);
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
      setIsGuestMode(true);
    },
    onSuccess: () => {
      queryClient.setQueryData(["/api/user"], null);
    },
  });

  return (
    <AuthContext.Provider
      value={{
        user: user ?? null,
        isLoading,
        error,
        isGuestMode: effectiveIsGuestMode,
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
