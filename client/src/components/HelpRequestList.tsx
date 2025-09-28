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
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedRequestId, setSelectedRequestId] = useState<number | null>(null);
  const [showRequestDetail, setShowRequestDetail] = useState(false);

  const { data: helpRequests, isLoading, error } = useQuery({
    queryKey: ['/api/requests/my'],
    enabled: !!user?.id,
  });

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
          오류가 발생했습니다
        </h3>
        <p className="text-gray-500">
          도움 요청을 불러오는 중 문제가 발생했습니다.
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
                    {request.status === 'open' && '진행 중'}
                    {request.status === 'assigned' && '할당됨'}
                    {request.status === 'completed' && '완료'}
                    {request.status === 'cancelled' && '취소'}
                  </Badge>
                  <Badge className={urgencyColors[request.urgencyLevel]} data-testid={`request-urgency-${request.id}`}>
                    {request.urgencyLevel === 'urgent' && '긴급'}
                    {request.urgencyLevel === 'normal' && '보통'}
                    {request.urgencyLevel === 'flexible' && '여유'}
                  </Badge>
                </div>
              </div>
            </div>
            <div className="text-right text-sm text-gray-500">
              <div className="flex items-center space-x-1 mb-1">
                <MessageCircle className="w-4 h-4" />
                <span data-testid={`request-responses-${request.id}`}>{request.responseCount}개 응답</span>
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
                  {new Date(request.deadline).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}까지
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
              카테고리: {request.category === 'local_tip' && '현지 팁'}
              {request.category === 'custom_planning' && '맞춤 계획'}
              {request.category === 'urgent_help' && '긴급 도움'}
              {request.category === 'product_purchase' && '제품 구매'}
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
              상세보기
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
          <h2 className="text-2xl font-bold text-gray-900">나의 도움 요청</h2>
          <p className="text-gray-600">총 {requests.length}개의 요청</p>
        </div>

        <div className="flex space-x-2">
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-[140px]">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="카테고리" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 카테고리</SelectItem>
              <SelectItem value="local_tip">현지 팁</SelectItem>
              <SelectItem value="custom_planning">맞춤 계획</SelectItem>
              <SelectItem value="urgent_help">긴급 도움</SelectItem>
              <SelectItem value="product_purchase">제품 구매</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedStatus} onValueChange={setSelectedStatus}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="상태" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">모든 상태</SelectItem>
              <SelectItem value="open">진행 중</SelectItem>
              <SelectItem value="assigned">할당됨</SelectItem>
              <SelectItem value="completed">완료</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Tabs for status-based filtering */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="all" data-testid="tab-all">
            전체 ({groupedRequests.all.length})
          </TabsTrigger>
          <TabsTrigger value="open" data-testid="tab-open">
            진행 중 ({groupedRequests.open.length})
          </TabsTrigger>
          <TabsTrigger value="assigned" data-testid="tab-assigned">
            할당됨 ({groupedRequests.assigned.length})
          </TabsTrigger>
          <TabsTrigger value="completed" data-testid="tab-completed">
            완료 ({groupedRequests.completed.length})
          </TabsTrigger>
        </TabsList>

        {Object.entries(groupedRequests).map(([status, requests]) => (
          <TabsContent key={status} value={status} className="mt-6">
            {requests.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-12 text-center">
                <MessageCircle className="w-16 h-16 text-gray-300 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {status === 'all' ? '도움 요청이 없습니다' :
                   status === 'open' ? '진행 중인 요청이 없습니다' :
                   status === 'assigned' ? '할당된 요청이 없습니다' :
                   '완료된 요청이 없습니다'}
                </h3>
                <p className="text-gray-500 mb-4">
                  {status === 'all' ? '첫 번째 도움 요청을 만들어보세요!' :
                   '해당하는 요청이 없습니다.'}
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
                    도움 요청하기
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