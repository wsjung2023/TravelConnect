import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Users, DollarSign, Calendar, Star, ArrowRight, Shield, MapPin } from 'lucide-react';
import becomeGuideHero from '@/assets/images/seo/become-guide-hero.png';

export default function BecomeGuide() {
  const { t } = useTranslation();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": t('seo.becomeGuide.faq.q1', '가이드가 되려면 자격증이 필요한가요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.becomeGuide.faq.a1', '아니요. 현지 경험과 열정이 더 중요합니다. 물론 전문 자격증이 있다면 신뢰도가 올라갑니다.')
        }
      },
      {
        "@type": "Question",
        "name": t('seo.becomeGuide.faq.q2', '수익은 어떻게 받나요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.becomeGuide.faq.a2', '에스크로 시스템으로 안전하게 정산됩니다. 서비스 완료 후 자동 지급됩니다.')
        }
      },
      {
        "@type": "Question",
        "name": t('seo.becomeGuide.faq.q3', '어떤 서비스를 제공할 수 있나요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.becomeGuide.faq.a3', '맛집 투어, 쇼핑 동행, 통역, 공항 픽업, 사진 촬영, 로컬 체험 등 다양한 서비스가 가능합니다.')
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title={t('seo.becomeGuide.title', '로컬 가이드 되기 | 투어게더 Tourgether')}
        description={t('seo.becomeGuide.description', '내가 사는 도시에서 여행자에게 특별한 경험을 선사하고 수익도 창출하세요. 투어게더 로컬 가이드로 시작하기.')}
        canonicalPath="/become-guide"
        ogTitle={t('seo.becomeGuide.ogTitle', '로컬 가이드로 수익 창출하기 — 투어게더')}
        ogDescription={t('seo.becomeGuide.ogDescription', '당신의 도시 지식이 여행자에게는 가치있는 경험이 됩니다.')}
        keywords={t('seo.becomeGuide.keywords', '로컬 가이드, 여행 가이드 부업, 가이드 수익, 체험 호스트, 투어 가이드')}
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 섹션 */}
      <header className="relative bg-gradient-to-br from-emerald-600 to-teal-700 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${becomeGuideHero})` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-emerald-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              {t('seo.common.start', '시작하기')}
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {t('seo.becomeGuide.hero.title1', '당신의 도시 지식이')}<br />
            <span className="text-yellow-300">{t('seo.becomeGuide.hero.title2', '여행자에게는 보물입니다.')}</span>
          </h1>
          <p className="text-xl text-emerald-100 mb-8 max-w-2xl mx-auto">
            {t('seo.becomeGuide.hero.subtitle', '관광객은 모르는 로컬 맛집, 숨은 명소, 현지인의 팁. 당신이 매일 지나치는 일상이 누군가에게는 특별한 여행이 됩니다. 투어게더에서 로컬 가이드로 수익을 창출하세요.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                {t('seo.becomeGuide.hero.cta', '가이드 등록하기')} <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/earn-travel">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                {t('seo.becomeGuide.hero.cta2', '수익 구조 알아보기')}
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 이런 분에게 추천 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.becomeGuide.target.title', '이런 분에게 딱 맞아요')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🏠', text: t('seo.becomeGuide.target.1', '내가 사는 도시를 잘 아는 현지인') },
              { icon: '💬', text: t('seo.becomeGuide.target.2', '외국어로 소통 가능한 분') },
              { icon: '📸', text: t('seo.becomeGuide.target.3', '사진/영상 촬영 능력이 있는 분') },
              { icon: '🚗', text: t('seo.becomeGuide.target.4', '차량이나 특별한 스킬이 있는 분') },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <p className="text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 제공 가능한 서비스 */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.becomeGuide.services.title', '제공할 수 있는 서비스')}</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-emerald-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.becomeGuide.services.tour.title', '로컬 투어')}</h3>
              <p className="text-gray-600">{t('seo.becomeGuide.services.tour.desc', '맛집 투어, 야경 투어, 문화 체험, 사진 스팟 안내')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.becomeGuide.services.assist.title', '동행 서비스')}</h3>
              <p className="text-gray-600">{t('seo.becomeGuide.services.assist.desc', '쇼핑 동행, 통역, 공항 픽업, 병원 동행')}</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Star className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.becomeGuide.services.special.title', '특별 체험')}</h3>
              <p className="text-gray-600">{t('seo.becomeGuide.services.special.desc', '요리 클래스, 공방 체험, 로컬 이벤트 참여')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 수익 구조 */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.becomeGuide.revenue.title', '수익 구조')}</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <DollarSign className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.becomeGuide.revenue.pricing.title', '가격은 직접 설정')}</h3>
                <p className="text-gray-600">{t('seo.becomeGuide.revenue.pricing.desc', '시간당/건당 가격을 자유롭게 책정하세요. 시장 가격을 참고해드립니다.')}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <Shield className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.becomeGuide.revenue.escrow.title', '에스크로로 안전 정산')}</h3>
                <p className="text-gray-600">{t('seo.becomeGuide.revenue.escrow.desc', '서비스 완료 전까지 결제금이 안전하게 보관됩니다.')}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <Calendar className="w-8 h-8 text-emerald-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.becomeGuide.revenue.schedule.title', '일정은 내가 관리')}</h3>
                <p className="text-gray-600">{t('seo.becomeGuide.revenue.schedule.desc', '가능한 날짜/시간만 오픈하면 됩니다. 본업과 병행 가능.')}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 시작 단계 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.becomeGuide.steps.title', '가이드 시작 3단계')}</h2>
          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <span className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">1</span>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('seo.becomeGuide.steps.1.title', '프로필 등록')}</h3>
                <p className="text-gray-600">{t('seo.becomeGuide.steps.1.desc', '소개, 제공 서비스, 가격, 사용 언어를 등록합니다.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <span className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">2</span>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('seo.becomeGuide.steps.2.title', '여행자 요청 수락')}</h3>
                <p className="text-gray-600">{t('seo.becomeGuide.steps.2.desc', '피드에서 여행자 요청을 보고 제안을 보내거나, 직접 예약을 받습니다.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <span className="bg-emerald-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">3</span>
              <div>
                <h3 className="text-xl font-bold mb-2">{t('seo.becomeGuide.steps.3.title', '서비스 제공 & 정산')}</h3>
                <p className="text-gray-600">{t('seo.becomeGuide.steps.3.desc', '서비스 완료 후 리뷰를 받고, 정산금이 자동 지급됩니다.')}</p>
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
              { q: t('seo.becomeGuide.faq.q1', '가이드가 되려면 자격증이 필요한가요?'), a: t('seo.becomeGuide.faq.a1', '아니요. 현지 경험과 열정이 더 중요합니다. 물론 전문 자격증이 있다면 신뢰도가 올라갑니다.') },
              { q: t('seo.becomeGuide.faq.q2', '수익은 어떻게 받나요?'), a: t('seo.becomeGuide.faq.a2', '에스크로 시스템으로 안전하게 정산됩니다. 서비스 완료 후 자동 지급됩니다.') },
              { q: t('seo.becomeGuide.faq.q3', '어떤 서비스를 제공할 수 있나요?'), a: t('seo.becomeGuide.faq.a3', '맛집 투어, 쇼핑 동행, 통역, 공항 픽업, 사진 촬영, 로컬 체험 등 다양한 서비스가 가능합니다.') },
              { q: t('seo.becomeGuide.faq.q4', '본업이 있는데 부업으로 가능한가요?'), a: t('seo.becomeGuide.faq.a4', '네, 가능한 시간만 오픈하면 됩니다. 주말이나 저녁 시간만 활동하는 가이드도 많습니다.') },
              { q: t('seo.becomeGuide.faq.q5', '외국어를 못해도 되나요?'), a: t('seo.becomeGuide.faq.a5', '국내 여행자를 대상으로 하면 됩니다. 외국어가 가능하면 더 많은 기회가 열립니다.') },
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
      <section className="py-16 bg-emerald-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">{t('seo.becomeGuide.cta.title', '지금 가이드로 시작하세요')}</h2>
          <p className="text-xl text-emerald-100 mb-8">
            {t('seo.becomeGuide.cta.subtitle', '당신의 일상이 누군가에게는 특별한 여행이 됩니다. 프로필 등록은 5분이면 충분합니다.')}
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              {t('seo.becomeGuide.cta.button', '가이드 등록하기')}
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
