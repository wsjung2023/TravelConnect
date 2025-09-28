import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { User, MapPin, Star, Calendar, Languages, Clock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { apiRequest } from '@/lib/queryClient';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

type UserType = 'traveler' | 'influencer' | 'host';

interface OnboardingData {
  userType: UserType;
  interests: string[];
  languages: string[];
  timezone: string;
}

const USER_TYPE_CONFIGS = {
  traveler: {
    icon: MapPin,
    titleKey: 'onboarding.userTypes.traveler.title',
    descriptionKey: 'onboarding.userTypes.traveler.description',
    features: ['onboarding.userTypes.traveler.feature1', 'onboarding.userTypes.traveler.feature2', 'onboarding.userTypes.traveler.feature3']
  },
  influencer: {
    icon: Star,
    titleKey: 'onboarding.userTypes.influencer.title',
    descriptionKey: 'onboarding.userTypes.influencer.description',
    features: ['onboarding.userTypes.influencer.feature1', 'onboarding.userTypes.influencer.feature2', 'onboarding.userTypes.influencer.feature3']
  },
  host: {
    icon: Calendar,
    titleKey: 'onboarding.userTypes.host.title',
    descriptionKey: 'onboarding.userTypes.host.description',
    features: ['onboarding.userTypes.host.feature1', 'onboarding.userTypes.host.feature2', 'onboarding.userTypes.host.feature3']
  }
};

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

const TIMEZONE_OPTIONS = [
  { value: 'Asia/Seoul', label: 'Seoul (KST)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'America/New_York', label: 'New York (EST)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' }
];

export function OnboardingModal({ isOpen, onClose, onComplete }: OnboardingModalProps) {
  const { t } = useTranslation(['ui', 'common']);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState<OnboardingData>({
    userType: 'traveler',
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
        title: t('common:success.updated'),
        description: t('onboarding.successMessage')
      });
      onComplete();
      onClose();
    },
    onError: (error: Error) => {
      toast({
        title: t('common:error.generic'),
        description: error.message,
        variant: 'destructive'
      });
    }
  });

  const handleUserTypeSelect = (userType: UserType) => {
    setFormData({ ...formData, userType });
    setStep(2);
  };

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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold" data-testid="onboarding-title">
            {t('onboarding.title')}
          </CardTitle>
          <CardDescription>
            {step === 1 && t('onboarding.step1Description')}
            {step === 2 && t('onboarding.step2Description')}
            {step === 3 && t('onboarding.step3Description')}
          </CardDescription>
          <div className="flex justify-center space-x-2 mt-4">
            {[1, 2, 3].map(i => (
              <div
                key={i}
                className={`w-2 h-2 rounded-full ${i <= step ? 'bg-primary' : 'bg-gray-300'}`}
              />
            ))}
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <div className="space-y-4" data-testid="user-type-selection">
              <h3 className="text-lg font-semibold text-center mb-6">
                {t('onboarding.selectUserType')}
              </h3>
              <div className="grid gap-4">
                {(Object.keys(USER_TYPE_CONFIGS) as UserType[]).map(userType => {
                  const config = USER_TYPE_CONFIGS[userType];
                  const Icon = config.icon;
                  return (
                    <Card
                      key={userType}
                      className={`cursor-pointer transition-all hover:ring-2 hover:ring-primary ${
                        formData.userType === userType ? 'ring-2 ring-primary bg-primary/5' : ''
                      }`}
                      onClick={() => handleUserTypeSelect(userType)}
                      data-testid={`user-type-${userType}`}
                    >
                      <CardContent className="p-6">
                        <div className="flex items-start space-x-4">
                          <Icon className="w-8 h-8 text-primary mt-1" />
                          <div className="flex-1">
                            <h4 className="font-semibold text-lg">
                              {t(config.titleKey)}
                            </h4>
                            <p className="text-muted-foreground mt-1">
                              {t(config.descriptionKey)}
                            </p>
                            <ul className="mt-3 space-y-1">
                              {config.features.map((featureKey, index) => (
                                <li key={index} className="text-sm text-muted-foreground flex items-center">
                                  <span className="w-1 h-1 bg-primary rounded-full mr-2" />
                                  {t(featureKey)}
                                </li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6" data-testid="interests-selection">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Star className="w-5 h-5 mr-2" />
                  {t('onboarding.selectInterests')}
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

              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Languages className="w-5 h-5 mr-2" />
                  {t('onboarding.selectLanguages')}
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

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} data-testid="button-back">
                  {t('common:app.back')}
                </Button>
                <Button onClick={() => setStep(3)} data-testid="button-next">
                  {t('common:app.next')}
                </Button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6" data-testid="timezone-selection">
              <div>
                <h3 className="text-lg font-semibold mb-4 flex items-center">
                  <Clock className="w-5 h-5 mr-2" />
                  {t('onboarding.selectTimezone')}
                </h3>
                <div className="grid gap-2">
                  {TIMEZONE_OPTIONS.map(timezone => (
                    <Button
                      key={timezone.value}
                      variant={formData.timezone === timezone.value ? 'default' : 'outline'}
                      className="justify-start"
                      onClick={() => setFormData({ ...formData, timezone: timezone.value })}
                      data-testid={`timezone-${timezone.value}`}
                    >
                      {timezone.label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="bg-muted p-4 rounded-lg">
                <h4 className="font-semibold mb-2">{t('onboarding.summary')}</h4>
                <div className="space-y-2 text-sm">
                  <p><strong>{t('onboarding.userType')}:</strong> {t(USER_TYPE_CONFIGS[formData.userType].titleKey)}</p>
                  <p><strong>{t('onboarding.interests')}:</strong> {formData.interests.map(i => t(`themes.${i}`)).join(', ')}</p>
                  <p><strong>{t('onboarding.languages')}:</strong> {formData.languages.map(l => LANGUAGE_OPTIONS.find(lo => lo.code === l)?.name).join(', ')}</p>
                  <p><strong>{t('onboarding.timezone')}:</strong> {TIMEZONE_OPTIONS.find(tz => tz.value === formData.timezone)?.label}</p>
                </div>
              </div>

              <div className="flex justify-between">
                <Button variant="outline" onClick={() => setStep(2)} data-testid="button-back">
                  {t('common:app.back')}
                </Button>
                <Button 
                  onClick={handleComplete} 
                  disabled={updateOnboardingMutation.isPending}
                  data-testid="button-complete"
                >
                  {updateOnboardingMutation.isPending 
                    ? t('common:app.loading') 
                    : t('onboarding.complete')
                  }
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}