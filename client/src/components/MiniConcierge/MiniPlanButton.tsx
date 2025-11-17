import { Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslation } from 'react-i18next';

interface MiniPlanButtonProps {
  onClick: () => void;
  disabled?: boolean;
}

export function MiniPlanButton({ onClick, disabled }: MiniPlanButtonProps) {
  const { t } = useTranslation('ui');

  return (
    <Button
      onClick={onClick}
      disabled={disabled}
      className="fixed bottom-24 right-4 z-[1000] h-14 rounded-full px-6 shadow-lg bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white font-semibold"
      data-testid="button-mini-plan-fab"
    >
      <Sparkles className="mr-2 h-5 w-5" />
      {t('miniConcierge.fabButton')}
    </Button>
  );
}
