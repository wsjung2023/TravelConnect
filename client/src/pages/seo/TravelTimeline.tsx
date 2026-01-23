import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { Camera, BookOpen, Share2, ArrowRight } from 'lucide-react';

// 여행 기록/타임라인 랜딩페이지
export default function TravelTimeline() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "여행 끝나고 나서도 기록을 만들 수 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "당연합니다. 오히려 여행 끝나고 정리할 때 타임라인이 빛납니다."
        }
      },
      {
        "@type": "Question",
        "name": "글을 길게 못 쓰는데 괜찮아요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "길게 안 써도 됩니다. 한 줄이 가장 강한 기록입니다."
        }
      },
      {
        "@type": "Question",
        "name": "사진이 너무 많아요. 어떻게 줄이죠?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "대표 3장 규칙을 사용하세요. 많으면 기록이 아니라 창고가 됩니다."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title="여행 기록 남기기 | 투어게더 Tourgether 여행 타임라인"
        description="여행 중 찍은 장소·사진·메모를 한 줄로 모아 '여행 타임라인'으로 남기세요. 여행이 끝나도 기록은 남습니다."
        canonicalPath="/travel-timeline"
        ogTitle="여행은 지나가도 기록은 남는다 — 투어게더"
        ogDescription="흩어진 사진/메모/장소를 한 번에 정리하는 여행 타임라인."
        keywords="여행 기록, 여행 타임라인, 여행 사진 정리, 여행 후기, 여행 일기"
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 */}
      <header className="relative bg-gradient-to-br from-purple-600 to-indigo-700 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url('/seo-hero/travel-timeline.png')` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-purple-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              시작하기
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            여행이 끝나면 남는 건,<br />
            <span className="text-yellow-300">결국 기록이에요.</span>
          </h1>
          <p className="text-xl text-purple-100 mb-8 max-w-2xl mx-auto">
            여행은 짧고, 사진은 많고, 메모는 흩어집니다.
            그래서 여행이 끝나면 "예쁜 추억"보다 "정리 못 한 파일"이 남는 경우가 많습니다.
            투어게더 타임라인은 여행을 하나의 이야기로 정리해 주는 기능입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                여행 기록 시작하기 <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/travel-itinerary">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                일정표부터 만들기
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 장점 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">여행 기록이 '정리'되면 뭐가 좋아요?</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-xl font-bold mb-2">다음 여행 계획이 빨라짐</h3>
              <p className="text-gray-600">이전 기록이 템플릿이 됩니다.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">💬</div>
              <h3 className="text-xl font-bold mb-2">공유할 때 설명이 쉬움</h3>
              <p className="text-gray-600">친구/가족에게 한 번에 보여줄 수 있습니다.</p>
            </div>
            <div className="bg-white p-8 rounded-xl shadow-sm text-center">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">나만의 여행 취향이 데이터로</h3>
              <p className="text-gray-600">어떤 여행을 좋아하는지 선명해집니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 차별점 */}
      <section className="py-16">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더 여행 타임라인은 이렇게 달라요</h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Camera className="w-8 h-8 text-purple-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">장소가 중심</h3>
              <p className="text-gray-600">"어디에서" 찍었는지 흐름이 보입니다.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <BookOpen className="w-8 h-8 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">하루 단위 스토리</h3>
              <p className="text-gray-600">Day1/Day2처럼 자연스러운 구조입니다.</p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-pink-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Share2 className="w-8 h-8 text-pink-600" />
              </div>
              <h3 className="text-xl font-bold mb-2">짧은 메모 중심</h3>
              <p className="text-gray-600">길게 쓰지 않아도 '기억'이 살아납니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 가장 쉬운 방식 */}
      <section className="py-16 bg-purple-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">여행 기록 남기기 (가장 쉬운 방식)</h2>
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-2">1) 하루에 한 번, '오늘 한 줄'만 적기</h3>
              <p className="text-gray-600">"오늘 뭐가 좋았는지" 한 줄이면 충분합니다.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-2">2) 사진은 '대표 3장'만 고르기</h3>
              <p className="text-gray-600">많이 올릴수록 기록은 무거워집니다. 대표 3장이 오히려 여행을 기억하게 합니다.</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <h3 className="text-xl font-bold mb-2">3) 장소는 반드시 연결하기</h3>
              <p className="text-gray-600">장소가 연결되면, 기록이 "그날의 지도"가 됩니다.</p>
            </div>
          </div>
        </div>
      </section>

      {/* 콘텐츠가 되는 순간 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">기록이 '콘텐츠'가 되는 순간</h2>
          <p className="text-xl text-gray-600 mb-8">
            여행 타임라인이 쌓이면, 나에게는 추억이 되고<br />
            다른 사람에게는 "현실적인 여행 정보"가 됩니다.<br />
            그래서 기록은 단순한 감상이 아니라, 다른 사람을 도울 수 있는 가치가 됩니다.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">자주 묻는 질문</h2>
          <div className="space-y-4">
            {[
              { q: '여행 끝나고 나서도 기록을 만들 수 있나요?', a: '당연합니다. 오히려 여행 끝나고 정리할 때 타임라인이 빛납니다.' },
              { q: '글을 길게 못 쓰는데 괜찮아요?', a: '길게 안 써도 됩니다. 한 줄이 가장 강한 기록입니다.' },
              { q: '사진이 너무 많아요. 어떻게 줄이죠?', a: '"대표 3장" 규칙을 사용하세요. 많으면 기록이 아니라 창고가 됩니다.' },
              { q: "타임라인이 뭐가 'SNS'랑 달라요?", a: '싸움/댓글보다, 여행 흐름 자체가 중심이 되는 기록 방식이라는 게 다릅니다.' },
              { q: '기록을 공유하면 뭐가 좋아요?', a: '친구에게 설명이 쉬워지고, 다른 여행자에겐 실전 팁이 됩니다.' },
              { q: '기록이 쌓이면 어떤 가치가 생기나요?', a: '나만의 여행 취향이 선명해져서 다음 여행 선택이 빨라집니다.' },
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
      <section className="py-16 bg-purple-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 바로 시작하기</h2>
          <p className="text-xl text-purple-100 mb-8">
            여행이 끝난 사람도 가능합니다.<br />
            최근 여행 하나를 골라서, 대표 사진 3장 + 한 줄 메모만 넣어보세요.<br />
            그게 타임라인의 첫 페이지입니다.
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              내 타임라인 만들기
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
