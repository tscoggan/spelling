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
import NotFound from "@/pages/not-found";
import { useEffect } from "react";

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
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
