import SeoHead from '@/components/seo/SeoHead';
import SeoFooter from '@/components/seo/SeoFooter';
import SeoNav from '@/components/seo/SeoNav';
import { Link } from 'wouter';
import { Shield, UserCheck, AlertTriangle, CheckCircle, ArrowRight } from 'lucide-react';

// 안전/신뢰 랜딩페이지
export default function Safety() {
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "신뢰 레벨이 왜 필요해요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "여행은 낯선 환경이라 기본 정보만으로는 부족합니다. 최소한 '신뢰 단계'가 있어야 선택이 쉬워집니다."
        }
      },
      {
        "@type": "Question",
        "name": "개인정보를 많이 요구하면 사용자들이 싫어하지 않나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "그래서 단계형이 답입니다. 처음부터 다 요구하면 이탈하고, 아무것도 없으면 위험합니다."
        }
      },
      {
        "@type": "Question",
        "name": "신고/차단은 정말 효과가 있나요?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "운영 정책과 빠른 처리, 반복 패턴 감지가 붙으면 효과가 커집니다."
        }
      }
    ]
  };

  return (
    <div className="min-h-screen bg-white">
      <SeoHead
        title="여행 안전 가이드 | 투어게더 Tourgether 신뢰 시스템"
        description="낯선 여행지에서도 안전하게. 투어게더의 신뢰 레벨, 신고/차단, 만남 가이드로 불안은 줄이고 설렘은 키우세요."
        canonicalPath="/safety"
        ogTitle="안전이 있어야 설렘이 산다 — 투어게더"
        ogDescription="신뢰 레벨과 안전 가이드로 여행 만남을 더 확실하게."
        keywords="여행 안전, 동행 안전, 여행 만남 안전, 신뢰 시스템, 안전 가이드"
        jsonLd={faqJsonLd}
      />
      <SeoNav />

      {/* 히어로 */}
      <header className="relative bg-gradient-to-br from-slate-700 to-slate-900 text-white overflow-hidden">
        <div 
          className="absolute inset-0 opacity-30 bg-cover bg-center"
          style={{ backgroundImage: `url('/seo-hero/safety.png')` }}
        />
        <nav className="relative max-w-6xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link href="/">
            <span className="text-2xl font-bold">Tourgether</span>
          </Link>
          <Link href="/">
            <button className="bg-white text-slate-800 px-4 py-2 rounded-lg font-medium hover:bg-gray-100 transition">
              시작하기
            </button>
          </Link>
        </nav>
        
        <div className="relative max-w-4xl mx-auto px-4 py-20 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
            안전이 있어야,<br />
            <span className="text-emerald-400">여행의 설렘이 '진짜'가 됩니다.</span>
          </h1>
          <p className="text-xl text-slate-300 mb-8 max-w-2xl mx-auto">
            여행 서비스에서 "만남/거래/추천"이 들어가면,
            안전은 기능이 아니라 기본값이 되어야 합니다.
            투어게더는 "일단 만나고 보자"가 아니라,
            신뢰 레벨을 쌓고, 위험은 줄이고, 선택권은 사용자가 쥐는 구조를 지향합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/">
              <button className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition flex items-center justify-center gap-2">
                안전 가이드 보기 <ArrowRight className="w-5 h-5" />
              </button>
            </Link>
            <Link href="/travel-mate">
              <button className="border-2 border-white text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition">
                여행 동행 찾기
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* 안전 원칙 */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">투어게더가 지향하는 안전 원칙</h2>
          <div className="space-y-4">
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
              <p className="text-gray-700"><strong>최소 정보로 시작</strong>하되, 필요한 순간엔 신뢰 증거를 쌓을 수 있게</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
              <p className="text-gray-700">불쾌/위험한 행동에 대해 <strong>차단/신고/제재</strong>가 즉시 가능</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm flex items-start gap-4">
              <CheckCircle className="w-6 h-6 text-emerald-500 flex-shrink-0 mt-1" />
              <p className="text-gray-700">사용자가 통제할 수 있는 <strong>공개 범위(공개/친구/비공개)</strong></p>
            </div>
          </div>
        </div>
      </section>

      {/* 신뢰 레벨 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-4">신뢰 레벨(예시)</h2>
          <p className="text-center text-gray-600 mb-12">'사람을 점수로만' 보지 않기 — 신뢰는 단순 별점이 아니라, 행동의 누적입니다.</p>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-slate-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-slate-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-6 h-6 text-slate-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">기본 레벨</h3>
              <p className="text-gray-600 text-sm">이메일/소셜 로그인</p>
            </div>
            <div className="bg-blue-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-blue-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserCheck className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">중간 레벨</h3>
              <p className="text-gray-600 text-sm">휴대폰 인증, 간단 프로필</p>
            </div>
            <div className="bg-emerald-50 p-6 rounded-xl text-center">
              <div className="w-12 h-12 bg-emerald-200 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-emerald-600" />
              </div>
              <h3 className="font-bold text-lg mb-2">높은 레벨</h3>
              <p className="text-gray-600 text-sm">호스트/가이드 인증, 거래 이력, 긍정 상호작용 누적</p>
            </div>
          </div>
          <p className="text-center text-gray-500 mt-8 text-sm">핵심은 "강요"가 아니라 선택 가능한 단계로 제공하는 것입니다.</p>
        </div>
      </section>

      {/* 만남 안전 가이드 */}
      <section className="py-16 bg-emerald-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">만남/동행 안전 가이드 (현실 버전)</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 첫 만남은 <strong>공공장소</strong>
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 일정/장소를 <strong>친구에게 공유</strong>
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 밤 늦은 이동은 <strong>혼자 무리하지 않기</strong>
              </p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-sm">
              <p className="font-medium flex items-center gap-2">
                <span className="text-emerald-500">✓</span> 불편하면 바로 <strong>차단/신고</strong>
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 위험 신호 */}
      <section className="py-16">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12 flex items-center justify-center gap-2">
            <AlertTriangle className="w-8 h-8 text-red-500" />
            위험 신호 (레드 플래그)
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              '지나치게 개인 정보/즉시 만남을 요구',
              '장소를 상대가 일방적으로 지정',
              '돈/선입금을 과하게 요구',
              '플랫폼 밖으로 빠르게 유도',
            ].map((flag, i) => (
              <div key={i} className="bg-red-50 p-4 rounded-lg border-l-4 border-red-500">
                <p className="text-gray-800 font-medium">{flag}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold text-center mb-12">자주 묻는 질문</h2>
          <div className="space-y-4">
            {[
              { q: '신뢰 레벨이 왜 필요해요?', a: "여행은 낯선 환경이라 기본 정보만으로는 부족합니다. 최소한 '신뢰 단계'가 있어야 선택이 쉬워집니다." },
              { q: '개인정보를 많이 요구하면 사용자들이 싫어하지 않나요?', a: '그래서 단계형이 답입니다. 처음부터 다 요구하면 이탈하고, 아무것도 없으면 위험합니다.' },
              { q: '신고/차단은 정말 효과가 있나요?', a: '운영 정책과 빠른 처리, 반복 패턴 감지가 붙으면 효과가 커집니다.' },
              { q: '사기성 거래/대행은 어떻게 막아요?', a: '거래는 특히 증거/기록/에스크로/정책이 핵심입니다. MVP라도 최소한의 안전장치는 필요합니다.' },
              { q: '해외 사용자도 안전 시스템을 똑같이 적용할 수 있나요?', a: '원칙은 같고, 인증 수단만 국가별로 달라질 수 있습니다(휴대폰/ID/결제 등).' },
              { q: '안전 페이지가 SEO에 도움이 되나요?', a: '"여행 동행 안전" 같은 검색 의도가 확실한 키워드에 강합니다. 신뢰를 주는 페이지는 전환에도 도움입니다.' },
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
      <section className="py-16 bg-slate-800 text-white text-center">
        <div className="max-w-4xl mx-auto px-4">
          <h2 className="text-3xl font-bold mb-4">지금 투어게더를 안전하게 시작하기</h2>
          <p className="text-xl text-slate-300 mb-8">
            안전은 '겁이 많아서'가 아니라 '똑똑해서' 챙기는 겁니다.<br />
            처음 만남은 짧게, 공개 장소에서. 그것만 지켜도 리스크가 확 줄어듭니다.
          </p>
          <Link href="/">
            <button className="bg-emerald-500 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-emerald-600 transition">
              신뢰 레벨 확인하기
            </button>
          </Link>
        </div>
      </section>

      <SeoFooter />
    </div>
  );
}
