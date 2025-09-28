import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { Plus, Calendar, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Timeline, Post } from '@shared/schema';
import { useTranslation } from 'react-i18next';

interface TimelineWithPosts extends Timeline {
  posts: Post[];
}

export default function TimelinePage() {
  const { t } = useTranslation(['ui', 'common']);
  const [selectedTimeline, setSelectedTimeline] = useState<TimelineWithPosts | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // 전역 함수로 모달 열기 등록
  useEffect(() => {
    (window as any).openTimelineModal = (fromFeed = false) => {
      setShowCreateModal(true);
      (window as any).timelineModalFromFeed = fromFeed;
    };

    return () => {
      delete (window as any).openTimelineModal;
      delete (window as any).timelineModalFromFeed;
    };
  }, []);

  // 사용자의 타임라인 목록 조회
  const { data: timelines, isLoading, error: timelinesError } = useQuery<Timeline[]>({
    queryKey: ['/api/timelines'],
    queryFn: () => api('/api/timelines'),
    retry: 1,
  });

  // 선택된 타임라인의 상세 정보 조회
  const { data: timelineDetail, error: timelineDetailError } = useQuery<TimelineWithPosts>({
    queryKey: ['/api/timelines', selectedTimeline?.id],
    enabled: !!selectedTimeline?.id,
    queryFn: () => api(`/api/timelines/${selectedTimeline?.id}`),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg">{t('common:app.loading')}</div>
        </div>
      </div>
    );
  }

  if (timelinesError) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg text-red-500">{t('common:app.error')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      {/* 헤더 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calendar className="w-6 h-6" />
          {t('ui:timeline.title')}
        </h1>
        <Button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2"
          data-testid="add-timeline-button"
        >
          <Plus className="w-4 h-4" />
          {t('ui:timeline.create')}
        </Button>
      </div>

      {/* 타임라인 목록 */}
      <div className="grid gap-4">
        {!timelines || timelines.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">{t('ui:timeline.noTimelines')}</h3>
              <p className="text-gray-500 mb-4">{t('ui:timeline.createFirst')}</p>
              <Button onClick={() => setShowCreateModal(true)}>
                <Plus className="w-4 h-4 mr-2" />
                {t('ui:timeline.create')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          timelines.map((timeline) => (
            <Card key={timeline.id} className="cursor-pointer hover:shadow-lg transition-shadow">
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{timeline.title}</span>
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <MapPin className="w-4 h-4" />
                    {timeline.destination}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600 mb-2">{timeline.description}</p>
                <div className="flex items-center gap-4 text-sm text-gray-500">
                  <span>{timeline.duration} {t('ui:labels.days')}</span>
                  <span>{new Date(timeline.startDate).toLocaleDateString()}</span>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* 타임라인 생성 모달 - 임시 플레이스홀더 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-bold mb-4">{t('ui:timeline.create')}</h2>
            <p className="text-gray-600 mb-4">{t('ui:timeline.createModalPlaceholder')}</p>
            <div className="flex gap-2">
              <Button onClick={() => setShowCreateModal(false)} variant="outline">
                {t('common:app.cancel')}
              </Button>
              <Button onClick={() => setShowCreateModal(false)}>
                {t('common:app.save')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}