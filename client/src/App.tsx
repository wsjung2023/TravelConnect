import { Switch, Route } from 'wouter';
import { Suspense, lazy } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as Sentry from '@sentry/react';
import ErrorBoundary from '../../src/ErrorBoundary';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Home from '@/pages/home';
import Config from '@/pages/config';
import LegalPage from '@/pages/legal';
import { useAuth } from '@/hooks/useAuth';

// Initialize Sentry for error tracking
if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    environment: import.meta.env.VITE_NODE_ENV || 'development',
    tracesSampleRate: 0.1, // 10% of transactions for performance monitoring
    beforeSend(event) {
      // Filter out development errors in production
      if (import.meta.env.VITE_NODE_ENV === 'development' && 
          event.exception?.values?.[0]?.value?.includes('ChunkLoadError')) {
        return null;
      }
      return event;
    },
  });
}

// Lazy load heavy components
const Map = lazy(() => import('@/pages/map'));
const MapTest = lazy(() => import('@/pages/map-test'));
const Feed = lazy(() => import('@/pages/feed'));
const Chat = lazy(() => import('@/pages/chat'));
const Profile = lazy(() => import('@/pages/profile'));
const TimelinePage = lazy(() => import('@/pages/timeline'));
const TimelineCreatePage = lazy(() => import('@/pages/TimelineCreate'));
const VideoTestPage = lazy(() => import('@/pages/video-test'));
const Admin = lazy(() => import('@/pages/admin'));
const ErrorTest = lazy(() => import('../../src/pages/ErrorTestPage'));

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
              path="/video-test"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <VideoTestPage />
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
            <Route
              path="/error-test"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <ErrorTest />
                </Suspense>
              )}
            />
            <Route path="/config" component={Config} />
          </>
        )}
        {/* Legal pages accessible to everyone */}
        <Route path="/legal/:type?" component={LegalPage} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <div className="mobile-container">
            <Toaster />
            <Router />
          </div>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
