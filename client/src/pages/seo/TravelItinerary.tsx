import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { Calendar, MapPin, CheckSquare, ArrowRight } from 'lucide-react';

// 여행 일정표 만들기 랜딩페이지
export default function TravelItinerary() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "일정표를 꼭 빡빡하게 짜야 하나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "아니요. 빡빡하면 현장에서 부서집니다. 핵심만 넣고, 빈 시간을 남겨두는 게 진짜 여행 일정표입니다."
        }
      },
      {
        "@type": "Question",
        "name": "하루에 장소 몇 개가 적당해요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "도심이면 3~5곳, 장거리면 2~3곳이 현실적입니다. 이동시간이 여행의 절반이라는 사실을 잊지 마세요."
        }
      },
      {
        "@type": "Question",
        "name": "지도 기반으로 보면 뭐가 좋아요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "동선이 보이니까 같은 방향끼리 묶는 최적화가 쉬워집니다."
        }
      },
      {
        "@type": "Question",
        "name": "친구랑 같이 일정 짤 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "네, 일정은 혼자 만들수록 망하고 같이 만들수록 삽니다. 공유 링크/공유용 요약이 있으면 됩니다."
        }
      },
      {
        "@type": "Question",
        "name": "여행 끝나면 이 일정표는 어디에 쓰죠?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "기록/타임라인으로 이어져서 다음 여행의 템플릿이 됩니다."
        }
      },
      {
        "@type": "Question",
        "name": "일정표 만들 때 가장 흔한 실수는?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "이동시간을 무시하는 것입니다. 지도에서 확인하면 바로 잡힙니다."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title="여행 일정표 만들기 | 투어게더 Tourgether 여행 플래너"
        description="여행 일정표를 3분 만에 만들고, 날짜별 코스를 한눈에 정리하세요. 지도 기반 동선까지 함께 보는 여행 플래너, 투어게더."
        canonicalPath="/travel-itinerary"
        ogTitle="여행 일정표를 3분 만에 — 투어게더"
        ogDescription="날짜별 코스·장소·메모를 한 번에. 여행 계획이 쉬워지는 일정표."
        keywords="여행 일정표, 여행 플래너, 여행 계획, 여행 일정표 만들기, 2박3일 여행 일정표"
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 섹션 */}
      <header className="relative bg-gradient-to-br from-blue-600 to-blue-800 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url('/seo-hero/travel-itinerary.png')` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-blue-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              시작하기
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            여행 일정표, 어렵게 만들지 마세요.<br />
            <span className="text-yellow-300">투어게더로 3분이면 끝.</span>
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            여행 준비할 때 제일 스트레스 받는 순간 — 메모장/엑셀/카톡/지도 링크가 다 흩어져서 계획이 아니라 혼돈이 되는 순간.
            투어게더는 일정표를 날짜별로 정리하고, 장소와 지도를 연결해서 "계획이 실제 동선"으로 보이게 해주는 여행 플래너입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                여행 일정표 만들기 <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/map-travel">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                지도에서 코스 보기
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 타겟 고객 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">이런 사람에게 딱 맞아요</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '👫', text: '친구/연인/가족 여행 일정표를 한 번에 정리하고 싶은 사람' },
              { icon: '🗺️', text: '하루에 여러 장소를 도는 코스 여행(동선 최적화)이 필요한 사람' },
              { icon: '📝', text: '여행 전에 준비물/예약/메모를 깔끔하게 모아두고 싶은 사람' },
              { icon: '📸', text: '여행 끝나고 기록까지 이어서 남기고 싶은 사람' },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <p className="text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 핵심 기능 */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더 일정표가 쉬운 이유 (핵심 3가지)</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Calendar className="w-8 h-8 text-blue-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">날짜별로 정리</h3>
              <p className="text-gray-600">Day1/Day2처럼 하루 단위로 코스가 자동으로 읽히게 정리됩니다.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <MapPin className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">장소가 지도와 연결</h3>
              <p className="text-gray-600">"이날 어디부터 어디까지 가는지"가 감으로 보입니다.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckSquare className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">메모/체크리스트까지 한 곳에서</h3>
              <p className="text-gray-600">준비물, 예약번호, 링크, 할 일... 흩어지지 않게 모아둡니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3단계 가이드 */}
      <section className="py-16 bg-blue-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">여행 일정표 만들기 (3단계)</h2>
          <div className="space-y-8">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">1</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">여행 날짜를 먼저 잡아요</h3>
                  <p className="text-gray-600">여행 시작일/종료일만 정하면, 일정표 뼈대가 생깁니다.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">2</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">하루에 갈 장소를 '적당히' 넣어요</h3>
                  <p className="text-gray-600">욕심내서 12개 넣으면 망해요. 도심/쇼핑 위주는 하루 3~5곳, 자연/장거리는 하루 2~3곳이 현실적인 루트입니다.</p>
                </div>
              </div>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <div className="flex items-start gap-4">
                <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-bold flex-shrink-0">3</span>
                <div>
                  <h3 className="text-xl font-bold mb-2">장소마다 한 줄 메모만 남겨요</h3>
                  <p className="text-gray-600">"여기 점심", "해질 무렵 사진 스팟", "비 오면 플랜B" — 이 정도면, 현장에서 완성됩니다.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 예시 일정표 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">예시 일정표 (2박 3일)</h2>
          <div className="bg-gray-50 p-8 rounded-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <span className="bg-blue-600 text-white px-3 py-1 rounded font-bold">Day 1</span>
                <p className="text-gray-700">도착 → 숙소 체크인 → 근처 맛집 → 야경 스팟</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-blue-600 text-white px-3 py-1 rounded font-bold">Day 2</span>
                <p className="text-gray-700">오전 핵심 관광지 → 점심 → 카페/쇼핑 → 저녁</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="bg-blue-600 text-white px-3 py-1 rounded font-bold">Day 3</span>
                <p className="text-gray-700">브런치 → 기념품 → 공항</p>
              </div>
            </div>
            <p className="text-gray-500 mt-6 text-sm">투어게더는 이런 "현실적인 일정"이 한 화면에서 보이게 만드는 데 초점을 둡니다.</p>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">자주 묻는 질문</h2>
          <div className="space-y-4">
            {[
              { q: '일정표를 꼭 빡빡하게 짜야 하나요?', a: '아니요. 빡빡하면 현장에서 부서집니다. 핵심만 넣고, 빈 시간을 남겨두는 게 진짜 여행 일정표입니다.' },
              { q: '하루에 장소 몇 개가 적당해요?', a: '도심이면 3~5곳, 장거리면 2~3곳이 현실적입니다. 이동시간이 여행의 절반이라는 사실을 잊지 마세요.' },
              { q: '지도 기반으로 보면 뭐가 좋아요?', a: '동선이 보이니까 "같은 방향끼리 묶는" 최적화가 쉬워집니다.' },
              { q: '친구랑 같이 일정 짤 수 있나요?', a: '일정은 혼자 만들수록 망하고 같이 만들수록 삽니다. 공유 링크/공유용 요약이 있으면 끝!' },
              { q: '여행 끝나면 이 일정표는 어디에 쓰죠?', a: '기록/타임라인으로 이어져서 "다음 여행"의 템플릿이 됩니다.' },
              { q: '일정표 만들 때 가장 흔한 실수는?', a: '이동시간을 무시하는 것입니다. 지도에서 확인하면 바로 잡힙니다.' },
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
      <section className="py-16 bg-blue-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하기</h2>
          <p className="text-xl text-blue-100 mb-8">
            여행 계획은 '완벽'이 아니라 '가벼운 시작'이 승리입니다.<br />
            투어게더에서 일정표 한 장 만들고, 지도에서 동선만 확인해보세요.
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              여행 일정표 만들기
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
