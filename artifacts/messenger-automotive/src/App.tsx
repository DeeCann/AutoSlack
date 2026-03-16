import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useGetAuthStatus } from "@workspace/api-client-react";
import { Loader2, Hash } from "lucide-react";

import Dashboard from "@/pages/Dashboard";
import Login from "@/pages/Login";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function LoadingScreen() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
      <div className="w-24 h-24 bg-primary/20 rounded-3xl flex items-center justify-center shadow-lg shadow-primary/20 mb-8 animate-pulse">
        <Hash className="w-14 h-14 text-primary" />
      </div>
      <div className="flex items-center gap-4 text-2xl text-foreground font-display font-medium">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        Uruchamianie Slack...
      </div>
    </div>
  );
}

function AuthRouter() {
  const { data: auth, isLoading, error } = useGetAuthStatus({
    query: {
      retry: false
    }
  });

  if (isLoading) {
    return <LoadingScreen />;
  }

  if (error || !auth?.isLoggedIn) {
    return <Login />;
  }

  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AuthRouter />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
