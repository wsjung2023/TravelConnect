import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Star, Languages, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/queryClient';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

interface OnboardingData {
  interests: string[];
  languages: string[];
  timezone: string;
}

const INTEREST_OPTIONS = [
  'food', 'shopping', 'culture', 'nightlife', 'nature', 'adventure',
  'photography', 'history', 'art', 'music', 'sports', 'wellness'
];

const LANGUAGE_OPTIONS = [
  { code: 'ko', name: '한국어' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'zh', name: '中文' },
  { code: 'fr', name: 'Français' },
  { code: 'es', name: 'Español' }
];

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation(['ui', 'common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<OnboardingData>({
    interests: [],
    languages: ['ko'],
    timezone: 'Asia/Seoul'
  });

  const updateOnboardingMutation = useMutation({
    mutationFn: async (data: OnboardingData) => {
      return apiRequest('/api/auth/onboarding', {
        method: 'POST',
        body: JSON.stringify(data)
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      toast({
        title: '설정 완료',
        description: '환영합니다! 투어게더를 시작해보세요.'
      });
      onComplete();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: '오류 발생',
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleInterestToggle = (interest: string) => {
    const newInterests = formData.interests.includes(interest)
      ? formData.interests.filter(i => i !== interest)
      : [...formData.interests, interest];
    setFormData({ ...formData, interests: newInterests });
  };

  const handleLanguageToggle = (language: string) => {
    const newLanguages = formData.languages.includes(language)
      ? formData.languages.filter(l => l !== language)
      : [...formData.languages, language];
    setFormData({ ...formData, languages: newLanguages });
  };

  const handleComplete = () => {
    updateOnboardingMutation.mutate(formData);
  };

  const handleSkip = () => {
    // 최소한의 데이터로 온보딩 완료
    updateOnboardingMutation.mutate({
      interests: [],
      languages: ['ko'],
      timezone: 'Asia/Seoul'
    });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center relative">
          <Button
            variant="ghost"
            size="sm"
            className="absolute right-2 top-2"
            onClick={handleSkip}
            data-testid="button-skip"
          >
            <X className="w-4 h-4 mr-1" />
            건너뛰기
          </Button>
          <CardTitle className="text-2xl font-bold" data-testid="onboarding-title">
            투어게더에 오신 것을 환영합니다!
          </CardTitle>
          <CardDescription>
            관심사와 언어를 설정하면 더 맞춤화된 경험을 제공해드려요 (선택사항)
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-6">
          {/* 관심사 선택 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Star className="w-5 h-5 mr-2" />
              관심사 (선택사항)
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {INTEREST_OPTIONS.map(interest => (
                <Button
                  key={interest}
                  variant={formData.interests.includes(interest) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleInterestToggle(interest)}
                  data-testid={`interest-${interest}`}
                  className="justify-start"
                >
                  {t(`themes.${interest}`)}
                </Button>
              ))}
            </div>
          </div>

          {/* 언어 선택 */}
          <div>
            <h3 className="text-lg font-semibold mb-4 flex items-center">
              <Languages className="w-5 h-5 mr-2" />
              구사 가능한 언어
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {LANGUAGE_OPTIONS.map(language => (
                <Button
                  key={language.code}
                  variant={formData.languages.includes(language.code) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleLanguageToggle(language.code)}
                  data-testid={`language-${language.code}`}
                  className="justify-start"
                >
                  {language.name}
                </Button>
              ))}
            </div>
          </div>

          {/* 완료 버튼 */}
          <div className="flex gap-3 pt-4">
            <Button
              variant="outline"
              onClick={handleSkip}
              className="flex-1"
              data-testid="button-skip-bottom"
            >
              나중에 설정하기
            </Button>
            <Button 
              onClick={handleComplete} 
              disabled={updateOnboardingMutation.isPending}
              className="flex-1"
              data-testid="button-complete"
            >
              {updateOnboardingMutation.isPending 
                ? '저장 중...' 
                : '완료'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
