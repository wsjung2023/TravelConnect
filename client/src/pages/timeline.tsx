import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useLocation } from 'wouter';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import { Calendar, MapPin, Plus, Film, Clock, Download, ChevronLeft, MapIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import { queryClient } from '@/lib/queryClient';

interface PostMedia {
  id: number;
  postId: number;
  url: string;
  type: string;
  orderIndex: number | null;
  exifDatetime: string | null;
  exifLatitude: string | null;
  exifLongitude: string | null;
  exifMetadata: any | null;
  createdAt: string | null;
}

interface Post {
  id: number;
  userId: string;
  title: string;
  content: string | null;
  latitude: number | null;
  longitude: number | null;
  locationName: string | null;
  media?: PostMedia[];
}

interface Timeline {
  id: number;
  userId: string;
  title: string;
  destination: string | null;
  startDate: string;
  endDate: string | null;
  coverImage: string | null;
  description: string | null;
  isPublic: boolean | null;
  totalDays: number | null;
  createdAt: string | null;
  updatedAt: string | null;
}

interface TimelineWithPosts extends Timeline {
  posts?: Post[];
}

interface CinemapJob {
  id: number;
  userId: string;
  timelineId: number | null;
  status: string;
  resultVideoUrl: string | null;
  storyboard: any | null;
  errorMessage: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function TimelinePage() {
  const { t } = useTranslation(['ui', 'common']);
  const [selectedTimelineId, setSelectedTimelineId] = useState<number | null>(null);
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  // Fetch user's timelines
  const { data: timelines, isLoading: timelinesLoading } = useQuery<Timeline[]>({
    queryKey: ['/api/timelines'],
    retry: 1,
  });

  // Fetch selected timeline details with media
  const { data: timelineMedia, isLoading: mediaLoading } = useQuery<{
    timeline: TimelineWithPosts;
    media: PostMedia[];
  }>({
    queryKey: ['/api/timelines', selectedTimelineId, 'media'],
    enabled: !!selectedTimelineId,
    queryFn: async () => {
      const response = await fetch(`/api/timelines/${selectedTimelineId}/media`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) throw new Error('Failed to fetch timeline media');
      return response.json();
    },
  });

  // Fetch CineMap job for selected timeline
  const { data: cinemapJob, isLoading: jobLoading } = useQuery<CinemapJob>({
    queryKey: ['/api/cinemap/jobs/timeline', selectedTimelineId],
    enabled: !!selectedTimelineId,
    queryFn: async () => {
      const response = await fetch(`/api/cinemap/jobs/timeline/${selectedTimelineId}`, {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
      });
      if (!response.ok) {
        if (response.status === 404) return null;
        throw new Error('Failed to fetch CineMap job');
      }
      return response.json();
    },
    retry: 1,
  });

  // Create CineMap job mutation
  const createCinemapMutation = useMutation({
    mutationFn: async (timelineId: number) => {
      return apiRequest(`/api/cinemap/jobs`, {
        method: 'POST',
        body: JSON.stringify({ timelineId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/cinemap/jobs/timeline', selectedTimelineId] });
      toast({
        title: t('ui:cinemap.jobCreated'),
        description: t('ui:cinemap.jobCreatedDesc'),
      });
    },
    onError: (error: any) => {
      toast({
        title: t('ui:cinemap.jobFailed'),
        description: error.message || t('ui:cinemap.jobFailedDesc'),
        variant: 'destructive',
      });
    },
  });

  const handleCreateCinemap = () => {
    if (selectedTimelineId) {
      createCinemapMutation.mutate(selectedTimelineId);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { variant: 'default' | 'secondary' | 'destructive' | 'outline', label: string }> = {
      pending: { variant: 'secondary', label: t('ui:cinemap.pending') },
      processing: { variant: 'default', label: t('ui:cinemap.generating') },
      completed: { variant: 'outline', label: t('ui:cinemap.completed') },
      failed: { variant: 'destructive', label: t('ui:cinemap.failed') },
    };
    const config = statusMap[status] ?? statusMap.pending!;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (timelinesLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-center min-h-[200px]">
          <div className="text-lg">{t('common:app.loading')}</div>
        </div>
      </div>
    );
  }

  // Timeline Detail View
  if (selectedTimelineId && timelineMedia) {
    const timeline = timelineMedia.timeline;
    const media = timelineMedia.media || [];
    const mediaWithExif = media.filter(m => m.exifLatitude && m.exifLongitude);

    return (
      <div className="mobile-content" style={{ height: '100vh', overflow: 'auto' }}>
        <div className="container mx-auto p-4 max-w-6xl">
          {/* Header */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => setSelectedTimelineId(null)}
            className="mb-4"
            data-testid="back-to-timelines-button"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            {t('common:app.back')}
          </Button>

          <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="flex-1">
              <h1 className="text-3xl font-bold mb-2" data-testid="timeline-title">
                {timeline.title}
              </h1>
              {timeline.destination && (
                <div className="flex items-center gap-2 text-gray-600 mb-2">
                  <MapPin className="w-4 h-4" />
                  <span>{timeline.destination}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-gray-600 mb-4">
                <Calendar className="w-4 h-4" />
                <span>
                  {new Date(timeline.startDate).toLocaleDateString()}
                  {timeline.endDate && ` - ${new Date(timeline.endDate).toLocaleDateString()}`}
                </span>
                {timeline.totalDays && (
                  <span className="text-sm">
                    ({timeline.totalDays} {t('ui:labels.days')})
                  </span>
                )}
              </div>
              {timeline.description && (
                <p className="text-gray-700 mb-4">{timeline.description}</p>
              )}
            </div>

            {/* CineMap Actions */}
            <div className="flex flex-col gap-3 min-w-[280px]">
              <Card className="bg-gradient-to-br from-purple-50 to-pink-50 dark:from-purple-950 dark:to-pink-950">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Film className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    {t('ui:cinemap.title')}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {jobLoading ? (
                    <div className="text-sm text-gray-600">{t('common:app.loading')}</div>
                  ) : cinemapJob ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium">{t('ui:cinemap.status')}:</span>
                        {getStatusBadge(cinemapJob.status)}
                      </div>
                      {cinemapJob.status === 'completed' && cinemapJob.resultVideoUrl && (
                        <div className="flex flex-col gap-2">
                          <video
                            src={cinemapJob.resultVideoUrl}
                            controls
                            className="w-full rounded-lg"
                            data-testid="cinemap-video"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              className="flex-1"
                              onClick={() => window.open(cinemapJob.resultVideoUrl!, '_blank')}
                              data-testid="view-video-button"
                            >
                              <Film className="w-4 h-4 mr-2" />
                              {t('ui:cinemap.viewVideo')}
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                const link = document.createElement('a');
                                link.href = cinemapJob.resultVideoUrl!;
                                link.download = `${timeline.title}-cinemap.mp4`;
                                link.click();
                              }}
                              data-testid="download-video-button"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      )}
                      {cinemapJob.status === 'processing' && (
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          <Clock className="w-4 h-4 animate-spin" />
                          {t('ui:cinemap.processing')}
                        </div>
                      )}
                      {cinemapJob.status === 'failed' && cinemapJob.errorMessage && (
                        <div className="text-sm text-red-600 dark:text-red-400">
                          {cinemapJob.errorMessage}
                        </div>
                      )}
                      {(cinemapJob.status === 'failed' || cinemapJob.status === 'completed') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="w-full"
                          onClick={handleCreateCinemap}
                          disabled={createCinemapMutation.isPending}
                          data-testid="regenerate-cinemap-button"
                        >
                          {t('ui:cinemap.regenerate')}
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        {t('ui:cinemap.subtitle')}
                      </p>
                      <Button
                        className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                        onClick={handleCreateCinemap}
                        disabled={createCinemapMutation.isPending || media.length === 0}
                        data-testid="create-cinemap-button"
                      >
                        <Film className="w-4 h-4 mr-2" />
                        {createCinemapMutation.isPending ? t('ui:cinemap.processing') : t('ui:cinemap.createVideo')}
                      </Button>
                      {media.length === 0 && (
                        <p className="text-xs text-gray-500 dark:text-gray-500">
                          Add photos to this timeline first
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Timeline Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{media.length}</div>
              <div className="text-sm text-gray-600">{t('ui:cinemap.photos')}</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{mediaWithExif.length}</div>
              <div className="text-sm text-gray-600">With Location</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{timeline.posts?.length || 0}</div>
              <div className="text-sm text-gray-600">Posts</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="text-2xl font-bold">{timeline.totalDays || 1}</div>
              <div className="text-sm text-gray-600">{t('ui:labels.days')}</div>
            </CardContent>
          </Card>
        </div>

        {/* Photo Gallery */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <MapIcon className="w-6 h-6" />
            {t('ui:cinemap.photos')}
          </h2>
          {mediaLoading ? (
            <div className="text-center py-8">{t('common:app.loading')}</div>
          ) : media.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-gray-500">No photos in this timeline yet</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {media.map((m) => (
                <Card key={m.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="aspect-square relative">
                    <img
                      src={m.url}
                      alt={`Photo ${m.id}`}
                      className="w-full h-full object-cover"
                      data-testid={`timeline-photo-${m.id}`}
                    />
                    {m.exifLatitude && m.exifLongitude && (
                      <div className="absolute top-2 right-2 bg-black/70 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        GPS
                      </div>
                    )}
                  </div>
                  {m.exifDatetime && (
                    <CardContent className="p-2">
                      <div className="text-xs text-gray-600 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {new Date(m.exifDatetime).toLocaleString()}
                      </div>
                      {m.exifLatitude && m.exifLongitude && (
                        <div className="text-xs text-gray-500 mt-1">
                          {parseFloat(m.exifLatitude).toFixed(4)}, {parseFloat(m.exifLongitude).toFixed(4)}
                        </div>
                      )}
                    </CardContent>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
        </div>
      </div>
    );
  }

  // Timeline List View
  return (
    <div className="mobile-content" style={{ height: '100vh', overflow: 'auto' }}>
      <div className="container mx-auto p-4">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Calendar className="w-6 h-6" />
            {t('ui:timeline.title')}
          </h1>
        <Button
          onClick={() => setLocation('/timeline/create')}
          className="flex items-center gap-2"
          data-testid="add-timeline-button"
        >
          <Plus className="w-4 h-4" />
          {t('ui:timeline.create')}
        </Button>
      </div>

      <div className="grid gap-4">
        {!timelines || timelines.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">{t('ui:timeline.noTimelines')}</h3>
              <p className="text-gray-500 mb-4">{t('ui:timeline.createFirst')}</p>
              <Button onClick={() => setLocation('/timeline/create')}>
                <Plus className="w-4 h-4 mr-2" />
                {t('ui:timeline.create')}
              </Button>
            </CardContent>
          </Card>
        ) : (
          timelines.map((timeline) => (
            <Card
              key={timeline.id}
              className="cursor-pointer hover:shadow-lg transition-shadow"
              onClick={() => setSelectedTimelineId(timeline.id)}
              data-testid={`timeline-card-${timeline.id}`}
            >
              <div className="flex flex-col md:flex-row">
                {timeline.coverImage && (
                  <div className="md:w-48 h-48 md:h-auto">
                    <img
                      src={timeline.coverImage}
                      alt={timeline.title}
                      className="w-full h-full object-cover rounded-t-lg md:rounded-l-lg md:rounded-t-none"
                    />
                  </div>
                )}
                <div className="flex-1">
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
                    {timeline.description && (
                      <p className="text-gray-600 mb-2 line-clamp-2">{timeline.description}</p>
                    )}
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      {timeline.totalDays && (
                        <span>{timeline.totalDays} {t('ui:labels.days')}</span>
                      )}
                      <span>{new Date(timeline.startDate).toLocaleDateString()}</span>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          ))
        )}
        </div>
      </div>
    </div>
  );
}
