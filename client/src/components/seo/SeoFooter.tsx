import { Link } from 'wouter';

// SEO 랜딩페이지용 공통 Footer
export default function SeoFooter() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-gray-900 text-gray-300">
      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* 상단 링크 영역 */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-8 mb-8">
          {/* 서비스 */}
          <div>
            <h3 className="text-white font-semibold mb-4">서비스</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/travel-itinerary" className="hover:text-white transition">여행 일정표</Link></li>
              <li><Link href="/map-travel" className="hover:text-white transition">지도 여행 코스</Link></li>
              <li><Link href="/travel-timeline" className="hover:text-white transition">여행 기록</Link></li>
              <li><Link href="/local-tips" className="hover:text-white transition">로컬 꿀팁</Link></li>
            </ul>
          </div>

          {/* 커뮤니티 */}
          <div>
            <h3 className="text-white font-semibold mb-4">커뮤니티</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/travel-mate" className="hover:text-white transition">여행 동행</Link></li>
              <li><Link href="/travel-friends" className="hover:text-white transition">여행 친구</Link></li>
              <li><Link href="/safety" className="hover:text-white transition">안전 가이드</Link></li>
            </ul>
          </div>

          {/* 가이드 & 크리에이터 */}
          <div>
            <h3 className="text-white font-semibold mb-4">수익 창출</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/become-guide" className="hover:text-white transition">가이드 되기</Link></li>
              <li><Link href="/earn-travel" className="hover:text-white transition">여행 수익</Link></li>
              <li><Link href="/travel-creator" className="hover:text-white transition">크리에이터</Link></li>
            </ul>
          </div>

          {/* 법적 정보 */}
          <div>
            <h3 className="text-white font-semibold mb-4">법적 정보</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/terms" className="hover:text-white transition">이용약관</Link></li>
              <li><Link href="/legal/privacy" className="hover:text-white transition">개인정보처리방침</Link></li>
              <li><Link href="/legal/refund" className="hover:text-white transition">환불정책</Link></li>
            </ul>
          </div>

          {/* 회사 */}
          <div>
            <h3 className="text-white font-semibold mb-4">Tourgether</h3>
            <ul className="space-y-2 text-sm">
              <li><Link href="/" className="hover:text-white transition">홈으로 이동</Link></li>
              <li><a href="mailto:support@tourgether.io" className="hover:text-white transition">고객 지원</a></li>
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
              <span className="text-sm text-gray-400">여행을 함께, 더 쉽게</span>
            </div>

            {/* CTA 버튼 */}
            <Link href="/">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition">
                지금 시작하기
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
