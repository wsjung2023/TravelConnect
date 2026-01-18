import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import { Link } from 'wouter';
import { Lightbulb, MapPin, Clock, ArrowRight } from 'lucide-react';

// 로컬 추천/현지 꿀팁 랜딩페이지
export default function LocalTips() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "로컬 추천은 믿을 만한가요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "그래서 '평가/신뢰' 구조가 중요합니다. 최소한 다녀온 증거/맥락이 쌓이면 신뢰가 생깁니다."
        }
      },
      {
        "@type": "Question",
        "name": "광고성 글이 섞이면 어떡하죠?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "필터링/신고/가이드라인이 필요하고, 무엇보다 정보의 디테일이 부족하면 티가 납니다."
        }
      },
      {
        "@type": "Question",
        "name": "여행 초보도 로컬 팁을 써먹을 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "오히려 초보일수록 도움 됩니다. 핵심은 '동선+시간대' 팁입니다."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title="현지인 추천 여행 | 투어게더 Tourgether 로컬 꿀팁"
        description="광고 같은 추천이 아니라, 로컬의 실제 경험을 바탕으로 한 여행 꿀팁을 모아보세요. 더 현지다운 여행을 시작합니다."
        canonicalPath="/local-tips"
        ogTitle="현지인 추천이 진짜다 — 투어게더"
        ogDescription="로컬 경험 기반 꿀팁을 모아 더 현지다운 여행."
        keywords="로컬 추천, 현지인 추천, 여행 꿀팁, 맛집 추천, 현지 정보"
        jsonLd={faqJsonLd}
      />

      {/* 히어로 */}
      <header className="bg-gradient-to-br from-orange-500 to-red-600 text-white">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-orange-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              시작하기
            </button>
          </Link>
        </nav>
        
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            여행의 퀄리티는,<br />
            <span className="text-yellow-300">결국 '추천'에서 갈려요.</span>
          </h1>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            검색하면 정보는 넘치는데, 막상 가보면 실망할 때 있죠.
            리뷰가 많은데 별로거나, 사진은 예쁜데 대기만 하다 끝나거나.
            투어게더는 "광고성 정보"보다 현지 경험 기반 추천에 집중합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                로컬 꿀팁 보기 <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/map-travel">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                지도에 저장하기
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 로컬 추천이 좋은 이유 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">로컬 추천이 좋은 이유</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">🗺️</div>
              <h3 className="text-xl font-bold mb-2">관광객 동선만 따라가지 않게 된다</h3>
              <p className="text-gray-600">숨겨진 명소를 발견할 수 있습니다.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">🍜</div>
              <h3 className="text-xl font-bold mb-2">현지에서 진짜 먹고/하는 것을 알 수 있다</h3>
              <p className="text-gray-600">관광객용이 아닌 진짜 맛집을 찾습니다.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">✨</div>
              <h3 className="text-xl font-bold mb-2">여행이 더 특별해진다</h3>
              <p className="text-gray-600">다른 사람과 다른 경험을 합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 핵심 4요소 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더 로컬 팁이 담아야 하는 것 (핵심 4요소)</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-orange-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <Clock className="w-8 h-8 text-orange-600" />
                <h3 className="text-xl font-bold">언제 가야 좋은지</h3>
              </div>
              <p className="text-gray-600">시간대별 혼잡도, 베스트 타이밍</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <Lightbulb className="w-8 h-8 text-orange-600" />
                <h3 className="text-xl font-bold">무엇을 해야 하는지</h3>
              </div>
              <p className="text-gray-600">베스트 메뉴, 핵심 포인트</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <MapPin className="w-8 h-8 text-orange-600" />
                <h3 className="text-xl font-bold">어떻게 가야 편한지</h3>
              </div>
              <p className="text-gray-600">동선, 교통 팁</p>
            </div>
            <div className="bg-orange-50 p-6 rounded-xl">
              <div className="flex items-center gap-4 mb-3">
                <span className="text-2xl">⚠️</span>
                <h3 className="text-xl font-bold">어떤 함정이 있는지</h3>
              </div>
              <p className="text-gray-600">줄, 휴무, 예약 필수 여부</p>
            </div>
          </div>
        </div>
      </section>

      {/* 예시 */}
      <section className="py-16 bg-orange-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">예시 — "이런 꿀팁이 진짜다"</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              '"여긴 오전 10시 이전에 가면 줄 거의 없음"',
              '"메뉴는 A 말고 B가 진짜"',
              '"비 오면 여기 말고 근처 실내 플랜B"',
              '"야경은 이 방향에서 찍어야 예쁨"',
            ].map((tip, i) => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-sm border-l-4 border-orange-500">
                <p className="font-medium text-gray-800">{tip}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 활용 방법 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더 로컬 꿀팁은 이렇게 쓰면 좋아요</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="text-4xl mb-4">✈️</div>
              <h3 className="text-lg font-bold mb-2">여행 전</h3>
              <p className="text-gray-600 text-sm">'가고 싶은 도시'의 꿀팁을 읽고, 지도에 핀으로 저장, 코스로 묶기</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">🏃</div>
              <h3 className="text-lg font-bold mb-2">여행 중</h3>
              <p className="text-gray-600 text-sm">"비 오는 날/더운 날" 플랜B를 참고, 예약/대기 팁으로 스트레스 줄이기</p>
            </div>
            <div className="text-center">
              <div className="text-4xl mb-4">📝</div>
              <h3 className="text-lg font-bold mb-2">여행 후</h3>
              <p className="text-gray-600 text-sm">내가 찾은 꿀팁을 한 줄로 남기기, 다음 여행자에게 도움 주기</p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">자주 묻는 질문</h2>
          <div className="space-y-4">
            {[
              { q: '로컬 추천은 믿을 만한가요?', a: "그래서 '평가/신뢰' 구조가 중요합니다. 최소한 '다녀온 증거/맥락'이 쌓이면 신뢰가 생깁니다." },
              { q: '광고성 글이 섞이면 어떡하죠?', a: '필터링/신고/가이드라인이 필요하고, 무엇보다 "정보의 디테일"이 부족하면 티가 납니다.' },
              { q: '여행 초보도 로컬 팁을 써먹을 수 있나요?', a: "오히려 초보일수록 도움 됩니다. 핵심은 '동선+시간대' 팁입니다." },
              { q: '도시 말고 지방/해외도 되나요?', a: '오히려 해외에서 빛납니다. 언어 장벽을 로컬 팁이 줄여줍니다.' },
              { q: '로컬 팁이 많아지면 뭐가 좋아져요?', a: '검색 유입이 늘고, 사용자 만족이 늘고, 공유가 늘고... 선순환이 됩니다.' },
              { q: '꿀팁을 남길 때 어렵지 않나요?', a: '한 줄 + 사진 1장 + 상황(언제 좋은지)만 적으면 충분합니다.' },
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
      <section className="py-16 bg-orange-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 바로 로컬 추천 보기</h2>
          <p className="text-xl text-orange-100 mb-8">
            가고 싶은 도시 하나를 정하세요.<br />
            그리고 "현지인 추천 맛집/카페/야경/시장" 중 하나만 검색해서,<br />
            투어게더에 핀으로 저장해보세요. 여행은 그렇게 시작됩니다.
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              로컬 꿀팁 보기
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
