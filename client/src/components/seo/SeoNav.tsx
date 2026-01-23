import { Link } from 'wouter';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SeoNavProps {
  showBack?: boolean;
}

export default function SeoNav({ showBack = true }: SeoNavProps) {
  const { t } = useTranslation('ui');

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-4">
          {showBack && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">{t('seoNav.back', '뒤로가기')}</span>
            </Button>
          )}
          <Link href="/">
            <span className="text-xl font-bold text-blue-600">Tourgether</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/">
            <Button variant="ghost" size="sm" className="flex items-center gap-2">
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">{t('seoNav.home', '홈')}</span>
            </Button>
          </Link>
          <Link href="/">
            <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white">
              {t('seoNav.start', '시작하기')}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
