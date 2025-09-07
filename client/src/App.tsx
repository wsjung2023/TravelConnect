import { Switch, Route } from 'wouter';
import { Suspense, lazy } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Home from '@/pages/home';
import Config from '@/pages/config';
import { useAuth } from '@/hooks/useAuth';

// Lazy load heavy components
const Map = lazy(() => import('@/pages/map'));
const MapTest = lazy(() => import('@/pages/map-test'));
const Feed = lazy(() => import('@/pages/feed'));
const Chat = lazy(() => import('@/pages/chat'));
const Profile = lazy(() => import('@/pages/profile'));
const TimelinePage = lazy(() => import('@/pages/timeline'));
const TimelineCreatePage = lazy(() => import('@/pages/TimelineCreate'));
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
            <Route
              path="/feed"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Feed />
                </Suspense>
              )}
            />
            <Route
              path="/timeline"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <TimelinePage />
                </Suspense>
              )}
            />
            <Route
              path="/timeline/create"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <TimelineCreatePage />
                </Suspense>
              )}
            />
            <Route
              path="/chat"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Chat />
                </Suspense>
              )}
            />
            <Route
              path="/profile"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Profile />
                </Suspense>
              )}
            />
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
