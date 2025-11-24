import { Link } from 'wouter';
import { Shield, FileText, MapPin, Cookie, Code } from 'lucide-react';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { href: '/legal/privacy', label: '개인정보처리방침', icon: Shield },
    { href: '/legal/terms', label: '이용약관', icon: FileText },
    { href: '/legal/location', label: '위치약관', icon: MapPin },
    { href: '/legal/cookies', label: '쿠키정책', icon: Cookie },
    { href: '/legal/oss', label: '오픈소스', icon: Code },
  ];

  return (
    <footer className="bg-gradient-to-b from-white to-[hsl(30,20%,97%)] dark:from-gray-800 dark:to-gray-900 border-t border-[hsl(30,15%,88%)] dark:border-gray-700 shadow-[0_-4px_12px_rgba(92,58,110,0.06)]">
      <div className="max-w-6xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 브랜드 정보 */}
          <div>
            <h3 className="font-bold text-xl bg-gradient-to-r from-[hsl(280,33%,40%)] to-[hsl(280,40%,50%)] bg-clip-text text-transparent dark:text-white mb-4">
              Tourgether
            </h3>
            <p className="text-[hsl(280,15%,40%)] dark:text-gray-400 text-sm leading-relaxed">
              현지인과 함께하는 특별한 여행 경험을 만들어보세요. 
              진정한 여행의 즐거움을 발견하세요.
            </p>
          </div>

          {/* 법적 고지 링크 */}
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
                  >
                    <Icon className="w-3.5 h-3.5 group-hover:scale-110 transition-transform" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 연락처 */}
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

        {/* 하단 구분선 및 저작권 */}
        <div className="border-t border-[hsl(30,15%,88%)] dark:border-gray-700 mt-10 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-[hsl(280,15%,45%)] dark:text-gray-400 font-medium">
              © {currentYear} Tourgether. All rights reserved.
            </p>
            <div className="flex gap-6 text-xs text-[hsl(280,10%,50%)] dark:text-gray-500">
              <Link 
                href="/legal"
                className="hover:text-[hsl(280,33%,40%)] dark:hover:text-gray-300 transition-colors font-medium"
              >
                법적 고지
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