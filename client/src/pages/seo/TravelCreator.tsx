import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Video, Camera, Edit, Share2, ArrowRight, TrendingUp, Users } from 'lucide-react';
import travelCreatorHero from '@/assets/images/seo/travel-creator-hero.png';

export default function TravelCreator() {
  const { t } = useTranslation();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": t('seo.travelCreator.faq.q1', '장비가 없어도 시작할 수 있나요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.travelCreator.faq.a1', '스마트폰만 있으면 충분합니다. 요즘 폰 카메라 성능은 전문 장비 못지않습니다.')
        }
      },
      {
        "@type": "Question",
        "name": t('seo.travelCreator.faq.q2', '편집을 못해도 되나요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.travelCreator.faq.a2', 'CapCut 같은 무료 앱으로 충분합니다. AI 자막, 템플릿으로 쉽게 편집 가능합니다.')
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title={t('seo.travelCreator.title', '여행 크리에이터 되기 | 투어게더 Tourgether')}
        description={t('seo.travelCreator.description', '여행 브이로그, 콘텐츠 제작으로 수익 창출하는 방법. 장비, 편집, 채널 성장 전략까지.')}
        canonicalPath="/travel-creator"
        ogTitle={t('seo.travelCreator.ogTitle', '여행 크리에이터로 성장하기 — 투어게더')}
        ogDescription={t('seo.travelCreator.ogDescription', '여행 콘텐츠로 수익 창출하는 방법.')}
        keywords={t('seo.travelCreator.keywords', '여행 유튜버, 여행 브이로그, 여행 크리에이터, 여행 콘텐츠, 브이로그 시작')}
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 섹션 */}
      <header className="relative bg-gradient-to-br from-violet-600 to-purple-700 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${travelCreatorHero})` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-violet-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              {t('seo.common.start', '시작하기')}
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {t('seo.travelCreator.hero.title1', '여행을 콘텐츠로,')}<br />
            <span className="text-yellow-300">{t('seo.travelCreator.hero.title2', '콘텐츠를 수익으로')}</span>
          </h1>
          <p className="text-xl text-violet-100 mb-8 max-w-2xl mx-auto">
            {t('seo.travelCreator.hero.subtitle', '여행 브이로그, 사진, 가이드 콘텐츠로 채널을 키우고 수익을 창출하세요. 스마트폰 하나로 시작할 수 있습니다.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                {t('seo.travelCreator.hero.cta', '크리에이터 시작하기')} <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/travel-timeline">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                {t('seo.travelCreator.hero.cta2', '여행 기록부터 시작')}
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 콘텐츠 유형 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.travelCreator.types.title', '어떤 콘텐츠를 만들 수 있나요?')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-violet-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-7 h-7 text-violet-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelCreator.types.vlog.title', '여행 브이로그')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelCreator.types.vlog.desc', '여행 과정을 담은 영상 콘텐츠')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelCreator.types.photo.title', '사진 콘텐츠')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelCreator.types.photo.desc', '인스타그램, 블로그용 여행 사진')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Edit className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelCreator.types.guide.title', '여행 가이드')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelCreator.types.guide.desc', '일정, 경비, 팁을 담은 실용 콘텐츠')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelCreator.types.shorts.title', '숏폼 콘텐츠')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelCreator.types.shorts.desc', '틱톡, 릴스, 쇼츠용 짧은 영상')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 수익화 방법 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.travelCreator.monetize.title', '크리에이터 수익화 방법')}</h2>
          <div className="space-y-6">
            <div className="bg-violet-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <TrendingUp className="w-8 h-8 text-violet-600" />
                <h3 className="text-xl font-bold">{t('seo.travelCreator.monetize.ads.title', '광고 수익')}</h3>
              </div>
              <p className="text-gray-600">{t('seo.travelCreator.monetize.ads.desc', '유튜브 파트너 프로그램, 블로그 애드센스로 조회수 기반 수익')}</p>
            </div>
            <div className="bg-violet-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <Users className="w-8 h-8 text-violet-600" />
                <h3 className="text-xl font-bold">{t('seo.travelCreator.monetize.sponsor.title', '스폰서/협찬')}</h3>
              </div>
              <p className="text-gray-600">{t('seo.travelCreator.monetize.sponsor.desc', '호텔, 항공사, 관광청과 협업하여 콘텐츠 제작')}</p>
            </div>
            <div className="bg-violet-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <Share2 className="w-8 h-8 text-violet-600" />
                <h3 className="text-xl font-bold">{t('seo.travelCreator.monetize.affiliate.title', '제휴 마케팅')}</h3>
              </div>
              <p className="text-gray-600">{t('seo.travelCreator.monetize.affiliate.desc', '호텔 예약 링크, 장비 리뷰로 커미션 수익')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 시작 가이드 */}
      <section className="py-16 bg-violet-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.travelCreator.start.title', '크리에이터 시작 3단계')}</h2>
          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <span className="bg-violet-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">1</span>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('seo.travelCreator.start.1.title', '장비: 스마트폰이면 충분')}</h3>
                <p className="text-gray-600">{t('seo.travelCreator.start.1.desc', '스마트폰 + 미니 삼각대 + 외부 마이크로 시작. 수익이 생기면 장비 업그레이드.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <span className="bg-violet-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">2</span>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('seo.travelCreator.start.2.title', '편집: 무료 앱으로 OK')}</h3>
                <p className="text-gray-600">{t('seo.travelCreator.start.2.desc', 'CapCut, DaVinci Resolve 같은 무료 프로그램으로 전문가 수준 편집 가능.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <span className="bg-violet-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">3</span>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('seo.travelCreator.start.3.title', '일관성: 주 1회 업로드')}</h3>
                <p className="text-gray-600">{t('seo.travelCreator.start.3.desc', '처음엔 양보다 질. 주 1회 꾸준히 올리는 게 알고리즘보다 강합니다.')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.common.faq', '자주 묻는 질문')}</h2>
          <div className="space-y-4">
            {[
              { q: t('seo.travelCreator.faq.q1', '장비가 없어도 시작할 수 있나요?'), a: t('seo.travelCreator.faq.a1', '스마트폰만 있으면 충분합니다. 요즘 폰 카메라 성능은 전문 장비 못지않습니다.') },
              { q: t('seo.travelCreator.faq.q2', '편집을 못해도 되나요?'), a: t('seo.travelCreator.faq.a2', 'CapCut 같은 무료 앱으로 충분합니다. AI 자막, 템플릿으로 쉽게 편집 가능합니다.') },
              { q: t('seo.travelCreator.faq.q3', '수익화까지 얼마나 걸리나요?'), a: t('seo.travelCreator.faq.a3', '유튜브 기준 구독자 1,000명 + 시청시간 4,000시간이 필요합니다. 보통 6개월~1년 정도 소요됩니다.') },
              { q: t('seo.travelCreator.faq.q4', '혼자 여행해도 촬영이 가능한가요?'), a: t('seo.travelCreator.faq.a4', '네, 삼각대와 셀프 촬영으로 충분합니다. 오히려 솔로 여행 콘텐츠가 인기 있습니다.') },
            ].map((faq, i) => (
              <details key={i} className="bg-white p-4 rounded-lg shadow-sm">
                <summary className="font-semibold cursor-pointer">{faq.q}</summary>
                <p className="mt-2 text-gray-600">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-violet-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">{t('seo.travelCreator.cta.title', '당신의 여행이 콘텐츠가 됩니다')}</h2>
          <p className="text-xl text-violet-100 mb-8">
            {t('seo.travelCreator.cta.subtitle', '지금 바로 첫 영상을 찍어보세요. 완벽하지 않아도 됩니다. 시작이 반입니다.')}
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              {t('seo.travelCreator.cta.button', '크리에이터 시작하기')}
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
