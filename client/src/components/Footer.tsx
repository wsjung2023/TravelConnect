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
    <footer className="bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* 브랜드 정보 */}
          <div>
            <h3 className="font-bold text-lg text-gray-900 dark:text-white mb-3">
              Tourgether
            </h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed">
              현지인과 함께하는 특별한 여행 경험을 만들어보세요. 
              진정한 여행의 즐거움을 발견하세요.
            </p>
          </div>

          {/* 법적 고지 링크 */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              법적 고지
            </h4>
            <ul className="space-y-2">
              {legalLinks.map(({ href, label, icon: Icon }) => (
                <li key={href}>
                  <Link 
                    href={href}
                    className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    <Icon className="w-3 h-3" />
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 연락처 */}
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white mb-3">
              연락처
            </h4>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <p>이메일: contact@tourgether.com</p>
              <p>고객지원: support@tourgether.com</p>
              <p>개인정보: privacy@tourgether.com</p>
            </div>
          </div>
        </div>

        {/* 하단 구분선 및 저작권 */}
        <div className="border-t border-gray-200 dark:border-gray-700 mt-8 pt-6">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {currentYear} Tourgether. All rights reserved.
            </p>
            <div className="flex gap-4 text-xs text-gray-500 dark:text-gray-500">
              <Link 
                href="/legal"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
              >
                법적 고지
              </Link>
              <span>|</span>
              <a 
                href="mailto:legal@tourgether.com"
                className="hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
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