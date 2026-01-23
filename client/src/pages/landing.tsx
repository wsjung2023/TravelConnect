import { MapPin, Users, MessageCircle, Star, PlayCircle, Compass, Heart, Globe, Map, Shield, Clock, ChevronRight, Calendar } from 'lucide-react';
import { Link } from 'wouter';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Helmet } from 'react-helmet-async';
import { LoginModal } from '@/components/LoginModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';
import Footer from '@/components/Footer';
import heroImage from '@assets/stock_images/traveler_sunset_moun_6f45f15a.jpg';
import meetingImage from '@assets/stock_images/people_meeting_trave_1a5f85aa.jpg';
import exploringImage from '@assets/stock_images/backpacker_exploring_e1b0b730.jpg';

export default function Landing() {
  const { toast } = useToast();
  const { t } = useTranslation(['ui']);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleLoginSuccess = (token: string, user: any) => {
    window.location.reload();
  };

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    try {
      const response = await fetch('/api/auth/demo-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message);
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      toast({
        title: t('ui:landingPage.demoLoginSuccess'),
        description: t('ui:landingPage.demoLoginSuccessDesc'),
      });

      window.location.href = '/';
    } catch (error: any) {
      toast({
        title: t('ui:landingPage.demoLoginFailed'),
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');
    const userParam = urlParams.get('user');
    const error = urlParams.get('error');

    if (error) {
      console.error('구글 OAuth 오류:', error);
      let errorMessage = '로그인 중 오류가 발생했습니다';

      switch (error) {
        case 'google_auth_failed':
          errorMessage = '구글 로그인에 실패했습니다';
          break;
        case 'auth_data_missing':
          errorMessage = '인증 데이터가 누락되었습니다';
          break;
        case 'callback_processing_failed':
          errorMessage = '로그인 처리 중 오류가 발생했습니다';
          break;
      }

      alert(errorMessage);
      window.history.replaceState({}, document.title, '/');
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      } catch (error) {
        console.error('구글 OAuth 콜백 처리 오류:', error);
        alert('로그인 데이터 처리 중 오류가 발생했습니다');
      }
    }
  }, []);

  const pillTags = [
    { icon: Map, label: 'Map-based travel timelines' },
    { icon: Shield, label: 'Safety-first matching' },
    { icon: Clock, label: 'Instant trip journaling' },
    { icon: Users, label: 'Local concierge support' },
  ];

  return (
    <div className="w-full bg-[var(--landing-bg-light)] min-h-screen">
      <Helmet>
        {/* SEO 최적화 - 한글/영어 브랜드명 병기 */}
        <title>투어게더(Tourgether) - 지도 기반 여행 SNS | 로컬과 함께하는 여행</title>
        <meta name="description" content="투어게더(Tourgether)는 여행자와 로컬을 연결하는 지도 기반 여행 SNS입니다. 여행 일정 공유, 여행 타임라인 기록, 현지 추천과 매칭까지 한 번에 경험하세요. Travel SNS connecting travelers with locals." />
        <meta name="keywords" content="투어게더, Tourgether, 여행 SNS, 지도 기반 여행, 여행 타임라인, 로컬 가이드, 여행 일정 공유, 현지 추천, 여행 경험 공유, travel SNS, local guide, travel app" />
        <link rel="canonical" href="https://tourgether.io/" />
        
        {/* Open Graph / Facebook - 한글/영어 병기 */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://tourgether.io/" />
        <meta property="og:title" content="투어게더(Tourgether) - 지도 기반 여행 SNS | Map-based Travel Social Network" />
        <meta property="og:description" content="투어게더는 여행자와 로컬을 연결하는 여행 SNS입니다. 여행 일정 공유, 타임라인 기록, 현지 추천까지. Tourgether connects travelers with locals." />
        <meta property="og:image" content="https://tourgether.io/og-image.jpg" />
        <meta property="og:site_name" content="투어게더 Tourgether" />
        <meta property="og:locale" content="ko_KR" />
        <meta property="og:locale:alternate" content="en_US" />
        
        {/* Twitter - 한글/영어 병기 */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:url" content="https://tourgether.io/" />
        <meta name="twitter:title" content="투어게더(Tourgether) - 지도 기반 여행 SNS" />
        <meta name="twitter:description" content="투어게더는 여행자와 로컬을 연결하는 여행 SNS. Travel SNS connecting travelers with locals." />
        <meta name="twitter:image" content="https://tourgether.io/og-image.jpg" />
        
        {/* Additional SEO */}
        <meta name="robots" content="index, follow" />
        <meta name="author" content="Tourgether" />
        
        {/* JSON-LD Schema - Organization + WebSite */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "Organization",
                "name": "Tourgether",
                "url": "https://tourgether.io",
                "logo": "https://tourgether.io/travel-icon.svg",
                "description": "여행자와 로컬을 연결하는 지도 기반 여행 SNS"
              },
              {
                "@type": "WebSite",
                "name": "Tourgether",
                "url": "https://tourgether.io",
                "potentialAction": {
                  "@type": "SearchAction",
                  "target": {
                    "@type": "EntryPoint",
                    "urlTemplate": "https://tourgether.io/search?q={search_term_string}"
                  },
                  "query-input": "required name=search_term_string"
                }
              }
            ]
          })}
        </script>
      </Helmet>
      
      {/* ========================================
          HERO SECTION
          ======================================== */}
      <header className="relative min-h-[85vh] overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/20 to-[var(--landing-bg-dark)]/95"></div>
        </div>
        
        <div className="relative h-full flex flex-col min-h-[85vh]">
          <div className="flex-1 flex flex-col justify-center px-6 pt-16 pb-8 text-white">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 w-fit mb-8 animate-fade-in">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">{t('ui:landingPage.connectTravelers')}</span>
            </div>
            
            <div className="space-y-5 animate-slide-up">
              <h1 className="text-5xl md:text-6xl font-bold leading-tight tracking-tight">
                {t('ui:landingPage.appName')}
              </h1>
              
              <p className="text-xl md:text-2xl opacity-90 leading-relaxed max-w-lg">
                Your journeys, written on the map.<br/>
                Connect with trusted locals and turn every trip into a living timeline.
              </p>
              
              <div className="flex flex-wrap items-center gap-4 pt-2">
                <div className="flex items-center gap-2 text-sm">
                  <Heart className="w-4 h-4 text-pink-400" />
                  <span>Authentic Experiences</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="w-4 h-4 text-blue-400" />
                  <span>Global Community</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <Shield className="w-4 h-4 text-green-400" />
                  <span>Safety-first Travel</span>
                </div>
              </div>
            </div>
          </div>

          <div className="px-4 pb-6">
            <div className="landing-glass-card p-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-1">Start your first trip</h2>
                <p className="text-sm text-gray-300">
                  Create a living travel timeline and meet trusted locals along the way.
                </p>
              </div>
              <div className="flex gap-3">
                {import.meta.env.DEV && (
                  <button
                    onClick={handleDemoLogin}
                    disabled={isDemoLoading}
                    className="landing-btn-primary flex-1 flex items-center justify-center gap-2"
                    data-testid="button-demo-login"
                  >
                    <PlayCircle className="w-5 h-5" />
                    {isDemoLoading ? t('ui:landingPage.tryingDemo') : 'Try Demo'}
                  </button>
                )}
                <button
                  onClick={() => setShowLoginModal(true)}
                  className={`landing-btn-secondary flex-1 ${import.meta.env.DEV ? '' : 'landing-btn-primary'}`}
                  data-testid="button-login"
                >
                  Sign in
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ========================================
          FEATURES SECTION
          ======================================== */}
      <section className="landing-section px-4 py-16 md:py-20" style={{ background: 'var(--landing-bg-light)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--landing-text-main)' }}>
              Discover your next journey
            </h2>
            <p className="text-lg" style={{ color: 'var(--landing-text-muted)' }}>
              Find hidden spots, meet trusted locals, and capture every moment on your travel timeline.
            </p>
          </div>

          <div className="space-y-6">
            <article className="landing-cinematic-card group">
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img 
                  src={exploringImage} 
                  alt="Discover authentic experiences" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">{t('ui:landingPage.feature1Title')}</h3>
                </div>
                <p className="text-base opacity-90 leading-relaxed max-w-md">
                  Explore handpicked activities and local-only spots that guidebooks miss.
                </p>
              </div>
            </article>

            <article className="landing-cinematic-card group">
              <div className="aspect-[16/10] w-full overflow-hidden">
                <img 
                  src={meetingImage} 
                  alt="Meet trusted locals" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/10">
                    <Users size={24} className="text-white" />
                  </div>
                  <h3 className="text-2xl font-bold">{t('ui:landingPage.feature2Title')}</h3>
                </div>
                <p className="text-base opacity-90 leading-relaxed max-w-md">
                  Connect with verified hosts and travelers who share your style of journey.
                </p>
              </div>
            </article>
          </div>

          <div className="landing-scroll-x mt-8 px-2 -mx-4 md:mx-0 md:flex md:flex-wrap md:gap-3 md:justify-center">
            {pillTags.map((tag, index) => (
              <div key={index} className="landing-pill flex-shrink-0">
                <tag.icon className="w-4 h-4 mr-2" />
                {tag.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          EXPERIENCES / TIMELINE SECTION
          ======================================== */}
      <section className="landing-section landing-section--dark px-4 py-16 md:py-20">
        <div className="max-w-4xl mx-auto">
          <div className="md:grid md:grid-cols-2 md:gap-12 md:items-center">
            <div className="mb-10 md:mb-0">
              <h2 className="text-3xl md:text-4xl font-bold mb-5">
                Your trip becomes a<br/>living timeline
              </h2>
              <p className="text-lg text-gray-300 mb-6 leading-relaxed">
                Every check-in, photo, and local meet-up is stitched into a beautiful travel story.
                Relive your journeys day by day, pin by pin.
              </p>
              <ul className="space-y-3">
                {[
                  'Map-based view of your entire journey',
                  'Safety check-ins and trusted contacts along the route',
                  'Shareable highlights for friends and followers'
                ].map((item, idx) => (
                  <li key={idx} className="flex items-start gap-3">
                    <div className="w-5 h-5 rounded-full bg-[var(--landing-primary)] flex items-center justify-center flex-shrink-0 mt-0.5">
                      <ChevronRight className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-gray-200">{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="landing-timeline-mock p-5 landing-float">
              <div className="flex items-center gap-3 mb-4 pb-4 border-b border-white/10">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center">
                  <Map className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="font-bold text-white">Tokyo · Spring Escape</div>
                  <div className="text-xs text-gray-400">March 15-22, 2025</div>
                </div>
              </div>
              
              <div className="space-y-4">
                {[
                  { day: 'Day 1', title: 'Arrived at Shibuya', icon: MapPin },
                  { day: 'Day 2', title: 'Met local guide Yuki', icon: Users },
                  { day: 'Day 3', title: 'Hidden ramen spot!', icon: Heart },
                ].map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-[var(--landing-primary-soft)]" />
                    </div>
                    <div className="flex-1">
                      <div className="text-xs text-gray-500">{item.day}</div>
                      <div className="text-sm text-white">{item.title}</div>
                    </div>
                    <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-gray-700 to-gray-800"></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          METRICS SECTION
          ======================================== */}
      <section className="landing-section px-4 py-12 md:py-16" style={{ background: 'var(--landing-bg-light)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="landing-metrics-card p-8 md:p-10 text-white">
            <div className="relative grid grid-cols-3 gap-4 md:gap-8 text-center">
              <div className="space-y-1">
                <div className="text-3xl md:text-4xl font-bold">{t('ui:landingPage.experiencesCount')}</div>
                <div className="text-sm md:text-base opacity-80">{t('ui:landingPage.localExperiences')}</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl md:text-4xl font-bold">{t('ui:landingPage.hostsCount')}</div>
                <div className="text-sm md:text-base opacity-80">{t('ui:landingPage.verifiedHosts')}</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl md:text-4xl font-bold">{t('ui:landingPage.citiesCount')}</div>
                <div className="text-sm md:text-base opacity-80">{t('ui:landingPage.cities')}</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ========================================
          SEO CONTENT SECTION - 검색엔진 최적화용 텍스트 (i18n 기반)
          ======================================== */}
      <section className="landing-section px-4 py-16 md:py-20" style={{ background: 'linear-gradient(180deg, #F8FAFC 0%, #FFFFFF 100%)' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4" style={{ color: 'var(--landing-text-main)' }}>
              {t('ui:landingPage.seoSection.title')}
            </h2>
            <p className="text-lg" style={{ color: 'var(--landing-text-muted)' }}>
              {t('ui:landingPage.seoSection.subtitle')}
            </p>
          </div>

          <div className="space-y-8">
            {[1, 2, 3, 4, 5].map((num) => (
              <article key={num} className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-bold mb-4 flex items-center gap-3" style={{ color: 'var(--landing-text-main)' }}>
                  <span className="w-10 h-10 rounded-full bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center text-white">{num}</span>
                  {t(`ui:landingPage.seoSection.article${num}.title`)}
                </h3>
                <p className="leading-relaxed" style={{ color: 'var(--landing-text-muted)' }}>
                  {t(`ui:landingPage.seoSection.article${num}.desc`)}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          TESTIMONIALS SECTION
          ======================================== */}
      <section className="landing-section px-4 py-12 md:py-16" style={{ background: '#FFFFFF' }}>
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-10">
            <h2 className="text-3xl md:text-4xl font-bold mb-3" style={{ color: 'var(--landing-text-main)' }}>
              {t('ui:landingPage.reviews')}
            </h2>
            <p style={{ color: 'var(--landing-text-muted)' }}>
              Real stories from people who used Tourgether for their journeys.
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            {[
              {
                name: t('ui:landingPage.review1Name'),
                role: 'Solo traveler · Tokyo',
                comment: t('ui:landingPage.review1Text'),
                avatar: 'S',
              },
              {
                name: t('ui:landingPage.review2Name'),
                role: 'Host · Barcelona',
                comment: t('ui:landingPage.review2Text'),
                avatar: 'M',
              },
              {
                name: t('ui:landingPage.review3Name'),
                role: 'Couple travelers · Seoul',
                comment: t('ui:landingPage.review3Text'),
                avatar: 'J',
              },
            ].map((review, index) => (
              <div 
                key={index} 
                className="landing-glass-card--light bg-white rounded-2xl p-6 border border-gray-100"
                style={{ 
                  boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08), 0 2px 8px rgba(0, 0, 0, 0.04)',
                }}
              >
                <div className="flex items-center gap-3 mb-4">
                  <div 
                    className="w-11 h-11 rounded-full flex items-center justify-center text-white font-bold text-lg"
                    style={{ background: 'linear-gradient(135deg, var(--landing-primary), var(--landing-primary-soft))' }}
                  >
                    {review.avatar}
                  </div>
                  <div>
                    <div className="font-semibold" style={{ color: 'var(--landing-text-main)' }}>{review.name}</div>
                    <div className="text-sm" style={{ color: 'var(--landing-text-muted)' }}>{review.role}</div>
                  </div>
                </div>
                <p className="leading-relaxed italic" style={{ color: 'var(--landing-text-main)' }}>
                  "{review.comment}"
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ========================================
          FINAL CTA SECTION
          ======================================== */}
      <section className="landing-section landing-section--dark px-4 py-16 md:py-20">
        <div className="max-w-xl mx-auto">
          <div 
            className="text-center p-8 md:p-10 rounded-3xl"
            style={{ 
              background: 'linear-gradient(145deg, #111827 0%, #1F2937 100%)',
              boxShadow: '0 25px 50px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)',
              border: '1px solid rgba(255, 255, 255, 0.05)',
            }}
          >
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-[var(--landing-primary)] to-[var(--landing-accent)] flex items-center justify-center">
              <Compass className="w-8 h-8 text-white" />
            </div>
            
            <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">
              Ready to explore?
            </h2>
            <p className="text-gray-400 mb-8 leading-relaxed">
              Join thousands of travelers discovering authentic experiences with trusted locals.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {import.meta.env.DEV && (
                <button
                  onClick={handleDemoLogin}
                  disabled={isDemoLoading}
                  className="landing-btn-primary px-8"
                  data-testid="button-final-demo"
                >
                  <PlayCircle className="w-5 h-5 mr-2 inline" />
                  {isDemoLoading ? t('ui:landingPage.tryingDemo') : 'Start your journey'}
                </button>
              )}
              <button
                onClick={() => setShowLoginModal(true)}
                className={import.meta.env.DEV ? "landing-btn-secondary" : "landing-btn-primary px-8"}
                data-testid="button-final-login"
              >
                {import.meta.env.DEV ? 'I already have an account' : 'Start your journey'}
              </button>
            </div>
          </div>
        </div>
      </section>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
      
      {/* 플로팅 언어 선택 버튼 */}
      <LanguageSwitcher floating />
      
      {/* SEO 페이지 6개 카드 버튼 - Footer 위 */}
      <section className="py-12 px-4 bg-gray-100">
        <div className="max-w-4xl mx-auto">
          <h3 className="text-xl font-bold text-gray-800 mb-6 text-center">{t('ui:seoLinks.exploreFeatures')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
            {[
              { path: '/travel-itinerary', icon: Calendar, titleKey: 'seoLinks.travelItinerary', color: 'from-blue-500 to-blue-600' },
              { path: '/map-travel', icon: MapPin, titleKey: 'seoLinks.mapTravel', color: 'from-green-500 to-green-600' },
              { path: '/travel-timeline', icon: Compass, titleKey: 'seoLinks.travelTimeline', color: 'from-purple-500 to-purple-600' },
              { path: '/local-tips', icon: Star, titleKey: 'seoLinks.localTips', color: 'from-yellow-500 to-yellow-600' },
              { path: '/travel-mate', icon: Users, titleKey: 'seoLinks.travelMate', color: 'from-pink-500 to-pink-600' },
              { path: '/safety', icon: Shield, titleKey: 'seoLinks.safety', color: 'from-red-500 to-red-600' },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <Link key={card.path} href={card.path}>
                  <div className="bg-white hover:bg-gray-50 rounded-xl p-4 text-center shadow-sm hover:shadow-lg transition-all hover:scale-105 cursor-pointer group border">
                    <div className={`w-12 h-12 mx-auto mb-3 rounded-xl bg-gradient-to-br ${card.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700">{t(`ui:${card.titleKey}`)}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
