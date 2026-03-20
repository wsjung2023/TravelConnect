// 도움 요청 목록 — 도움 요청 목록을 상태별로 표시하는 컴포넌트.
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/hooks/useAuth';
import HelpRequestDetail from '@/components/HelpRequestDetail';
import { 
  MessageCircle, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Clock, 
  AlertCircle,
  CheckCircle,
  XCircle,
  User,
  Filter
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { formatDistanceToNow, parseISO } from 'date-fns';
import { ko, enUS } from 'date-fns/locale';

interface HelpRequest {
  id: number;
  title: string;
  description: string;
  category: 'local_tip' | 'custom_planning' | 'urgent_help' | 'product_purchase';
  location?: string;
  budgetMin?: number;
  budgetMax?: number;
  currency: string;
  deadline?: string;
  urgencyLevel: 'urgent' | 'normal' | 'flexible';
  status: 'open' | 'assigned' | 'completed' | 'cancelled';
  responseCount: number;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

const categoryIcons = {
  local_tip: MessageCircle,
  custom_planning: Calendar,
  urgent_help: AlertCircle,
  product_purchase: DollarSign,
};

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const urgencyColors = {
  urgent: 'bg-red-100 text-red-800',
  normal: 'bg-blue-100 text-blue-800',
  flexible: 'bg-green-100 text-green-800',
};

export default function HelpRequestList() {
  const { t, i18n } = useTranslation('ui');
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showRequestDetail, setShowRequestDetail] = useState(false);

  const { data: helpRequests, isLoading, error } = useQuery({
    queryKey: ['/api/requests/my'],
    enabled: !!user?.id,
  });

  const categoryLabels: Record<HelpRequest['category'], string> = {
    local_tip: t('helpRequest.categories.localTip', '현지 팁'),
    custom_planning: t('helpRequest.categories.customPlanning', '맞춤 계획'),
    urgent_help: t('helpRequest.categories.urgentHelp', '긴급 도움'),
    product_purchase: t('helpRequest.categories.productPurchase', '제품 구매'),
  };

  const statusLabels: Record<HelpRequest['status'], string> = {
    open: t('helpRequest.status.open', '진행 중'),
    assigned: t('helpRequest.status.assigned', '할당됨'),
    completed: t('helpRequest.status.completed', '완료'),
    cancelled: t('helpRequest.status.cancelled', '취소'),
  };

  const urgencyLabels: Record<HelpRequest['urgencyLevel'], string> = {
    urgent: t('helpRequest.urgency.urgent', '긴급'),
    normal: t('helpRequest.urgency.normal', '보통'),
    flexible: t('helpRequest.urgency.flexible', '여유롭게'),
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <User className="w-12 h-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('auth.required', '로그인 필요')}
        </h3>
        <p className="text-gray-500">
          {t('auth.loginFirst', '먼저 로그인해주세요')}
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="help-request-list-loading">
        {[...Array(3)].map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <div className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center">
        <XCircle className="w-12 h-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {t('helpRequest.list.errorTitle', '오류가 발생했습니다')}
        </h3>
        <p className="text-gray-500">
          {t('helpRequest.list.errorDescription', '도움 요청을 불러오는 중 문제가 발생했습니다.')}
        </p>
      </div>
    );
  }

  const requests = helpRequests as HelpRequest[] || [];

  // Filter requests
  const filteredRequests = requests.filter(request => {
    if (selectedCategory !== 'all' && request.category !== selectedCategory) {
      return false;
    }
    if (selectedStatus !== 'all' && request.status !== selectedStatus) {
      return false;
    }
    return true;
  });

  // Group by status for tabs
  const groupedRequests = {
    all: filteredRequests,
    open: filteredRequests.filter(r => r.status === 'open'),
    assigned: filteredRequests.filter(r => r.status === 'assigned'),
    completed: filteredRequests.filter(r => r.status === 'completed'),
  };

  const renderHelpRequest = (request: HelpRequest) => {
    const CategoryIcon = categoryIcons[request.category];
    const locale = i18n.language === 'ko' ? ko : enUS;

    return (
      <Card key={request.id} className="hover:shadow-md transition-shadow" data-testid={`help-request-${request.id}`}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex items-start space-x-3">
              <div className="p-2 bg-blue-50 rounded-lg">
                <CategoryIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-1" data-testid={`request-title-${request.id}`}>
                  {request.title}
                </h3>
                <div className="flex items-center space-x-2">
                  <Badge className={statusColors[request.status]} data-testid={`request-status-${request.id}`}>
                    {statusLabels[request.status]}
                  </Badge>
                  <Badge className={urgencyColors[request.urgencyLevel]} data-testid={`request-urgency-${request.id}`}>
                    {urgencyLabels[request.urgencyLevel]}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center space-x-1 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span data-testid={`request-responses-${request.id}`}>
                  {t('helpRequest.list.responseCount', '{{count}} responses', { count: request.responseCount })}
                </span>
              </div>
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{formatDistanceToNow(parseISO(request.createdAt), { addSuffix: true, locale })}</span>
              </div>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <p className="text-gray-600 mb-4 line-clamp-2" data-testid={`request-description-${request.id}`}>
            {request.description}
          </p>

          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
            {request.location && (
              <div className="flex items-center space-x-1">
                <MapPin className="w-4 h-4" />
                <span>{request.location}</span>
              </div>
            )}

            {(request.budgetMin || request.budgetMax) && (
              <div className="flex items-center space-x-1">
                <DollarSign className="w-4 h-4" />
                <span data-testid={`request-budget-${request.id}`}>
                  {request.budgetMin && request.budgetMax
                    ? `₩${request.budgetMin?.toLocaleString()} - ₩${request.budgetMax?.toLocaleString()}`
                    : request.budgetMin
                      ? `₩${request.budgetMin?.toLocaleString()}+`
                      : `~₩${request.budgetMax?.toLocaleString()}`
                  }
                </span>
              </div>
            )}

            {request.deadline && (
              <div className="flex items-center space-x-1">
                <Calendar className="w-4 h-4" />
                <span>
                  {t('helpRequest.list.deadline', {
                    date: new Date(request.deadline).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US'),
                    defaultValue: '{{date}}까지',
                  })}
                </span>
              </div>
            )}
          </div>

          {request.tags && request.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-3">
              {request.tags.map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="text-xs text-gray-400">
              {t('helpRequest.list.categoryLabel', '카테고리')}: {categoryLabels[request.category]}
            </div>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setSelectedRequestId(request.id);
                setShowRequestDetail(true);
              }}
              data-testid={`button-view-request-${request.id}`}
            >
              {t('helpRequest.list.viewDetails', '상세보기')}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6" data-testid="help-request-list">
      {/* Header with filters */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('helpRequest.list.title', '나의 도움 요청')}</h2>
          <p className="text-gray-600">
            {t('helpRequest.list.totalCount', '총 {{count}}개의 요청', { count: requests.length })}
          </p>
        </div>

        <div className="flex space-x-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder={t('helpRequest.list.filterCategory', '카테고리')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('helpRequest.list.allCategories', '모든 카테고리')}</SelectItem>
              <SelectItem value="local_tip">{categoryLabels.local_tip}</SelectItem>
              <SelectItem value="custom_planning">{categoryLabels.custom_planning}</SelectItem>
              <SelectItem value="urgent_help">{categoryLabels.urgent_help}</SelectItem>
              <SelectItem value="product_purchase">{categoryLabels.product_purchase}</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder={t('helpRequest.list.filterStatus', '상태')} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">{t('helpRequest.list.allStatuses', '모든 상태')}</SelectItem>
              <SelectItem value="open">{statusLabels.open}</SelectItem>
              <SelectItem value="assigned">{statusLabels.assigned}</SelectItem>
              <SelectItem value="completed">{statusLabels.completed}</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs for status-based filtering */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            {t('helpRequest.list.tabs.all', '전체')} ({groupedRequests.all.length})
          </TabsTrigger>
          <TabsTrigger value="open" data-testid="tab-open">
            {statusLabels.open} ({groupedRequests.open.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" data-testid="tab-assigned">
            {statusLabels.assigned} ({groupedRequests.assigned.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            {statusLabels.completed} ({groupedRequests.completed.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedRequests).map(([status, requests]) => (
          <TabsContent key={status} value={status} className="mt-6">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {status === 'all' ? t('helpRequest.list.empty.allTitle', '도움 요청이 없습니다') :
                   status === 'open' ? t('helpRequest.list.empty.openTitle', '진행 중인 요청이 없습니다') :
                   status === 'assigned' ? t('helpRequest.list.empty.assignedTitle', '할당된 요청이 없습니다') :
                   t('helpRequest.list.empty.completedTitle', '완료된 요청이 없습니다')}
                </h3>
                <p className="text-gray-500 mb-4">
                  {status === 'all' ? t('helpRequest.list.empty.allDescription', '첫 번째 도움 요청을 만들어보세요!') :
                   t('helpRequest.list.empty.filteredDescription', '해당하는 요청이 없습니다.')}
                </p>
                {status === 'all' && (
                  <Button 
                    onClick={() => {
                      // Will be connected to parent component's help request form
                      if (window.parent) {
                        window.parent.postMessage({ type: 'OPEN_HELP_REQUEST_FORM' }, '*');
                      }
                    }}
                    data-testid="button-create-first-request"
                  >
                    {t('helpRequest.form.createRequest', '도움 요청 생성')}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {requests.map(renderHelpRequest)}
              </div>
            )}
          </TabsContent>
        ))}
      </Tabs>

      {/* Help Request Detail Modal */}
      <HelpRequestDetail
        requestId={selectedRequestId || undefined}
        isOpen={showRequestDetail}
        onClose={() => {
          setShowRequestDetail(false);
          setSelectedRequestId(null);
        }}
      />
    </div>
  );
}
