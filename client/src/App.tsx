import { Switch, Route } from 'wouter';
import { Suspense, lazy, useState } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import * as Sentry from '@sentry/react';
import ErrorBoundary from '@/ErrorBoundary';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import Home from '@/pages/home';
import Config from '@/pages/config';
import LegalPage from '@/pages/legal';
import { useAuth } from '@/hooks/useAuth';
import { OnboardingModal } from '@/components/OnboardingModal';

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
const MapTest = lazy(() => import('@/pages/map-test'));
const Feed = lazy(() => import('@/pages/feed'));
const Chat = lazy(() => import('@/pages/chat'));
const Profile = lazy(() => import('@/pages/profile'));
const TimelinePage = lazy(() => import('@/pages/timeline'));
const TimelineCreatePage = lazy(() => import('@/pages/TimelineCreate'));
const VideoTestPage = lazy(() => import('@/pages/video-test'));
const Admin = lazy(() => import('@/pages/admin'));
const Host = lazy(() => import('@/pages/host'));
const ErrorTest = lazy(() => import('@/pages/ErrorTestPage'));
const Marketplace = lazy(() => import('@/pages/marketplace'));
const ExperienceDetail = lazy(() => import('@/pages/experience'));
const GuideProfile = lazy(() => import('@/pages/guide-profile'));
const PublicPortfolio = lazy(() => import('@/pages/PublicPortfolio'));
const PurchaseProxy = lazy(() => import('@/pages/purchase-proxy'));
const SlotsPage = lazy(() => import('@/pages/slots'));

// Simple loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

function Router() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // 온보딩 체크 - 로컬 상태도 고려
  const needsOnboarding = isAuthenticated && user && !user.onboardingCompleted && !onboardingCompleted;

  // OAuth 콜백 파라미터 확인
  const hasOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('token') || urlParams.has('error');
  };

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingCompleted(true); // 즉시 로컬 상태 업데이트
    // useAuth를 다시 호출하여 사용자 정보를 새로고침
    queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
  };

  return (
    <div className="mobile-full">
      {/* 온보딩 모달 */}
      <OnboardingModal
        isOpen={needsOnboarding || showOnboarding}
        onClose={() => setShowOnboarding(false)}
        onComplete={handleOnboardingComplete}
      />

      <Switch>
        {/* 공개 포트폴리오 - 모든 사용자 접근 가능 */}
        <Route 
          path="/portfolio/:publicProfileUrl" 
          component={({ params }: { params: { publicProfileUrl: string } }) => (
            <Suspense fallback={<LoadingSpinner />}>
              <PublicPortfolio publicProfileUrl={params.publicProfileUrl} />
            </Suspense>
          )}
        />
        
        {isLoading || !isAuthenticated || hasOAuthCallback() ? (
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
              path="/host"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Host />
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
            <Route
              path="/marketplace"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <Marketplace />
                </Suspense>
              )}
            />
            <Route
              path="/guide/:id"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <GuideProfile />
                </Suspense>
              )}
            />
            <Route
              path="/experience/:id"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <ExperienceDetail />
                </Suspense>
              )}
            />
            <Route
              path="/purchase-proxy"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <PurchaseProxy />
                </Suspense>
              )}
            />
            <Route
              path="/slots"
              component={() => (
                <Suspense fallback={<LoadingSpinner />}>
                  <SlotsPage />
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
