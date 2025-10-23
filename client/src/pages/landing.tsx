import { MapPin, Users, MessageCircle, Star, PlayCircle } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginModal } from '@/components/LoginModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import Footer from '@/components/Footer';

export default function Landing() {
  const { toast } = useToast();
  const { t } = useTranslation(['ui']);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleLoginSuccess = (token: string, user: any) => {
    // 토큰 저장 후 페이지 새로고침으로 홈으로 이동
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

      // 홈으로 리다이렉트
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

  // URL 파라미터에서 구글 OAuth 콜백 처리
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
      // URL 파라미터 제거
      window.history.replaceState({}, document.title, '/');
      return;
    }

    if (token && userParam) {
      try {
        const user = JSON.parse(decodeURIComponent(userParam));
        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(user));

        // URL 파라미터 제거하고 새로고침
        window.history.replaceState({}, document.title, '/');
        window.location.reload();
      } catch (error) {
        console.error('구글 OAuth 콜백 처리 오류:', error);
        alert('로그인 데이터 처리 중 오류가 발생했습니다');
      }
    }
  }, []);

  const features = [
    {
      icon: MapPin,
      title: t('ui:landingPage.feature1Title'),
      description: t('ui:landingPage.feature1Desc'),
    },
    {
      icon: Users,
      title: t('ui:landingPage.feature2Title'),
      description: t('ui:landingPage.feature2Desc'),
    },
    {
      icon: MessageCircle,
      title: t('ui:landingPage.feature3Title'),
      description: t('ui:landingPage.feature3Desc'),
    },
    {
      icon: Star,
      title: t('ui:landingPage.feature4Title'),
      description: t('ui:landingPage.feature4Desc'),
    },
  ];

  return (
    <div className="mobile-container bg-white min-h-screen">
      {/* Hero Section */}
      <div className="relative travel-gradient text-white overflow-hidden">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative px-6 py-16 text-center">
          <div className="w-20 h-20 mx-auto mb-6 bg-white/20 rounded-full flex items-center justify-center">
            <div className="text-3xl">🌍</div>
          </div>
          <h1 className="text-3xl font-bold mb-4">{t('ui:landingPage.appName')}</h1>
          <p className="text-lg opacity-90 mb-8 leading-relaxed whitespace-pre-line">
            {t('ui:landingPage.subtitle')}
          </p>
          <div className="flex items-center justify-center gap-2 text-sm opacity-80">
            <div className="w-2 h-2 bg-white rounded-full"></div>
            <span>{t('ui:landingPage.connectTravelers')}</span>
          </div>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-12">
        <h2 className="text-2xl font-bold text-center mb-2">{t('ui:landingPage.startWith')}</h2>
        <p className="text-gray-600 text-center mb-8">
          {t('ui:landingPage.startJourney')}
        </p>

        <div className="space-y-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <div key={index} className="flex items-start gap-4">
                <div className="w-12 h-12 travel-gradient rounded-xl flex items-center justify-center flex-shrink-0">
                  <Icon size={24} className="text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">
                    {feature.title}
                  </h3>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Stats */}
      <div className="px-6 mb-8">
        <div className="travel-card p-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-primary mb-1">{t('ui:landingPage.experiencesCount')}</div>
              <div className="text-xs text-gray-500">{t('ui:landingPage.localExperiences')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-secondary mb-1">{t('ui:landingPage.hostsCount')}</div>
              <div className="text-xs text-gray-500">{t('ui:landingPage.verifiedHosts')}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent mb-1">{t('ui:landingPage.citiesCount')}</div>
              <div className="text-xs text-gray-500">{t('ui:landingPage.cities')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews */}
      <div className="px-6 mb-12">
        <h3 className="font-semibold text-center mb-6">{t('ui:landingPage.reviews')}</h3>
        <div className="space-y-4">
          {[
            {
              name: t('ui:landingPage.review1Name'),
              rating: 5,
              comment: t('ui:landingPage.review1Text'),
            },
            {
              name: t('ui:landingPage.review2Name'),
              rating: 5,
              comment: t('ui:landingPage.review2Text'),
            },
            {
              name: t('ui:landingPage.review3Name'),
              rating: 5,
              comment: t('ui:landingPage.review3Text'),
            },
          ].map((review, index) => (
            <div key={index} className="travel-card p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                  <span className="text-sm font-medium">
                    {review.name.charAt(0)}
                  </span>
                </div>
                <div>
                  <div className="font-medium text-sm">{review.name}</div>
                  <div className="flex items-center gap-1">
                    {Array(review.rating)
                      .fill(0)
                      .map((_, i) => (
                        <Star
                          key={i}
                          size={12}
                          className="text-yellow-400 fill-current"
                        />
                      ))}
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 leading-relaxed">
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Login Options */}
      <div className="px-6 pb-8">
        <div className="text-center">
          <h3 className="text-xl font-bold mb-2">{t('ui:landingPage.getStarted')}</h3>
          <p className="text-gray-600 text-sm mb-6">
            {t('ui:landingPage.getStartedDesc')}
          </p>

          {/* 데모 체험하기 버튼 - 개발환경에서만 표시 */}
          {import.meta.env.DEV && (
            <Button
              onClick={handleDemoLogin}
              disabled={isDemoLoading}
              className="w-full h-12 text-lg mb-3 bg-orange-500 hover:bg-orange-600 text-white"
              data-testid="button-demo-login"
            >
              <PlayCircle className="w-5 h-5 mr-2" />
              {isDemoLoading ? t('ui:landingPage.tryingDemo') : t('ui:landingPage.tryDemo')}
            </Button>
          )}

          {/* Login Button */}
          <Button
            onClick={() => setShowLoginModal(true)}
            className="travel-button w-full h-12 text-lg"
            data-testid="button-login"
          >
            {t('ui:landingPage.login')}
          </Button>

          <p className="text-xs text-gray-500 mt-4 leading-relaxed">
            {t('ui:landingPage.loginDesc')}
          </p>
        </div>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSuccess={handleLoginSuccess}
      />
      
      {/* Footer */}
      <Footer />
    </div>
  );
}
