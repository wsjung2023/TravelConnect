import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import { Link } from 'wouter';
import { Users, Shield, Calendar, ArrowRight } from 'lucide-react';

// 여행 동행 찾기 랜딩페이지
export default function TravelMate() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "동행은 위험하지 않나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "위험 요소가 있어서 '신뢰 장치'가 필수입니다. 인증/신고/차단/리뷰 구조 없이 동행은 하면 안 됩니다."
        }
      },
      {
        "@type": "Question",
        "name": "개인 정보는 얼마나 공개해야 해요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "최소 공개 + 신뢰 레벨 공개가 현실적입니다. 이름/번호 공개 강요는 위험합니다."
        }
      },
      {
        "@type": "Question",
        "name": "동행은 어떤 기준으로 매칭되나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "취향(목적) + 일정 + 지역이 1순위입니다. 그 다음이 나이대/성향 같은 보조 요소입니다."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title="여행 동행 찾기 | 투어게더 Tourgether"
        description="혼자 여행도 좋지만, 함께라서 더 안전하고 즐거울 때가 있어요. 여행 동행을 취향과 일정 기반으로 만나보세요."
        canonicalPath="/travel-mate"
        ogTitle="여행 동행, 안전하게 — 투어게더"
        ogDescription="취향·일정·지역 기반으로 가볍게 연결되는 여행 동행."
        keywords="여행 동행, 여행 메이트, 여행 친구 찾기, 동행 구하기, 여행 파트너"
        jsonLd={faqJsonLd}
      />

      {/* 히어로 */}
      <header className="bg-gradient-to-br from-pink-500 to-rose-600 text-white">
        <nav className="max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-pink-600 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              시작하기
            </button>
          </Link>
        </nav>
        
        <div className="max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            혼자도 좋지만,<br />
            <span className="text-yellow-300">함께라서 더 빛나는 여행이 있어요.</span>
          </h1>
          <p className="text-xl text-pink-100 mb-8 max-w-2xl mx-auto">
            여행 동행은 설렘이면서 동시에 걱정입니다.
            "괜찮은 사람일까?" "안전할까?"
            그래서 여행 동행은 아무 SNS처럼 하면 안 됩니다.
            투어게더는 만남을 '여행 맥락(일정/지역/취향)' 위에 올려둡니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition flex items-center justify-center gap-2">
                여행 동행 찾기 <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/safety">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                안전 가이드 보기
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 동행이 필요한 순간 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">여행 동행이 필요한 순간</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: '🌙', text: '혼자 가기엔 무서운 야간 이동' },
              { icon: '🍽️', text: '맛집/체험/투어를 함께하고 싶은데 혼자 예약이 애매할 때' },
              { icon: '📸', text: '사진을 서로 찍어주고 싶은데 매번 부탁하기 어려울 때' },
              { icon: '☕', text: "여행 취향이 맞는 사람과 '가벼운 동행'만 하고 싶을 때" },
            ].map((item, i) => (
              <div key={i} className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-4xl mb-4">{item.icon}</div>
                <p className="text-gray-700">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 좋은 동행 조건 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">좋은 동행을 만드는 조건 (현실 체크)</h2>
          <div className="space-y-6">
            <div className="flex items-start gap-4 bg-pink-50 p-6 rounded-xl">
              <Users className="w-8 h-8 text-pink-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">목적이 맞아야 한다</h3>
                <p className="text-gray-600">맛집/사진/쇼핑/힐링/액티비티</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-pink-50 p-6 rounded-xl">
              <Calendar className="w-8 h-8 text-pink-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">시간이 겹쳐야 한다</h3>
                <p className="text-gray-600">같은 날짜/같은 구간</p>
              </div>
            </div>
            <div className="flex items-start gap-4 bg-pink-50 p-6 rounded-xl">
              <Shield className="w-8 h-8 text-pink-600 flex-shrink-0" />
              <div>
                <h3 className="text-xl font-bold mb-1">안전 장치가 있어야 한다</h3>
                <p className="text-gray-600">신뢰/차단/신고/인증</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 투어게더 방식 */}
      <section className="py-16 bg-pink-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더가 지향하는 동행 방식</h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium">"평생 친구 찾기"가 아니라, <strong>여행 구간 단위의 가벼운 동행</strong></p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium">지나치게 개인 정보를 요구하지 않되, <strong>신뢰 레벨</strong>은 명확하게</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium">채팅이 목적이 아니라, <strong>여행 경험(코스/장소/체험)</strong>이 중심</p>
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
              { q: '동행은 위험하지 않나요?', a: "위험 요소가 있어서 '신뢰 장치'가 필수입니다. 인증/신고/차단/리뷰 구조 없이 동행은 하면 안 됩니다." },
              { q: '개인 정보는 얼마나 공개해야 해요?', a: '최소 공개 + 신뢰 레벨 공개가 현실적입니다. 이름/번호 공개 강요는 위험합니다.' },
              { q: '동행은 어떤 기준으로 매칭되나요?', a: '취향(목적) + 일정 + 지역이 1순위입니다. 그 다음이 나이대/성향 같은 보조 요소입니다.' },
              { q: '잠깐만 같이 움직이고 헤어질 수도 있나요?', a: '그게 가장 현실적이고 안전합니다. "한 구간 동행"이 베스트입니다.' },
              { q: '사기/문제 행동은 어떻게 막아요?', a: '신뢰 레벨, 신고/차단, 반복 패턴 감지 같은 시스템이 필요합니다.' },
              { q: '동행이 진짜 도움이 되는 경우는?', a: "혼자 가기 애매한 액티비티/야간 이동/특정 맛집 줄 서기 같은 순간에 '짧게' 붙을 때입니다." },
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
      <section className="py-16 bg-pink-600 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 바로 동행 찾기</h2>
          <p className="text-xl text-pink-100 mb-8">
            당신의 여행이 더 안전하고, 더 웃기고, 더 영화 같아지려면.<br />
            동행은 선택이 아니라 옵션이 될 수 있습니다.
          </p>
          <Link href="/">
            <button className="bg-yellow-400 text-gray-900 px-8 py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition">
              내 여행 구간 등록하기
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
