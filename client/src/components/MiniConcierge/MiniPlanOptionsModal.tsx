import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export interface MiniPlanOptions {
  timeMinutes: number;
  budgetLevel: 'low' | 'mid' | 'high';
  mood: 'chill' | 'hip' | 'local_food' | 'photo' | 'anything';
  companions: 'solo' | 'couple' | 'friends' | 'family';
}

interface MiniPlanOptionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGenerate: (options: MiniPlanOptions) => void;
  isGenerating: boolean;
}

export function MiniPlanOptionsModal({
  isOpen,
  onClose,
  onGenerate,
  isGenerating,
}: MiniPlanOptionsModalProps) {
  const { t } = useTranslation();
  const [options, setOptions] = useState<MiniPlanOptions>({
    timeMinutes: 60,
    budgetLevel: 'mid',
    mood: 'anything',
    companions: 'solo',
  });

  const handleSubmit = () => {
    onGenerate(options);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md" data-testid="modal-mini-plan-options">
        <DialogHeader>
          <DialogTitle>{t('miniConcierge.optionsModal.title')}</DialogTitle>
          <DialogDescription>
            {t('miniConcierge.optionsModal.description')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="time">{t('miniConcierge.optionsModal.time')}</Label>
            <Select
              value={options.timeMinutes.toString()}
              onValueChange={(val) =>
                setOptions({ ...options, timeMinutes: parseInt(val) })
              }
            >
              <SelectTrigger id="time" data-testid="select-time">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="30">30{t('miniConcierge.optionsModal.minutes')}</SelectItem>
                <SelectItem value="60">60{t('miniConcierge.optionsModal.minutes')}</SelectItem>
                <SelectItem value="90">90{t('miniConcierge.optionsModal.minutes')}</SelectItem>
                <SelectItem value="120">120{t('miniConcierge.optionsModal.minutes')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="budget">{t('miniConcierge.optionsModal.budget')}</Label>
            <Select
              value={options.budgetLevel}
              onValueChange={(val: any) =>
                setOptions({ ...options, budgetLevel: val })
              }
            >
              <SelectTrigger id="budget" data-testid="select-budget">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">{t('miniConcierge.optionsModal.budgetLow')}</SelectItem>
                <SelectItem value="mid">{t('miniConcierge.optionsModal.budgetMid')}</SelectItem>
                <SelectItem value="high">{t('miniConcierge.optionsModal.budgetHigh')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="mood">{t('miniConcierge.optionsModal.mood')}</Label>
            <Select
              value={options.mood}
              onValueChange={(val: any) => setOptions({ ...options, mood: val })}
            >
              <SelectTrigger id="mood" data-testid="select-mood">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="anything">{t('miniConcierge.optionsModal.moodAnything')}</SelectItem>
                <SelectItem value="chill">{t('miniConcierge.optionsModal.moodChill')}</SelectItem>
                <SelectItem value="hip">{t('miniConcierge.optionsModal.moodHip')}</SelectItem>
                <SelectItem value="local_food">{t('miniConcierge.optionsModal.moodLocalFood')}</SelectItem>
                <SelectItem value="photo">{t('miniConcierge.optionsModal.moodPhoto')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="companions">{t('miniConcierge.optionsModal.companions')}</Label>
            <Select
              value={options.companions}
              onValueChange={(val: any) =>
                setOptions({ ...options, companions: val })
              }
            >
              <SelectTrigger id="companions" data-testid="select-companions">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="solo">{t('miniConcierge.optionsModal.companionsSolo')}</SelectItem>
                <SelectItem value="couple">{t('miniConcierge.optionsModal.companionsCouple')}</SelectItem>
                <SelectItem value="friends">{t('miniConcierge.optionsModal.companionsFriends')}</SelectItem>
                <SelectItem value="family">{t('miniConcierge.optionsModal.companionsFamily')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            className="flex-1"
            disabled={isGenerating}
            data-testid="button-cancel-options"
          >
            {t('miniConcierge.optionsModal.cancel')}
          </Button>
          <Button
            onClick={handleSubmit}
            className="flex-1"
            disabled={isGenerating}
            data-testid="button-generate-plans"
          >
            {isGenerating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {t('miniConcierge.optionsModal.generating')}
              </>
            ) : (
              t('miniConcierge.optionsModal.generate')
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
