import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
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
  ThumbsUp,
  ThumbsDown,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
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

interface RequestResponse {
  id: number;
  requestId: number;
  responderId: string;
  responder: {
    id: string;
    firstName?: string;
    lastName?: string;
    email: string;
    profileImageUrl?: string;
  };
  message: string;
  offeredPrice?: number;
  currency: string;
  estimatedCompletionTime?: string;
  status: 'pending' | 'accepted' | 'rejected' | 'withdrawn';
  attachments?: string[];
  createdAt: string;
  updatedAt: string;
}

interface HelpRequestDetailProps {
  requestId?: number | undefined;
  isOpen: boolean;
  onClose: () => void;
}

const statusColors = {
  open: 'bg-blue-100 text-blue-800',
  assigned: 'bg-yellow-100 text-yellow-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-gray-100 text-gray-800',
};

const responseStatusColors = {
  pending: 'bg-yellow-100 text-yellow-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  withdrawn: 'bg-gray-100 text-gray-800',
};

export default function HelpRequestDetail({ requestId, isOpen, onClose }: HelpRequestDetailProps) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  // Fetch request details
  const { data: request, isLoading: requestLoading } = useQuery({
    queryKey: ['/api/requests', requestId],
    enabled: !!requestId && isOpen,
  });

  // Fetch responses
  const { data: responses = [], isLoading: responsesLoading } = useQuery({
    queryKey: ['/api/requests', requestId, 'responses'],
    enabled: !!requestId && isOpen,
  });

  // Update request status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ requestId, status }: { requestId: number, status: string }) => {
      return api(`/api/requests/${requestId}`, {
        method: 'PATCH',
        body: { status },
      });
    },
    onSuccess: () => {
      toast({
        title: '상태 업데이트 완료',
        description: '요청 상태가 성공적으로 업데이트되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requests/my'] });
    },
    onError: () => {
      toast({
        title: '업데이트 실패',
        description: '상태 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  // Accept/reject response mutation
  const updateResponseMutation = useMutation({
    mutationFn: async ({ responseId, status }: { responseId: number, status: 'accepted' | 'rejected' }) => {
      return api(`/api/responses/${responseId}`, {
        method: 'PATCH',
        body: { status },
      });
    },
    onSuccess: (_, { status }) => {
      toast({
        title: status === 'accepted' ? '응답 수락 완료' : '응답 거절 완료',
        description: `응답이 성공적으로 ${status === 'accepted' ? '수락' : '거절'}되었습니다.`,
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requests', requestId, 'responses'] });
      queryClient.invalidateQueries({ queryKey: ['/api/requests'] });
    },
    onError: () => {
      toast({
        title: '처리 실패',
        description: '응답 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  if (!requestId) return null;

  const handleStatusUpdate = () => {
    if (selectedStatus && requestId) {
      updateStatusMutation.mutate({ requestId, status: selectedStatus });
    }
  };

  const handleAcceptResponse = (responseId: number) => {
    updateResponseMutation.mutate({ responseId, status: 'accepted' });
  };

  const handleRejectResponse = (responseId: number) => {
    updateResponseMutation.mutate({ responseId, status: 'rejected' });
  };

  const locale = i18n.language === 'ko' ? ko : enUS;
  const helpRequest = request as HelpRequest;
  const requestResponses = responses as RequestResponse[];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="help-request-detail-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <MessageCircle className="w-5 h-5" />
            <span>도움 요청 상세</span>
          </DialogTitle>
        </DialogHeader>

        {requestLoading ? (
          <div className="space-y-4">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        ) : helpRequest ? (
          <div className="space-y-6">
            {/* Request Details */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-xl mb-2" data-testid="detail-request-title">
                      {helpRequest.title}
                    </CardTitle>
                    <div className="flex items-center space-x-2 mb-2">
                      <Badge className={statusColors[helpRequest.status]} data-testid="detail-request-status">
                        {helpRequest.status === 'open' && '진행 중'}
                        {helpRequest.status === 'assigned' && '할당됨'}
                        {helpRequest.status === 'completed' && '완료'}
                        {helpRequest.status === 'cancelled' && '취소'}
                      </Badge>
                      <Badge variant="outline">
                        {helpRequest.category === 'local_tip' && '현지 팁'}
                        {helpRequest.category === 'custom_planning' && '맞춤 계획'}
                        {helpRequest.category === 'urgent_help' && '긴급 도움'}
                        {helpRequest.category === 'product_purchase' && '제품 구매'}
                      </Badge>
                    </div>
                  </div>
                  <div className="text-right text-sm text-gray-500">
                    <div className="flex items-center space-x-1 mb-1">
                      <MessageCircle className="w-4 h-4" />
                      <span data-testid="detail-response-count">{helpRequest.responseCount}개 응답</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{formatDistanceToNow(parseISO(helpRequest.createdAt), { addSuffix: true, locale })}</span>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">상세 설명</h4>
                  <p className="text-gray-700" data-testid="detail-request-description">
                    {helpRequest.description}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  {helpRequest.location && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400" />
                      <span>{helpRequest.location}</span>
                    </div>
                  )}

                  {(helpRequest.budgetMin || helpRequest.budgetMax) && (
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                      <span data-testid="detail-request-budget">
                        {helpRequest.budgetMin && helpRequest.budgetMax
                          ? `₩${helpRequest.budgetMin?.toLocaleString()} - ₩${helpRequest.budgetMax?.toLocaleString()}`
                          : helpRequest.budgetMin
                            ? `₩${helpRequest.budgetMin?.toLocaleString()}+`
                            : `~₩${helpRequest.budgetMax?.toLocaleString()}`
                        }
                      </span>
                    </div>
                  )}

                  {helpRequest.deadline && (
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span>
                        {new Date(helpRequest.deadline).toLocaleDateString(i18n.language === 'ko' ? 'ko-KR' : 'en-US')}까지
                      </span>
                    </div>
                  )}
                </div>

                {helpRequest.tags && helpRequest.tags.length > 0 && (
                  <div>
                    <h4 className="font-medium mb-2">태그</h4>
                    <div className="flex flex-wrap gap-2">
                      {helpRequest.tags.map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Status Update */}
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-3">상태 관리</h4>
                  <div className="flex items-center space-x-3">
                    <Select value={selectedStatus} onValueChange={setSelectedStatus}>
                      <SelectTrigger className="w-[150px]" data-testid="select-status-update">
                        <SelectValue placeholder="상태 변경" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open" data-testid="status-option-open">진행 중</SelectItem>
                        <SelectItem value="assigned" data-testid="status-option-assigned">할당됨</SelectItem>
                        <SelectItem value="completed" data-testid="status-option-completed">완료</SelectItem>
                        <SelectItem value="cancelled" data-testid="status-option-cancelled">취소</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button 
                      onClick={handleStatusUpdate}
                      disabled={!selectedStatus || updateStatusMutation.isPending}
                      data-testid="button-update-status"
                    >
                      {updateStatusMutation.isPending ? '업데이트 중...' : '상태 업데이트'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Responses */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>받은 응답 ({requestResponses.length}개)</span>
                  <Eye className="w-5 h-5 text-gray-400" />
                </CardTitle>
              </CardHeader>

              <CardContent>
                {responsesLoading ? (
                  <div className="space-y-4">
                    {[...Array(2)].map((_, i) => (
                      <div key={i} className="animate-pulse p-4 border rounded-lg">
                        <div className="flex items-center space-x-3 mb-3">
                          <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
                        </div>
                        <div className="h-3 bg-gray-200 rounded w-full mb-2"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : requestResponses.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">응답이 없습니다</h3>
                    <p className="text-gray-500">아직 아무도 이 요청에 응답하지 않았습니다.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {requestResponses.map((response) => (
                      <div 
                        key={response.id} 
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                        data-testid={`response-${response.id}`}
                      >
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                              <User className="w-5 h-5 text-blue-600" />
                            </div>
                            <div>
                              <div className="font-medium" data-testid={`responder-name-${response.id}`}>
                                {response.responder?.firstName && response.responder?.lastName
                                  ? `${response.responder.firstName} ${response.responder.lastName}`
                                  : response.responder?.email?.split('@')[0] || '익명'}
                              </div>
                              <div className="text-xs text-gray-500">
                                {formatDistanceToNow(parseISO(response.createdAt), { addSuffix: true, locale })}
                              </div>
                            </div>
                          </div>
                          <Badge className={responseStatusColors[response.status]} data-testid={`response-status-${response.id}`}>
                            {response.status === 'pending' && '대기 중'}
                            {response.status === 'accepted' && '수락됨'}
                            {response.status === 'rejected' && '거절됨'}
                            {response.status === 'withdrawn' && '철회됨'}
                          </Badge>
                        </div>

                        <p className="text-gray-700 mb-3" data-testid={`response-message-${response.id}`}>
                          {response.message}
                        </p>

                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            {response.offeredPrice && (
                              <div className="flex items-center space-x-1">
                                <DollarSign className="w-4 h-4" />
                                <span data-testid={`response-price-${response.id}`}>
                                  ₩{response.offeredPrice.toLocaleString()}
                                </span>
                              </div>
                            )}
                            {response.estimatedCompletionTime && (
                              <div className="flex items-center space-x-1">
                                <Clock className="w-4 h-4" />
                                <span>{response.estimatedCompletionTime}</span>
                              </div>
                            )}
                          </div>

                          {response.status === 'pending' && (
                            <div className="flex space-x-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleRejectResponse(response.id)}
                                disabled={updateResponseMutation.isPending}
                                className="text-red-600 border-red-200 hover:bg-red-50"
                                data-testid={`button-reject-${response.id}`}
                              >
                                <ThumbsDown className="w-4 h-4 mr-1" />
                                거절
                              </Button>
                              <Button
                                size="sm"
                                onClick={() => handleAcceptResponse(response.id)}
                                disabled={updateResponseMutation.isPending}
                                className="bg-green-600 hover:bg-green-700"
                                data-testid={`button-accept-${response.id}`}
                              >
                                <ThumbsUp className="w-4 h-4 mr-1" />
                                수락
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <div className="text-center py-8">
            <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">요청을 찾을 수 없습니다</h3>
            <p className="text-gray-500">요청이 삭제되었거나 접근 권한이 없습니다.</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}