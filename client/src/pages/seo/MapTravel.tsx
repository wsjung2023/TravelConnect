import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { MapPin, Route, Clock, ArrowRight } from 'lucide-react';

// 지도 기반 여행 코스 랜딩페이지
export default function MapTravel() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "지도에 찍는 장소는 몇 개가 적당해요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "처음엔 10개 정도면 충분합니다. 많아도 괜찮지만, 코스로 묶을 땐 하루 3~5곳이 현실적입니다."
        }
      },
      {
        "@type": "Question",
        "name": "지도 코스랑 일정표의 차이는 뭔가요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "지도 코스는 '공간(동선)'이고, 일정표는 '시간(날짜/순서)'입니다. 둘이 합쳐지면 여행이 됩니다."
        }
      },
      {
        "@type": "Question",
        "name": "현장에서 코스 바꾸면 망하지 않나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "오히려 현장 수정이 정상입니다. 지도 기반이면 수정 비용이 낮아집니다."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title="지도 기반 여행 코스 | 투어게더 Tourgether"
        description="지도에서 장소를 찍고, 나만의 여행 코스를 한눈에 정리하세요. 동선이 보이니까 여행이 편해집니다."
        canonicalPath="/map-travel"
        ogTitle="지도로 여행 코스를 만든다 — 투어게더"
        ogDescription="핀 찍고, 코스 묶고, 동선 확인까지 한 번에."
        keywords="지도 여행, 여행 코스, 동선 최적화, 여행 지도, 여행 코스 짜기"
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 */}
      <header className="relative bg-gradient-to-br from-green-600 to-teal-700 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url('/seo-hero/map-travel.png')` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-green-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              시작하기
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            지도에서 여행을 만들면,<br />
            <span className="text-yellow-300">길을 잃지 않아요.</span>
          </h1>
          <p className="text-xl text-green-100 mb-8 max-w-2xl mx-auto">
            여행이 꼬이는 이유는 대부분 한 가지 — "장소는 많은데, 동선이 안 보임."
            투어게더의 핵심은 "지도 중심"입니다. 장소를 모으고, 묶고, 흐름을 만들면 여행은 갑자기 쉬워집니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                지도에서 장소 찍기 <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/travel-itinerary">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                일정표로 연결하기
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 장점 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">지도 기반 여행이 좋은 이유</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Route className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">동선이 보인다</h3>
              <p className="text-gray-600">가까운 곳끼리 묶기 쉽습니다.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">시간을 아낀다</h3>
              <p className="text-gray-600">'이동'이 줄면 여행이 늘어납니다.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">현장에서 수정이 쉽다</h3>
              <p className="text-gray-600">비/혼잡/피로도에 따라 코스 재배치가 가능합니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3단계 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더 지도 여행 3단계</h2>
          <div className="space-y-8">
            <div className="flex items-start gap-6">
              <span className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">1</span>
              <div>
                <h3 className="text-xl font-bold mb-2">장소를 핀으로 모아요</h3>
                <p className="text-gray-600">검색해서 찍어도 되고, 추천받아도 되고, 저장해도 됩니다. 중요한 건 "장소 리스트"가 아니라 지도 위에 모이는 것입니다.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <span className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">2</span>
              <div>
                <h3 className="text-xl font-bold mb-2">가까운 곳끼리 코스로 묶어요</h3>
                <p className="text-gray-600">지도에서 보면 바로 답이 보입니다. 같은 구역(동네)끼리 묶고, 이동시간 긴 조합은 분리하세요.</p>
              </div>
            </div>
            <div className="flex items-start gap-6">
              <span className="bg-green-600 text-white w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg flex-shrink-0">3</span>
              <div>
                <h3 className="text-xl font-bold mb-2">코스를 일정표로 연결해요</h3>
                <p className="text-gray-600">지도로 만든 코스는 일정표로 옮기면 완성. "Day2는 이 구역"처럼 하루의 리듬이 생깁니다.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 실패 패턴 */}
      <section className="py-16 bg-red-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">코스가 망하는 대표 패턴</h2>
          <p className="text-center text-gray-600 mb-8">(이걸 피하면 반은 성공!)</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
              <p className="font-medium">유명지 5개를 하루에 다 넣는 계획</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
              <p className="font-medium">이동시간/대기시간을 0으로 치는 계획</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm border-l-4 border-red-500">
              <p className="font-medium">식사/휴식 시간을 '공백'으로 두지 않는 계획</p>
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
              { q: '지도에 찍는 장소는 몇 개가 적당해요?', a: '처음엔 10개 정도면 충분합니다. 많아도 괜찮지만, 코스로 묶을 땐 하루 3~5곳이 현실적입니다.' },
              { q: '지도 코스랑 일정표의 차이는 뭔가요?', a: "지도 코스는 '공간(동선)'이고, 일정표는 '시간(날짜/순서)'입니다. 둘이 합쳐지면 여행이 됩니다." },
              { q: '현장에서 코스 바꾸면 망하지 않나요?', a: '오히려 현장 수정이 정상입니다. 지도 기반이면 수정 비용이 낮아집니다.' },
              { q: '추천 장소는 어디서 오나요?', a: '궁극적으로는 로컬/여행자 경험 기반 추천이 핵심입니다. "광고 같은 추천"은 최대한 줄이는 방향이 맞습니다.' },
              { q: '차 없이 걸어다니는 여행에도 도움이 되나요?', a: '더 도움 됩니다. 도보/대중교통은 동선이 더 중요합니다.' },
              { q: '코스 만들 때 꼭 알아야 할 1가지?', a: "'이동시간'은 무조건 포함하세요. 지도에서 거리감이 보이면 절반은 해결됩니다." },
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
      <section className="py-16 bg-green-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 바로 해볼 것</h2>
          <p className="text-xl text-green-100 mb-8">
            오늘 여행 갈 게 아니라도 좋습니다.<br />
            내가 가고 싶은 도시 하나 정하고, 장소 10개만 핀으로 찍어보세요.<br />
            그 순간부터 코스는 자동으로 정리되기 시작합니다.
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              내 코스 만들기
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
