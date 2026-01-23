import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { DollarSign, Laptop, Camera, Users, ArrowRight, TrendingUp, Globe } from 'lucide-react';
import earnTravelHero from '@/assets/images/seo/earn-travel-hero.png';

export default function EarnTravel() {
  const { t } = useTranslation();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": t('seo.earnTravel.faq.q1', '여행하면서 정말 돈을 벌 수 있나요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.earnTravel.faq.a1', '네, 로컬 가이드, 콘텐츠 제작, 통역 서비스 등으로 실제 수익을 창출하는 사람들이 많습니다.')
        }
      },
      {
        "@type": "Question",
        "name": t('seo.earnTravel.faq.q2', '특별한 스킬이 없어도 가능한가요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.earnTravel.faq.a2', '현지 지식만으로도 충분합니다. 내가 아는 동네 맛집, 사진 스팟 정보가 여행자에게는 가치있습니다.')
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title={t('seo.earnTravel.title', '여행으로 돈 벌기 | 투어게더 Tourgether')}
        description={t('seo.earnTravel.description', '여행하면서 수익 창출하는 방법. 로컬 가이드, 콘텐츠 제작, 통역 서비스로 여행 비용을 충당하세요.')}
        canonicalPath="/earn-travel"
        ogTitle={t('seo.earnTravel.ogTitle', '여행하면서 돈 벌기 — 투어게더')}
        ogDescription={t('seo.earnTravel.ogDescription', '로컬 가이드, 콘텐츠, 서비스로 여행 수익 창출.')}
        keywords={t('seo.earnTravel.keywords', '여행 부업, 여행으로 돈벌기, 디지털 노마드, 여행 수익, 가이드 수익')}
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 섹션 */}
      <header className="relative bg-gradient-to-br from-amber-500 to-orange-600 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${earnTravelHero})` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-amber-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              {t('seo.common.start', '시작하기')}
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {t('seo.earnTravel.hero.title1', '여행이 비용이 아니라')}<br />
            <span className="text-yellow-300">{t('seo.earnTravel.hero.title2', '수익이 되는 방법')}</span>
          </h1>
          <p className="text-xl text-amber-100 mb-8 max-w-2xl mx-auto">
            {t('seo.earnTravel.hero.subtitle', '여행은 돈 쓰는 거라고요? 아니요. 로컬 가이드, 콘텐츠 제작, 서비스 제공으로 여행하면서 수익을 창출할 수 있습니다. 투어게더에서 시작하세요.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                {t('seo.earnTravel.hero.cta', '수익 창출 시작하기')} <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/become-guide">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                {t('seo.earnTravel.hero.cta2', '가이드 등록하기')}
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 수익 창출 방법 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.earnTravel.methods.title', '여행으로 돈 버는 5가지 방법')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Users className="w-7 h-7 text-amber-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.earnTravel.methods.guide.title', '로컬 가이드')}</h3>
              <p className="text-gray-600 mb-4">{t('seo.earnTravel.methods.guide.desc', '내가 사는 도시에서 여행자에게 맛집, 명소, 로컬 체험을 안내합니다.')}</p>
              <p className="text-amber-600 font-semibold">{t('seo.earnTravel.methods.guide.earning', '시간당 3~10만원')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                <Camera className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.earnTravel.methods.photo.title', '사진/영상 촬영')}</h3>
              <p className="text-gray-600 mb-4">{t('seo.earnTravel.methods.photo.desc', '여행자의 추억을 담아주는 촬영 서비스.')}</p>
              <p className="text-amber-600 font-semibold">{t('seo.earnTravel.methods.photo.earning', '건당 5~20만원')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <Globe className="w-7 h-7 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.earnTravel.methods.translate.title', '통역/번역')}</h3>
              <p className="text-gray-600 mb-4">{t('seo.earnTravel.methods.translate.desc', '외국어 능력을 활용한 동행 통역, 문서 번역.')}</p>
              <p className="text-amber-600 font-semibold">{t('seo.earnTravel.methods.translate.earning', '시간당 3~8만원')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mb-4">
                <Laptop className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.earnTravel.methods.content.title', '콘텐츠 제작')}</h3>
              <p className="text-gray-600 mb-4">{t('seo.earnTravel.methods.content.desc', '여행 브이로그, 블로그, 가이드 콘텐츠로 광고/스폰서 수익.')}</p>
              <p className="text-amber-600 font-semibold">{t('seo.earnTravel.methods.content.earning', '월 수십~수백만원 가능')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-pink-100 rounded-full flex items-center justify-center mb-4">
                <TrendingUp className="w-7 h-7 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.earnTravel.methods.shopping.title', '쇼핑 대행')}</h3>
              <p className="text-gray-600 mb-4">{t('seo.earnTravel.methods.shopping.desc', '현지 제품 구매 대행, 쇼핑 동행 서비스.')}</p>
              <p className="text-amber-600 font-semibold">{t('seo.earnTravel.methods.shopping.earning', '건당 수수료 10~20%')}</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm">
              <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                <DollarSign className="w-7 h-7 text-slate-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">{t('seo.earnTravel.methods.host.title', '체험 호스팅')}</h3>
              <p className="text-gray-600 mb-4">{t('seo.earnTravel.methods.host.desc', '요리 클래스, 공방 체험, 로컬 이벤트 운영.')}</p>
              <p className="text-amber-600 font-semibold">{t('seo.earnTravel.methods.host.earning', '회당 5~30만원')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 왜 투어게더인가 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.earnTravel.why.title', '왜 투어게더에서 시작해야 할까요?')}</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</div>
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.earnTravel.why.1.title', '에스크로로 안전한 거래')}</h3>
                <p className="text-gray-600">{t('seo.earnTravel.why.1.desc', '서비스 완료 전까지 결제금이 안전하게 보관됩니다.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</div>
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.earnTravel.why.2.title', '글로벌 여행자 네트워크')}</h3>
                <p className="text-gray-600">{t('seo.earnTravel.why.2.desc', '전 세계 여행자들이 현지 서비스를 찾고 있습니다.')}</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-8 h-8 bg-amber-500 text-white rounded-full flex items-center justify-center font-bold flex-shrink-0">✓</div>
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.earnTravel.why.3.title', '유연한 일정 관리')}</h3>
                <p className="text-gray-600">{t('seo.earnTravel.why.3.desc', '본업과 병행 가능. 가능한 시간만 오픈하면 됩니다.')}</p>
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
              { q: t('seo.earnTravel.faq.q1', '여행하면서 정말 돈을 벌 수 있나요?'), a: t('seo.earnTravel.faq.a1', '네, 로컬 가이드, 콘텐츠 제작, 통역 서비스 등으로 실제 수익을 창출하는 사람들이 많습니다.') },
              { q: t('seo.earnTravel.faq.q2', '특별한 스킬이 없어도 가능한가요?'), a: t('seo.earnTravel.faq.a2', '현지 지식만으로도 충분합니다. 내가 아는 동네 맛집, 사진 스팟 정보가 여행자에게는 가치있습니다.') },
              { q: t('seo.earnTravel.faq.q3', '세금 문제는 어떻게 되나요?'), a: t('seo.earnTravel.faq.a3', '개인 사업자 등록이나 프리랜서로 신고하시면 됩니다. 수익에 따라 세금 처리가 필요합니다.') },
              { q: t('seo.earnTravel.faq.q4', '얼마나 벌 수 있나요?'), a: t('seo.earnTravel.faq.a4', '활동량에 따라 다르지만, 주말만 활동해도 월 50~100만원 추가 수익이 가능합니다.') },
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
      <section className="py-16 bg-amber-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">{t('seo.earnTravel.cta.title', '여행을 수익으로 바꿔보세요')}</h2>
          <p className="text-xl text-amber-100 mb-8">
            {t('seo.earnTravel.cta.subtitle', '내가 아는 것, 내가 좋아하는 것이 누군가에게는 가치있는 서비스가 됩니다.')}
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              {t('seo.earnTravel.cta.button', '지금 시작하기')}
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
