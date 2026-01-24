import { Link } from 'wouter';

export default function Footer() {
  const currentYear = new Date().getFullYear();

  const legalLinks = [
    { href: '/legal/privacy', label: 'Privacy' },
    { href: '/legal/terms', label: 'Terms' },
    { href: '/legal/refund', label: 'Refunds' },
    { href: '/legal/oss', label: 'Open Source' },
  ];

  return (
    <footer className="bg-[#f8f7f4] border-t border-gray-200">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-gray-800">Tourgether</span>
            <span className="text-gray-400 text-sm">© {currentYear}</span>
          </div>
          
          <div className="flex flex-wrap justify-center gap-4 text-sm text-gray-500">
            {legalLinks.map(({ href, label }) => (
              <Link 
                key={href}
                href={href}
                className="hover:text-gray-800 transition-colors"
                data-testid={`link-footer-${href.split('/').pop()}`}
              >
                {label}
              </Link>
            ))}
            <a 
              href="mailto:support@tourgether.com"
              className="hover:text-gray-800 transition-colors"
            >
              Contact
            </a>
          </div>
        </div>
        
        <div className="mt-6 pt-4 border-t border-gray-200 text-center text-xs text-gray-400 space-y-1">
          <p>발렌시아 | 사업자등록번호: 124-51-71915 | 통신판매업: 제2014-서울강남-03505호</p>
          <p className="text-gray-300">투게더는 통신판매중개자로서 거래 당사자가 아닙니다.</p>
        </div>
      </div>
    </footer>
  );
}
