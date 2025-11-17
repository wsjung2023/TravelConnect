import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  X,
  MapPin,
  Clock,
  CheckCircle2,
  Circle,
  Navigation,
  Sparkles,
} from 'lucide-react';
import { MiniPlan, MiniPlanSpot } from './MiniPlanCardsView';

interface MiniPlanExecutionViewProps {
  plan: MiniPlan;
  currentSpotIndex: number;
  onCheckIn: (spotId: number) => void;
  onComplete: () => void;
  onClose: () => void;
  mapCenter: { lat: number; lng: number };
}

export function MiniPlanExecutionView({
  plan,
  currentSpotIndex,
  onCheckIn,
  onComplete,
  onClose,
  mapCenter,
}: MiniPlanExecutionViewProps) {
  const { t } = useTranslation('ui');
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const newProgress = ((currentSpotIndex + 1) / plan.spots.length) * 100;
    setProgress(newProgress);
  }, [currentSpotIndex, plan.spots.length]);

  const currentSpot = plan.spots[currentSpotIndex];
  const isLastSpot = currentSpotIndex === plan.spots.length - 1;

  const getDirectionsUrl = (spot: MiniPlanSpot) => {
    return `https://www.google.com/maps/dir/?api=1&origin=${mapCenter.lat},${mapCenter.lng}&destination=${spot.latitude},${spot.longitude}&travelmode=walking`;
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-[2000] bg-white dark:bg-gray-900 rounded-t-3xl shadow-2xl max-h-[70vh] overflow-y-auto" data-testid="view-mini-plan-execution">
      <div className="sticky top-0 bg-white dark:bg-gray-900 border-b p-4 flex justify-between items-center">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-5 w-5 text-purple-600" />
            <h2 className="text-lg font-bold">{plan.title}</h2>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          data-testid="button-close-execution"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="p-4 space-y-4">
        <div className="space-y-2">
          {plan.spots.map((spot, index) => {
            const isCompleted = index < currentSpotIndex;
            const isCurrent = index === currentSpotIndex;
            
            return (
              <Card
                key={spot.id}
                className={`${isCurrent ? 'border-purple-600 border-2' : ''} ${
                  isCompleted ? 'opacity-60' : ''
                }`}
                data-testid={`spot-card-${index}`}
              >
                <CardContent className="p-4">
                  <div className="flex gap-3">
                    <div className="flex-shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : isCurrent ? (
                        <Circle className="h-6 w-6 text-purple-600 fill-purple-100" />
                      ) : (
                        <Circle className="h-6 w-6 text-gray-300" />
                      )}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold">{spot.name}</span>
                        <Badge variant="secondary" className="text-xs">
                          {spot.stayMin}{t('miniConcierge.execution.min')}
                        </Badge>
                      </div>
                      {spot.metaJson?.reason && (
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {spot.metaJson.reason}
                        </p>
                      )}
                      {spot.metaJson?.recommendedMenu && (
                        <div className="text-xs text-gray-500 mb-1">
                          {t('miniConcierge.execution.recommended')}: {spot.metaJson.recommendedMenu}
                        </div>
                      )}
                      {spot.metaJson?.photoHint && (
                        <div className="text-xs text-gray-500 mb-1">
                          {t('miniConcierge.execution.photoHint')}: {spot.metaJson.photoHint}
                        </div>
                      )}
                      {spot.metaJson?.priceRange && (
                        <div className="text-xs text-gray-500">
                          {t('miniConcierge.execution.priceRange')}: {spot.metaJson.priceRange}
                        </div>
                      )}
                      {isCurrent && (
                        <div className="flex gap-2 mt-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => window.open(getDirectionsUrl(spot), '_blank')}
                            data-testid={`button-navigate-${index}`}
                          >
                            <Navigation className="h-4 w-4 mr-1" />
                            {t('miniConcierge.execution.navigate')}
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => onCheckIn(spot.id)}
                            data-testid={`button-checkin-${index}`}
                          >
                            <MapPin className="h-4 w-4 mr-1" />
                            {t('miniConcierge.execution.checkIn')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {currentSpotIndex >= plan.spots.length && (
          <Card className="border-green-600 border-2 bg-green-50 dark:bg-green-900/20">
            <CardContent className="p-4 text-center">
              <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-2" />
              <h3 className="font-bold text-lg mb-1">{t('miniConcierge.execution.completed')}</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                {t('miniConcierge.execution.completedMessage')}
              </p>
              <Button
                onClick={onComplete}
                className="w-full"
                data-testid="button-complete-plan"
              >
                {t('miniConcierge.execution.finish')}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
