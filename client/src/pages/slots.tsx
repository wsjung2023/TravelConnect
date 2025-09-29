import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useLocation } from 'wouter';
import SlotBrowser from '@/components/SlotBrowser';

export default function SlotsPage() {
  const [, setLocation] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-background/80 backdrop-blur-md border-b">
        <div className="max-w-6xl mx-auto px-4 py-3">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setLocation('/')}
              className="flex items-center gap-2"
              data-testid="button-back-home"
            >
              <ArrowLeft className="w-4 h-4" />
              홈으로
            </Button>
            <div>
              <h1 className="text-xl font-semibold">슬롯 예약</h1>
              <p className="text-sm text-muted-foreground">
                가이드와 호스트가 제공하는 다양한 슬롯을 찾아보세요
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="pb-8">
        <SlotBrowser />
      </div>
    </div>
  );
}