import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';

interface Language {
  code: string;
  name: string;
  flag: string;
}

const languages: Language[] = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'ko', name: '한국어', flag: '🇰🇷' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
];

interface LanguageSwitcherProps {
  floating?: boolean;
}

export function LanguageSwitcher({ floating = false }: LanguageSwitcherProps) {
  const { i18n } = useTranslation();
  const [isChanging, setIsChanging] = useState(false);

  const handleLanguageChange = async (languageCode: string) => {
    if (languageCode === i18n.language) return;
    
    setIsChanging(true);
    try {
      await i18n.changeLanguage(languageCode);
      // 사용자 선택을 localStorage에 저장
      localStorage.setItem('i18nextLng', languageCode);
    } catch (error) {
      console.error('Failed to change language:', error);
    } finally {
      setIsChanging(false);
    }
  };

  const currentLanguage: Language = languages.find(lang => lang.code === i18n.language) ?? languages[0];

  // 플로팅 스타일 (화면 우측 하단 고정)
  if (floating) {
    return (
      <div className="fixed bottom-20 right-4 z-50" data-testid="floating-language-switcher">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="default"
              className="h-10 px-3 rounded-full shadow-lg bg-white hover:bg-gray-50 border border-gray-200 flex items-center gap-2"
              title={`Current language: ${currentLanguage.name}`}
              data-testid="button-floating-language"
              disabled={isChanging}
            >
              {isChanging ? (
                <Globe className="h-4 w-4 text-gray-600 animate-spin" />
              ) : (
                <>
                  <Globe className="h-4 w-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">{currentLanguage.code.toUpperCase()}</span>
                </>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="top" className="mb-2">
            {languages.map((language) => (
              <DropdownMenuItem
                key={language.code}
                onClick={() => handleLanguageChange(language.code)}
                className={`cursor-pointer ${
                  i18n.language === language.code ? 'bg-gray-100' : ''
                }`}
                data-testid={`floating-language-option-${language.code}`}
              >
                <span className="mr-2">{language.flag}</span>
                {language.name}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    );
  }

  // 기본 스타일 (헤더용)
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="p-1.5 sm:p-2 hover:bg-gray-100 rounded-full"
          title={`Current language: ${currentLanguage.name}`}
          data-testid="button-language-switcher"
          disabled={isChanging}
        >
          {isChanging ? (
            <Globe className="h-4 w-4 text-gray-600 animate-spin" />
          ) : (
            <span className="text-sm">{currentLanguage.flag}</span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {languages.map((language) => (
          <DropdownMenuItem
            key={language.code}
            onClick={() => handleLanguageChange(language.code)}
            className={`cursor-pointer ${
              i18n.language === language.code ? 'bg-gray-100' : ''
            }`}
            data-testid={`language-option-${language.code}`}
          >
            <span className="mr-2">{language.flag}</span>
            {language.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}