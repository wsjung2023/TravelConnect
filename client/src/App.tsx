import { Switch, Route } from 'wouter';
import { Suspense, lazy } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Home from '@/pages/home';
import Feed from '@/pages/feed';
import Chat from '@/pages/chat';
import Profile from '@/pages/profile';
import Config from '@/pages/config';
import { useAuth } from '@/hooks/useAuth';

// Lazy load heavy components
const Map = lazy(() => import('@/pages/map'));
const MapTest = lazy(() => import('@/pages/map-test'));
const TimelinePage = lazy(() => import('@/pages/timeline'));
const Admin = lazy(() => import('@/pages/admin'));

// Simple loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

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
            <Route
              path="/map-test"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <MapTest />
                </Suspense>
              )}
            />
            <Route
              path="/map"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Map />
                </Suspense>
              )}
            />
            <Route path="/feed" component={Feed} />
            <Route
              path="/timeline"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <TimelinePage />
                </Suspense>
              )}
            />
            <Route path="/chat" component={Chat} />
            <Route path="/profile" component={Profile} />
            <Route
              path="/admin"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Admin />
                </Suspense>
              )}
            />
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
