// 앱 루트 컴포넌트 — Wouter 라우터로 모든 페이지를 연결하고, QueryClientProvider·AuthProvider 등 전역 프로바이더를 감싼다.
import { Switch, Route } from 'wouter';
import { Suspense, lazy, useState } from 'react';
import { queryClient } from './lib/queryClient';
import { QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import { HelmetProvider } from 'react-helmet-async';
import * as Sentry from '@sentry/react';
import ErrorBoundary from '@/ErrorBoundary';
import NotFound from '@/pages/not-found';
import Landing from '@/pages/landing';
import AppShell from '@/components/app/AppShell';
import Config from '@/pages/config';
import LegalPage from '@/pages/legal';
import { useAuth, AUTH_QUERY_KEY } from '@/hooks/useAuth';
import InAppBrowserRedirect from '@/components/InAppBrowserRedirect';
import { OnboardingModal } from '@/components/OnboardingModal';

// SEO 랜딩페이지 (공개 - 로그인 불필요)
const TravelItinerary = lazy(() => import('@/pages/seo/TravelItinerary'));
const MapTravel = lazy(() => import('@/pages/seo/MapTravel'));
const TravelTimeline = lazy(() => import('@/pages/seo/TravelTimeline'));
const LocalTips = lazy(() => import('@/pages/seo/LocalTips'));
const TravelMate = lazy(() => import('@/pages/seo/TravelMate'));
const Safety = lazy(() => import('@/pages/seo/Safety'));
const BecomeGuide = lazy(() => import('@/pages/seo/BecomeGuide'));
const EarnTravel = lazy(() => import('@/pages/seo/EarnTravel'));
const TravelCreator = lazy(() => import('@/pages/seo/TravelCreator'));
const TravelFriends = lazy(() => import('@/pages/seo/TravelFriends'));

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
const SubscriptionPage = lazy(() => import('@/pages/subscription'));
const ServiceRequest = lazy(() => import('@/pages/service-request'));

// Simple loading component
const LoadingSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
  </div>
);

// Auth Gate component
const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const { isAuthenticated, isLoading } = useAuth();
  
  // OAuth 콜백 파라미터 확인
  const hasOAuthCallback = () => {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.has('token') || urlParams.has('error');
  };

  if (isLoading || hasOAuthCallback()) {
    return <LoadingSpinner />;
  }

  if (!isAuthenticated) {
    return <Landing />;
  }

  return <>{children}</>;
};

function Router() {
  const { user, isAuthenticated } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);

  // 온보딩 체크 - 로컬 상태도 고려
  const needsOnboarding = isAuthenticated && user && !user.onboardingCompleted && !onboardingCompleted;

  const handleOnboardingComplete = () => {
    setShowOnboarding(false);
    setOnboardingCompleted(true); // 즉시 로컬 상태 업데이트
    // useAuth를 다시 호출하여 사용자 정보를 새로고침
    queryClient.invalidateQueries({ queryKey: AUTH_QUERY_KEY });
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
        
        {/* Legal pages accessible to everyone */}
        <Route path="/legal/:type?" component={LegalPage} />
        
        {/* SEO 랜딩페이지 - 공개 (로그인 불필요) */}
        <Route path="/travel-itinerary" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <TravelItinerary />
          </Suspense>
        )} />
        <Route path="/map-travel" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <MapTravel />
          </Suspense>
        )} />
        <Route path="/travel-timeline" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <TravelTimeline />
          </Suspense>
        )} />
        <Route path="/local-tips" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <LocalTips />
          </Suspense>
        )} />
        <Route path="/travel-mate" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <TravelMate />
          </Suspense>
        )} />
        <Route path="/safety" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <Safety />
          </Suspense>
        )} />
        <Route path="/become-guide" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <BecomeGuide />
          </Suspense>
        )} />
        <Route path="/earn-travel" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <EarnTravel />
          </Suspense>
        )} />
        <Route path="/travel-creator" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <TravelCreator />
          </Suspense>
        )} />
        <Route path="/travel-friends" component={() => (
          <Suspense fallback={<LoadingSpinner />}>
            <TravelFriends />
          </Suspense>
        )} />
        
        {/* Protected routes */}
        <Route path="/" component={() => (
          <AuthGate>
            <AppShell />
          </AuthGate>
        )} />
        <Route
          path="/map-test"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <MapTest />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/feed"
          component={() => (
            <AuthGate>
              <AppShell />
            </AuthGate>
          )}
        />
        <Route
          path="/meet"
          component={() => (
            <AuthGate>
              <AppShell />
            </AuthGate>
          )}
        />
        {/* /timeline → me 탭으로 리다이렉트 (legacy route) */}
        <Route
          path="/timeline"
          component={() => (
            <AuthGate>
              <AppShell />
            </AuthGate>
          )}
        />
        <Route
          path="/timeline/create"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <TimelineCreatePage />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/video-test"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <VideoTestPage />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/chat"
          component={() => (
            <AuthGate>
              <AppShell />
            </AuthGate>
          )}
        />
        {/* Redirect /conversations to /chat */}
        <Route
          path="/conversations"
          component={() => (
            <AuthGate>
              {(() => {
                window.location.href = '/chat';
                return <LoadingSpinner />;
              })()}
            </AuthGate>
          )}
        />
        <Route
          path="/profile"
          component={() => (
            <AuthGate>
              <AppShell />
            </AuthGate>
          )}
        />
        <Route
          path="/admin"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <Admin />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/host"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <Host />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/error-test"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <ErrorTest />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/marketplace"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <Marketplace />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/guide/:id"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <GuideProfile />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/experience/:id"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <ExperienceDetail />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/purchase-proxy"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <PurchaseProxy />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/slots"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <SlotsPage />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/subscription"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <SubscriptionPage />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route
          path="/request"
          component={() => (
            <AuthGate>
              <Suspense fallback={<LoadingSpinner />}>
                <ServiceRequest />
              </Suspense>
            </AuthGate>
          )}
        />
        <Route path="/config" component={() => (
          <AuthGate>
            <Config />
          </AuthGate>
        )} />
        <Route component={NotFound} />
      </Switch>
    </div>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <TooltipProvider>
            <div className="mobile-container">
              <InAppBrowserRedirect />
              <Toaster />
              <Router />
            </div>
          </TooltipProvider>
        </QueryClientProvider>
      </HelmetProvider>
    </ErrorBoundary>
  );
}

export default App;
