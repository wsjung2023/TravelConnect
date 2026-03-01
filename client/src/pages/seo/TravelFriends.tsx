// SEO 랜딩 — 여행 친구 매칭 소개 페이지. JSON-LD·OG 태그·i18n 포함.
import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { Users, Heart, Shield, MessageCircle, ArrowRight, Camera, Coffee } from 'lucide-react';
import travelFriendsHero from '@/assets/images/seo/travel-friends-hero.png';

export default function TravelFriends() {
  const { t } = useTranslation();

  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": t('seo.travelFriends.faq.q1', '여행에서 새로운 인연을 만날 수 있나요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.travelFriends.faq.a1', '네, 같은 관심사와 여행 스타일을 가진 사람들과 자연스럽게 연결됩니다.')
        }
      },
      {
        "@type": "Question",
        "name": t('seo.travelFriends.faq.q2', '안전한가요?'),
        "acceptedAnswer": {
          "@type": "Answer",
          "text": t('seo.travelFriends.faq.a2', '프로필 인증, 신고/차단 시스템, 공공장소 만남 권장 등 안전 장치가 있습니다.')
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title={t('seo.travelFriends.title', '여행 친구 만들기 | 투어게더 Tourgether')}
        description={t('seo.travelFriends.description', '여행지에서 새로운 친구, 설레는 인연을 만나보세요. 같은 관심사를 가진 여행자들과 연결됩니다.')}
        canonicalPath="/travel-friends"
        ogTitle={t('seo.travelFriends.ogTitle', '여행에서 만나는 새로운 인연 — 투어게더')}
        ogDescription={t('seo.travelFriends.ogDescription', '같은 취향의 여행자와 자연스럽게 연결되세요.')}
        keywords={t('seo.travelFriends.keywords', '여행 친구, 여행 인연, 여행 만남, 동행 찾기, 여행 소모임')}
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 섹션 */}
      <header className="relative bg-gradient-to-br from-rose-500 to-pink-600 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-20 bg-cover bg-center"
          style={{ backgroundImage: `url(${travelFriendsHero})` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-rose-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              {t('seo.common.start', '시작하기')}
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            {t('seo.travelFriends.hero.title1', '여행지에서 만나는')}<br />
            <span className="text-yellow-300">{t('seo.travelFriends.hero.title2', '새로운 인연')}</span>
          </h1>
          <p className="text-xl text-rose-100 mb-8 max-w-2xl mx-auto">
            {t('seo.travelFriends.hero.subtitle', '혼자 여행의 자유로움도 좋지만, 때로는 누군가와 함께하고 싶을 때가 있죠. 같은 취향, 같은 일정의 여행자와 자연스럽게 연결되어 특별한 추억을 만들어보세요.')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                {t('seo.travelFriends.hero.cta', '여행 친구 찾기')} <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/safety">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                {t('seo.travelFriends.hero.cta2', '안전 가이드 보기')}
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 이런 순간에 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.travelFriends.moments.title', '이런 순간, 함께라면 더 좋아요')}</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-7 h-7 text-rose-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelFriends.moments.photo.title', '사진 찍어줄 사람')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelFriends.moments.photo.desc', '인생샷을 서로 찍어주는 여행')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Coffee className="w-7 h-7 text-orange-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelFriends.moments.meal.title', '함께 식사할 사람')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelFriends.moments.meal.desc', '혼밥 대신 함께 나누는 식사')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Users className="w-7 h-7 text-blue-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelFriends.moments.activity.title', '액티비티 함께할 사람')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelFriends.moments.activity.desc', '다이빙, 트레킹, 투어를 함께')}</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm text-center">
              <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MessageCircle className="w-7 h-7 text-purple-600" />
              </div>
              <h3 className="text-lg font-bold mb-2">{t('seo.travelFriends.moments.talk.title', '이야기 나눌 사람')}</h3>
              <p className="text-gray-600 text-sm">{t('seo.travelFriends.moments.talk.desc', '여행 경험을 공유하는 대화')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 자만추 vs 인만추 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.travelFriends.natural.title', '자연스러운 만남을 추구해요')}</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-gray-50 p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-4 text-gray-400">{t('seo.travelFriends.natural.artificial.title', '❌ 이런 만남은 피하고 싶어요')}</h3>
              <ul className="space-y-2 text-gray-500">
                <li>• {t('seo.travelFriends.natural.artificial.1', '억지스러운 매칭')}</li>
                <li>• {t('seo.travelFriends.natural.artificial.2', '프로필 사진만 보고 판단')}</li>
                <li>• {t('seo.travelFriends.natural.artificial.3', '어색한 첫 만남')}</li>
              </ul>
            </div>
            <div className="bg-rose-50 p-8 rounded-xl">
              <h3 className="text-xl font-bold mb-4 text-rose-600">{t('seo.travelFriends.natural.organic.title', '✓ 투어게더는 이래요')}</h3>
              <ul className="space-y-2 text-gray-700">
                <li>• {t('seo.travelFriends.natural.organic.1', '같은 여행지, 같은 일정 기반 연결')}</li>
                <li>• {t('seo.travelFriends.natural.organic.2', '관심사와 여행 스타일로 매칭')}</li>
                <li>• {t('seo.travelFriends.natural.organic.3', '여행이라는 공통 주제로 자연스러운 대화')}</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* 안전 장치 */}
      <section className="py-16 bg-rose-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">{t('seo.travelFriends.safety.title', '안전하게 만나요')}</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <Shield className="w-8 h-8 text-rose-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.travelFriends.safety.profile.title', '프로필 인증')}</h3>
                <p className="text-gray-600">{t('seo.travelFriends.safety.profile.desc', '본인 인증을 통해 신뢰할 수 있는 사용자와 연결됩니다.')}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <MessageCircle className="w-8 h-8 text-rose-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.travelFriends.safety.public.title', '공공장소 만남 권장')}</h3>
                <p className="text-gray-600">{t('seo.travelFriends.safety.public.desc', '첫 만남은 카페, 관광지 등 공개된 장소에서 권장합니다.')}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <Heart className="w-8 h-8 text-rose-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">{t('seo.travelFriends.safety.report.title', '신고/차단 시스템')}</h3>
                <p className="text-gray-600">{t('seo.travelFriends.safety.report.desc', '불편한 상황이 생기면 즉시 신고하고 차단할 수 있습니다.')}</p>
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
              { q: t('seo.travelFriends.faq.q1', '여행에서 새로운 인연을 만날 수 있나요?'), a: t('seo.travelFriends.faq.a1', '네, 같은 관심사와 여행 스타일을 가진 사람들과 자연스럽게 연결됩니다.') },
              { q: t('seo.travelFriends.faq.q2', '안전한가요?'), a: t('seo.travelFriends.faq.a2', '프로필 인증, 신고/차단 시스템, 공공장소 만남 권장 등 안전 장치가 있습니다.') },
              { q: t('seo.travelFriends.faq.q3', '꼭 만나야 하나요?'), a: t('seo.travelFriends.faq.a3', '아니요, 채팅으로만 정보를 교환할 수도 있고, 원하면 오프라인으로 연결할 수도 있습니다.') },
              { q: t('seo.travelFriends.faq.q4', '어떤 사람들이 있나요?'), a: t('seo.travelFriends.faq.a4', '솔로 여행자, 취미 여행자, 출장 중 현지 탐방을 원하는 분 등 다양합니다.') },
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
      <section className="py-16 bg-rose-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">{t('seo.travelFriends.cta.title', '새로운 인연을 만나보세요')}</h2>
          <p className="text-xl text-rose-100 mb-8">
            {t('seo.travelFriends.cta.subtitle', '여행의 가장 큰 선물은 만남입니다. 같은 하늘 아래 같은 순간을 공유하는 사람들과 연결되세요.')}
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              {t('seo.travelFriends.cta.button', '여행 친구 찾기')}
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
