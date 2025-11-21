import { Switch, Route, useLocation, useSearch } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "@/lib/protected-route";
import Home from "@/pages/home";
import Game from "@/pages/game";
import Leaderboard from "@/pages/leaderboard";
import WordListsPage from "@/pages/word-lists";
import UserGroupsPage from "@/pages/user-groups";
import AdminPage from "@/pages/admin";
import AuthPage from "@/pages/auth-page";
import ResetPasswordPage from "@/pages/reset-password";
import NotFound from "@/pages/not-found";
import { useEffect, useRef, createContext, useContext } from "react";

// Context for sharing the hidden iOS keyboard trigger input
const IOSKeyboardContext = createContext<{ inputRef: React.RefObject<HTMLInputElement> } | null>(null);

export const useIOSKeyboardTrigger = () => {
  const context = useContext(IOSKeyboardContext);
  return context?.inputRef || null;
};

// Guard component to ensure Game page is only accessed with a listId
function GamePageGuard() {
  const searchParams = useSearch();
  const [, setLocation] = useLocation();
  const params = new URLSearchParams(searchParams);
  const listId = params.get("listId");

  useEffect(() => {
    if (!listId) {
      // Redirect to home where user can select a word list
      setLocation("/");
    }
  }, [listId, setLocation]);

  // Show loading/redirecting message while redirect happens
  if (!listId) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center">
          <p className="text-xl mb-4">Please select a word list to play</p>
          <p className="text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

  return <Game />;
}

function Router() {
  return (
    <Switch>
      <ProtectedRoute path="/" component={Home} />
      <ProtectedRoute path="/game" component={GamePageGuard} />
      <ProtectedRoute path="/leaderboard" component={Leaderboard} />
      <ProtectedRoute path="/word-lists" component={WordListsPage} />
      <ProtectedRoute path="/user-groups" component={UserGroupsPage} />
      <ProtectedRoute path="/admin" component={AdminPage} />
      <Route path="/auth" component={AuthPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  // Hidden input for iOS keyboard trigger - must be focused BEFORE navigation
  // This maintains user gesture context across route transitions
  const iOSKeyboardInputRef = useRef<HTMLInputElement>(null);

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <IOSKeyboardContext.Provider value={{ inputRef: iOSKeyboardInputRef }}>
            <Toaster />
            {/* Hidden input for iOS keyboard activation - positioned off-screen but focusable */}
            <input
              ref={iOSKeyboardInputRef}
              type="text"
              className="fixed -left-[9999px] top-0 w-1 h-1 opacity-0 pointer-events-none"
              tabIndex={-1}
              aria-hidden="true"
            />
            <Router />
          </IOSKeyboardContext.Provider>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
