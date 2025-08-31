import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import Landing from "@/pages/landing";
import Home from "@/pages/home";
import Map from "@/pages/map";
import MapTest from "@/pages/map-test";
import Feed from "@/pages/feed";
import TimelinePage from "@/pages/timeline";
import Chat from "@/pages/chat";
import Profile from "@/pages/profile";
import Admin from "@/pages/admin";
import Config from "@/pages/config";
import { useAuth } from "@/hooks/useAuth";

function Router() {
  const { isAuthenticated, isLoading } = useAuth();

  return (
    <div className="mobile-full">
      <Switch>
        {isLoading || !isAuthenticated ? (
          <Route path="/" component={Landing} />
        ) : (
          <>
            <Route path="/" component={Home} />
            <Route path="/map-test" component={MapTest} />
            <Route path="/map" component={Map} />
            <Route path="/feed" component={Feed} />
            <Route path="/timeline" component={TimelinePage} />
            <Route path="/chat" component={Chat} />
            <Route path="/profile" component={Profile} />
            <Route path="/admin" component={Admin} />
            <Route path="/config" component={Config} />
          </>
        )}
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <div className="mobile-container">
          <Toaster />
          <Router />
        </div>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
