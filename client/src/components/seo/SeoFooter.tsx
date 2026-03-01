// SEO 푸터 — SEO 랜딩 페이지 공통 푸터. 사이트맵 링크와 서비스 정보를 포함한다.
import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';

// SEO 랜딩페이지용 공통 Footer
export default function SeoFooter() {
  const { t } = useTranslation('ui');
  const currentYear = new Date().getFullYear();

  const featureCards = [
    { path: '/travel-itinerary', image: '/seo-cards/travel-itinerary.png', titleKey: 'seoLinks.travelItinerary' },
    { path: '/map-travel', image: '/seo-cards/map-travel.png', titleKey: 'seoLinks.mapTravel' },
    { path: '/travel-timeline', image: '/seo-cards/travel-timeline.png', titleKey: 'seoLinks.travelTimeline' },
    { path: '/local-tips', image: '/seo-cards/local-tips.png', titleKey: 'seoLinks.localTips' },
    { path: '/travel-mate', image: '/seo-cards/travel-mate.png', titleKey: 'seoLinks.travelMate' },
    { path: '/safety', image: '/seo-cards/safety.png', titleKey: 'seoLinks.safety' },
  ];

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 6개 기능 카드 버튼 - 법적 고지 위 */}
        <div className="mb-10">
          <h3 className="text-white font-bold text-lg mb-4 text-center">{t('seoLinks.exploreFeatures')}</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
            {featureCards.map((card) => (
              <Link key={card.path} href={card.path}>
                <div className="bg-gray-800 hover:bg-gray-700 rounded-xl p-3 text-center transition-all hover:scale-105 cursor-pointer group">
                  <img 
                    src={card.image} 
                    alt={t(card.titleKey)} 
                    className="w-12 h-12 mx-auto mb-2 rounded-lg object-cover group-hover:scale-110 transition-transform"
                  />
                  <span className="text-xs font-medium text-gray-200">{t(card.titleKey)}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* 상단 링크 영역 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* 서비스 */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('seoFooter.service', '서비스')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/travel-itinerary" className="hover:text-white transition">{t('seoFooter.travelItinerary', '여행 일정표')}</Link></li>
              <li><Link href="/map-travel" className="hover:text-white transition">{t('seoFooter.mapTravel', '지도 여행 코스')}</Link></li>
              <li><Link href="/travel-timeline" className="hover:text-white transition">{t('seoFooter.travelTimeline', '여행 기록')}</Link></li>
              <li><Link href="/local-tips" className="hover:text-white transition">{t('seoFooter.localTips', '로컬 꿀팁')}</Link></li>
            </ul>
          </div>

          {/* 커뮤니티 */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('seoFooter.community', '커뮤니티')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/travel-mate" className="hover:text-white transition">{t('seoFooter.travelMate', '여행 동행')}</Link></li>
              <li><Link href="/travel-friends" className="hover:text-white transition">{t('seoFooter.travelFriends', '여행 친구')}</Link></li>
              <li><Link href="/safety" className="hover:text-white transition">{t('seoFooter.safety', '안전 가이드')}</Link></li>
            </ul>
          </div>

          {/* 가이드 & 크리에이터 */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('seoFooter.earning', '수익 창출')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/become-guide" className="hover:text-white transition">{t('seoFooter.becomeGuide', '가이드 되기')}</Link></li>
              <li><Link href="/earn-travel" className="hover:text-white transition">{t('seoFooter.earnTravel', '여행 수익')}</Link></li>
              <li><Link href="/travel-creator" className="hover:text-white transition">{t('seoFooter.travelCreator', '크리에이터')}</Link></li>
            </ul>
          </div>

          {/* 법적 정보 */}
          <div>
            <h3 className="text-white font-semibold mb-4">{t('seoFooter.legal', '법적 정보')}</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/terms" className="hover:text-white transition">{t('seoFooter.terms', '이용약관')}</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition">{t('seoFooter.privacy', '개인정보처리방침')}</Link></li>
              <li><Link href="/legal/refund" className="hover:text-white transition">{t('seoFooter.refund', '환불정책')}</Link></li>
            </ul>
          </div>

          {/* 회사 */}
          <div>
            <h3 className="text-white font-semibold mb-4">Tourgether</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition">{t('seoFooter.goHome', '홈으로 이동')}</Link></li>
              <li><a href="mailto:support@tourgether.io" className="hover:text-white transition">{t('seoFooter.support', '고객 지원')}</a></li>
            </ul>
          </div>
        </div>

        {/* 구분선 */}
        <div className="border-t border-gray-700 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            {/* 로고 및 슬로건 */}
            <div className="flex items-center gap-3">
              <Link href="/">
                <span className="text-2xl font-bold text-white">Tourgether</span>
              </Link>
              <span className="text-sm text-gray-400">{t('seoFooter.tagline', '여행을 함께, 더 쉽게')}</span>
            </div>

            {/* CTA 버튼 */}
            <Link href="/">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                {t('seoFooter.startNow', '지금 시작하기')}
              </button>
            </Link>
          </div>

          {/* 저작권 */}
          <p className="text-center text-sm text-gray-500 mt-6">
            © {currentYear} Tourgether. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
}
