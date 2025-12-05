import { Link } from 'wouter';
import { Shield, FileText, MapPin, Cookie, Code, Receipt } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { href: '/legal/privacy', label: '개인정보처리방침', icon: Shield },
    { href: '/legal/terms', label: '이용약관', icon: FileText },
    { href: '/legal/refund', label: '환불정책', icon: Receipt },
    { href: '/legal/location', label: '위치약관', icon: MapPin },
    { href: '/legal/cookies', label: '쿠키정책', icon: Cookie },
    { href: '/legal/oss', label: '오픈소스', icon: Code },
  ];

  return (
    <footer className="bg-gradient-to-b from-white to-[hsl(30,20%,97%)] dark:from-gray-800 dark:to-gray-900 border-t border-[hsl(30,15%,88%)] dark:border-gray-700 shadow-[0_-4px_12px_rgba(92,58,110,0.06)]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-bold text-xl bg-gradient-to-r from-[hsl(280,33%,40%)] to-[hsl(280,40%,50%)] bg-clip-text text-transparent dark:text-white mb-4">
              Tourgether
            </h3>
            <p className="text-[hsl(280,15%,40%)] dark:text-gray-400 text-sm leading-relaxed">
              현지인과 함께하는 특별한 여행 경험을 만들어보세요. 
              진정한 여행의 즐거움을 발견하세요.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-[hsl(280,25%,25%)] dark:text-white mb-4">
              법적 고지
            </h4>
            <ul className="space-y-2.5">
              {legalLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link 
                    href={href}
                    className="flex items-center gap-2 text-sm text-[hsl(280,15%,40%)] dark:text-gray-400 hover:text-[hsl(280,33%,40%)] dark:hover:text-[hsl(7,85%,72%)] transition-all duration-200 group"
                    data-testid={`link-footer-${href.split('/').pop()}`}
                  >
                    <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-[hsl(280,25%,25%)] dark:text-white mb-4">
              연락처
            </h4>
            <div className="space-y-2 text-sm text-[hsl(280,15%,40%)] dark:text-gray-400">
              <p className="hover:text-[hsl(280,33%,40%)] transition-colors">이메일: contact@tourgether.com</p>
              <p className="hover:text-[hsl(280,33%,40%)] transition-colors">고객지원: support@tourgether.com</p>
              <p className="hover:text-[hsl(280,33%,40%)] transition-colors">개인정보: privacy@tourgether.com</p>
            </div>
          </div>
        </div>

        <div className="border-t border-[hsl(30,15%,88%)] dark:border-gray-700 mt-10 pt-8">
          <div className="bg-gray-50 dark:bg-gray-800/50 rounded-lg p-4 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs text-[hsl(280,15%,45%)] dark:text-gray-400">
              <div className="space-y-1">
                <p><span className="font-medium">상호명:</span> 투게더 주식회사</p>
                <p><span className="font-medium">대표:</span> 홍길동</p>
                <p><span className="font-medium">사업자등록번호:</span> 000-00-00000</p>
                <p><span className="font-medium">통신판매업신고:</span> 제0000-서울강남-0000호</p>
              </div>
              <div className="space-y-1">
                <p><span className="font-medium">주소:</span> 서울특별시 강남구 테헤란로 000, 0층</p>
                <p><span className="font-medium">고객센터:</span> 1234-5678 (평일 09:00~18:00)</p>
                <p><span className="font-medium">이메일:</span> support@tourgether.com</p>
              </div>
            </div>
            <p className="text-xs text-[hsl(280,10%,55%)] dark:text-gray-500 mt-4 border-t border-[hsl(30,15%,90%)] dark:border-gray-700 pt-3">
              투게더는 통신판매중개자로서 거래 당사자가 아니며, 로컬가이드가 등록한 서비스 정보 및 거래에 대한 책임은 해당 로컬가이드에게 있습니다.
            </p>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[hsl(280,15%,45%)] dark:text-gray-400 font-medium">
              © {currentYear} Tourgether. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-[hsl(280,10%,50%)] dark:text-gray-500">
              <Link 
                href="/legal"
                className="hover:text-[hsl(280,33%,40%)] dark:hover:text-gray-300 transition-colors font-medium"
                data-testid="link-footer-legal"
              >
                법적 고지
              </Link>
              <span className="text-[hsl(30,15%,80%)]">|</span>
              <Link 
                href="/legal/refund"
                className="hover:text-[hsl(280,33%,40%)] dark:hover:text-gray-300 transition-colors font-medium"
                data-testid="link-footer-refund-policy"
              >
                환불정책
              </Link>
              <span className="text-[hsl(30,15%,80%)]">|</span>
              <a 
                href="mailto:legal@tourgether.com"
                className="hover:text-[hsl(280,33%,40%)] dark:hover:text-gray-300 transition-colors font-medium"
              >
                법무팀 문의
              </a>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
