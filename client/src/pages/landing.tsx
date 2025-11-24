import { MapPin, Users, MessageCircle, Star, PlayCircle, Compass, Heart, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LoginModal } from '@/components/LoginModal';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
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
      {/* Hero Section - Cinematic with Real Photo */}
      <div className="relative h-[70vh] min-h-[500px] overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
        </div>
        
        {/* Content */}
        <div className="relative h-full flex flex-col justify-end px-6 pb-12 text-white">
          {/* Floating Badge */}
          <div className="absolute top-8 left-6 flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-full border border-white/20 animate-fade-in">
            <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium">{t('ui:landingPage.connectTravelers')}</span>
          </div>
          
          {/* Main Content */}
          <div className="space-y-4 animate-slide-up">
            <div className="flex items-center gap-2 mb-2">
              <Compass className="w-6 h-6 text-yellow-400" />
              <span className="text-sm font-medium tracking-wide uppercase text-yellow-400">
                Your Journey Awaits
              </span>
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold leading-tight">
              {t('ui:landingPage.appName')}
            </h1>
            
            <p className="text-xl opacity-90 leading-relaxed max-w-md whitespace-pre-line">
              {t('ui:landingPage.subtitle')}
            </p>
            
            <div className="flex items-center gap-4 pt-4">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-pink-400" />
                <span className="text-sm">Authentic Experiences</span>
              </div>
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-blue-400" />
                <span className="text-sm">Global Community</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Features - Storytelling Style */}
      <div className="px-6 py-16 bg-gradient-to-b from-white to-gray-50">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-3">{t('ui:landingPage.startWith')}</h2>
          <p className="text-gray-600 text-lg max-w-md mx-auto">
            {t('ui:landingPage.startJourney')}
          </p>
        </div>

        <div className="space-y-8">
          {/* Feature 1 - Discover */}
          {features[0] && (
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg group">
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={exploringImage} 
                  alt="Discover" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <MapPin size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{features[0].title}</h3>
                </div>
                <p className="text-sm opacity-90 leading-relaxed">
                  {features[0].description}
                </p>
              </div>
            </div>
          )}

          {/* Feature 2 - Connect */}
          {features[1] && (
            <div className="relative overflow-hidden rounded-3xl bg-white shadow-lg group">
              <div className="aspect-video w-full overflow-hidden">
                <img 
                  src={meetingImage} 
                  alt="Connect" 
                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center">
                    <Users size={24} className="text-white" />
                  </div>
                  <h3 className="text-xl font-bold">{features[1].title}</h3>
                </div>
                <p className="text-sm opacity-90 leading-relaxed">
                  {features[1].description}
                </p>
              </div>
            </div>
          )}

          {/* Features 3 & 4 - Grid */}
          <div className="grid grid-cols-2 gap-4">
            {features[2] && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-500 to-pink-500 p-6 text-white aspect-square flex flex-col justify-end">
                <div className="absolute top-4 right-4">
                  <MessageCircle size={32} className="opacity-40" />
                </div>
                <h3 className="font-bold mb-2 text-lg">{features[2].title}</h3>
                <p className="text-sm opacity-90 leading-snug">
                  {features[2].description}
                </p>
              </div>
            )}
            
            {features[3] && (
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-orange-400 to-yellow-500 p-6 text-white aspect-square flex flex-col justify-end">
                <div className="absolute top-4 right-4">
                  <Star size={32} className="opacity-40" />
                </div>
                <h3 className="font-bold mb-2 text-lg">{features[3].title}</h3>
                <p className="text-sm opacity-90 leading-snug">
                  {features[3].description}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats - Enhanced */}
      <div className="px-6 py-12 bg-gray-50">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 p-8 text-white">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
          
          <div className="relative grid grid-cols-3 gap-6 text-center">
            <div className="space-y-2">
              <div className="text-3xl font-bold">{t('ui:landingPage.experiencesCount')}</div>
              <div className="text-sm opacity-90">{t('ui:landingPage.localExperiences')}</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{t('ui:landingPage.hostsCount')}</div>
              <div className="text-sm opacity-90">{t('ui:landingPage.verifiedHosts')}</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold">{t('ui:landingPage.citiesCount')}</div>
              <div className="text-sm opacity-90">{t('ui:landingPage.cities')}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews - Enhanced */}
      <div className="px-6 py-12 bg-white">
        <div className="text-center mb-8">
          <h3 className="text-2xl font-bold mb-2">{t('ui:landingPage.reviews')}</h3>
          <p className="text-gray-600">Real stories from our travelers</p>
        </div>
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
            <div key={index} className="bg-gradient-to-br from-gray-50 to-white rounded-2xl p-5 border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-br from-pink-400 to-purple-500 rounded-full flex items-center justify-center text-white font-bold">
                  {review.name.charAt(0)}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-gray-900">{review.name}</div>
                  <div className="flex items-center gap-1 mt-1">
                    {Array(review.rating)
                      .fill(0)
                      .map((_, i) => (
                        <Star
                          key={i}
                          size={14}
                          className="text-yellow-400 fill-current"
                        />
                      ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-700 leading-relaxed italic">
                "{review.comment}"
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Login Options - Enhanced */}
      <div className="px-6 py-12 bg-gradient-to-b from-white to-gray-50">
        <div className="relative overflow-hidden rounded-3xl bg-white shadow-xl border border-gray-100 p-8">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-pink-200 to-purple-200 rounded-full blur-3xl opacity-30"></div>
          <div className="absolute bottom-0 left-0 w-40 h-40 bg-gradient-to-br from-blue-200 to-cyan-200 rounded-full blur-3xl opacity-30"></div>
          
          <div className="relative text-center">
            <div className="mb-6">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-pink-500 to-purple-600 rounded-2xl mb-4">
                <Compass className="w-8 h-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold mb-2">{t('ui:landingPage.getStarted')}</h3>
              <p className="text-gray-600 leading-relaxed">
                {t('ui:landingPage.getStartedDesc')}
              </p>
            </div>

            {/* 데모 체험하기 버튼 - 개발환경에서만 표시 */}
            {import.meta.env.DEV && (
              <Button
                onClick={handleDemoLogin}
                disabled={isDemoLoading}
                className="w-full h-14 text-lg mb-3 bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
                data-testid="button-demo-login"
              >
                <PlayCircle className="w-5 h-5 mr-2" />
                {isDemoLoading ? t('ui:landingPage.tryingDemo') : t('ui:landingPage.tryDemo')}
              </Button>
            )}

            {/* Login Button */}
            <Button
              onClick={() => setShowLoginModal(true)}
              className="w-full h-14 text-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all"
              data-testid="button-login"
            >
              {t('ui:landingPage.login')}
            </Button>

            <p className="text-sm text-gray-500 mt-6 leading-relaxed">
              {t('ui:landingPage.loginDesc')}
            </p>
          </div>
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
