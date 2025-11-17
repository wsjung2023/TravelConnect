import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock, Navigation, X } from 'lucide-react';

export interface MiniPlan {
  id: number;
  title: string;
  summary: string;
  estimatedDurationMin: number;
  estimatedDistanceM: number;
  tags: string[];
  spots: MiniPlanSpot[];
}

export interface MiniPlanSpot {
  id: number;
  miniPlanId: number;
  orderIndex: number;
  poiId: string | null;
  name: string;
  latitude: string;
  longitude: string;
  stayMin: number;
  metaJson: {
    reason?: string;
    recommendedMenu?: string;
    priceRange?: string;
    photoHint?: string;
    expectedPrice?: number;
  };
}

interface MiniPlanCardsViewProps {
  plans: MiniPlan[];
  onSelectPlan: (plan: MiniPlan) => void;
  onClose: () => void;
}

export function MiniPlanCardsView({ plans, onSelectPlan, onClose }: MiniPlanCardsViewProps) {
  const { t } = useTranslation();

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 flex items-center justify-center p-4" data-testid="view-mini-plan-cards">
      <div className="bg-white dark:bg-gray-900 rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">{t('miniConcierge.cardsView.title')}</h2>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            data-testid="button-close-cards"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          {plans.map((plan, index) => (
            <Card
              key={plan.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => onSelectPlan(plan)}
              data-testid={`card-plan-${index}`}
            >
              <CardHeader>
                <CardTitle className="text-lg">{plan.title}</CardTitle>
                <CardDescription className="text-sm line-clamp-2">
                  {plan.summary}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Clock className="h-4 w-4" />
                    <span>{plan.estimatedDurationMin}{t('miniConcierge.cardsView.minutes')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                    <Navigation className="h-4 w-4" />
                    <span>{Math.round(plan.estimatedDistanceM)}m</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {plan.tags.slice(0, 3).map((tag, idx) => (
                      <Badge key={idx} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <div className="pt-2 space-y-1">
                    {plan.spots.map((spot, idx) => (
                      <div key={spot.id} className="text-xs text-gray-700 dark:text-gray-300">
                        {idx + 1}. {spot.name} ({spot.stayMin}{t('miniConcierge.cardsView.min')})
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {plans.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            {t('miniConcierge.cardsView.noPlans')}
          </div>
        )}
      </div>
    </div>
  );
}
