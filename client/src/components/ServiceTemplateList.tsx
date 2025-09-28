import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ServiceTemplate } from '@shared/schema';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Sparkles, 
  MapPin, 
  ShoppingBag, 
  Camera, 
  MessageCircle,
  Edit2,
  Trash2,
  Eye,
  Clock,
  Users,
  Star,
  Plus
} from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import ServiceTemplateForm from './ServiceTemplateForm';

const templateTypeConfig = {
  custom_planning: { 
    label: '맞춤 코스 짜드려요', 
    icon: MapPin, 
    color: 'bg-blue-100 text-blue-700' 
  },
  food_list: { 
    label: '먹킷리스트', 
    icon: ShoppingBag, 
    color: 'bg-green-100 text-green-700' 
  },
  photo_companion: { 
    label: '촬영 동행', 
    icon: Camera, 
    color: 'bg-purple-100 text-purple-700' 
  },
  translation: { 
    label: '번역 서비스', 
    icon: MessageCircle, 
    color: 'bg-orange-100 text-orange-700' 
  },
  shopping_guide: { 
    label: '쇼핑 가이드', 
    icon: ShoppingBag, 
    color: 'bg-pink-100 text-pink-700' 
  },
};

interface ServiceTemplateCardProps {
  template: ServiceTemplate;
  onEdit: (template: ServiceTemplate) => void;
  onDelete: (templateId: number) => void;
  onView: (template: ServiceTemplate) => void;
}

function ServiceTemplateCard({ template, onEdit, onDelete, onView }: ServiceTemplateCardProps) {
  const config = templateTypeConfig[template.templateType as keyof typeof templateTypeConfig];
  const Icon = config?.icon || Sparkles;

  const formatPrice = (price: string | number) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return new Intl.NumberFormat('ko-KR', {
      style: 'currency',
      currency: 'KRW',
    }).format(numPrice);
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-200" data-testid={`template-card-${template.id}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <div className={`p-2 rounded-lg ${config?.color || 'bg-gray-100'}`}>
              <Icon className="w-4 h-4" />
            </div>
            <div>
              <Badge variant="secondary" className="text-xs">
                {config?.label || template.templateType}
              </Badge>
            </div>
          </div>
          <div className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onView(template)}
              data-testid={`button-view-template-${template.id}`}
            >
              <Eye className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onEdit(template)}
              data-testid={`button-edit-template-${template.id}`}
            >
              <Edit2 className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onDelete(template.id)}
              className="text-red-500 hover:text-red-700 hover:bg-red-50"
              data-testid={`button-delete-template-${template.id}`}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <CardTitle className="text-lg font-semibold leading-tight" data-testid={`template-title-${template.id}`}>
          {template.title}
        </CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-gray-600 text-sm line-clamp-2" data-testid={`template-description-${template.id}`}>
          {template.description}
        </p>

        {/* 가격 및 기본 정보 */}
        <div className="flex items-center justify-between">
          <div className="text-lg font-bold text-green-600" data-testid={`template-price-${template.id}`}>
            {formatPrice(template.basePrice)}
          </div>
          <div className="flex items-center space-x-3 text-sm text-gray-500">
            {template.durationHours && (
              <div className="flex items-center space-x-1">
                <Clock className="w-4 h-4" />
                <span>{template.durationHours}시간</span>
              </div>
            )}
            <div className="flex items-center space-x-1">
              <Users className="w-4 h-4" />
              <span>최대 {template.maxParticipants}명</span>
            </div>
          </div>
        </div>

        {/* 포함 사항 미리보기 */}
        {template.includes && template.includes.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">포함 사항:</p>
            <div className="flex flex-wrap gap-1">
              {template.includes.slice(0, 3).map((item, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {item}
                </Badge>
              ))}
              {template.includes.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{template.includes.length - 3}개 더
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* 통계 정보 */}
        <div className="flex items-center justify-between pt-2 border-t">
          <div className="flex items-center space-x-2">
            <Star className="w-4 h-4 text-yellow-500" />
            <span className="text-sm">
              {template.rating ? parseFloat(template.rating).toFixed(1) : '0.0'}
            </span>
            <span className="text-sm text-gray-400">
              ({template.orderCount || 0}개 주문)
            </span>
          </div>
          <Badge variant={template.isActive ? "default" : "secondary"}>
            {template.isActive ? '활성' : '비활성'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}

interface ServiceTemplateListProps {
  showCreateButton?: boolean;
}

export default function ServiceTemplateList({ showCreateButton = true }: ServiceTemplateListProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ServiceTemplate | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [templateToDelete, setTemplateToDelete] = useState<number | null>(null);

  const { data: templates, isLoading, error } = useQuery<ServiceTemplate[]>({
    queryKey: ['/api/templates/my'],
    queryFn: () => apiRequest('/api/templates/my'),
  });

  const deleteMutation = useMutation({
    mutationFn: async (templateId: number) => {
      return apiRequest(`/api/templates/${templateId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/my'] });
      toast({
        title: '템플릿 삭제 완료',
        description: '서비스 템플릿이 성공적으로 삭제되었습니다.',
      });
      setDeleteDialogOpen(false);
      setTemplateToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: '삭제 실패',
        description: error?.message || '템플릿 삭제 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleEdit = (template: ServiceTemplate) => {
    setEditingTemplate(template);
    setIsFormOpen(true);
  };

  const handleDelete = (templateId: number) => {
    setTemplateToDelete(templateId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = () => {
    if (templateToDelete) {
      deleteMutation.mutate(templateToDelete);
    }
  };

  const handleView = (template: ServiceTemplate) => {
    // TODO: Implement template detail view
    toast({
      title: '템플릿 상세보기',
      description: '곧 상세보기 기능이 추가될 예정입니다.',
    });
  };

  const handleFormClose = () => {
    setIsFormOpen(false);
    setEditingTemplate(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4" data-testid="templates-loading">
        {[...Array(3)].map((_, index) => (
          <Card key={index} className="animate-pulse">
            <CardHeader>
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="h-3 bg-gray-200 rounded w-full"></div>
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
      <div className="text-center py-8" data-testid="templates-error">
        <p className="text-red-500">템플릿을 불러오는 중 오류가 발생했습니다.</p>
        <Button 
          onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/templates/my'] })}
          className="mt-2"
          variant="outline"
        >
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6" data-testid="service-templates-section">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">내 서비스 템플릿</h3>
          <p className="text-sm text-gray-600">
            {templates?.length || 0}개의 서비스 템플릿을 관리하고 있습니다
          </p>
        </div>
        {showCreateButton && (
          <Button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center space-x-2"
            data-testid="button-create-template"
          >
            <Plus className="w-4 h-4" />
            <span>새 템플릿</span>
          </Button>
        )}
      </div>

      {/* 템플릿 목록 */}
      {templates && templates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" data-testid="templates-grid">
          {templates.map((template) => (
            <ServiceTemplateCard
              key={template.id}
              template={template}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onView={handleView}
            />
          ))}
        </div>
      ) : (
        <Card className="text-center py-12" data-testid="templates-empty-state">
          <CardContent>
            <Sparkles className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">아직 서비스 템플릿이 없습니다</h3>
            <p className="text-gray-600 mb-6">
              인플루언서로서 제공할 수 있는 서비스 템플릿을 만들어보세요.<br />
              맞춤 코스, 맛집 리스트, 촬영 동행 등 다양한 서비스를 템플릿으로 만들 수 있습니다.
            </p>
            {showCreateButton && (
              <Button 
                onClick={() => setIsFormOpen(true)}
                className="flex items-center space-x-2"
                data-testid="button-create-first-template"
              >
                <Plus className="w-4 h-4" />
                <span>첫 번째 템플릿 만들기</span>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* 템플릿 폼 모달 */}
      <ServiceTemplateForm
        isOpen={isFormOpen}
        onClose={handleFormClose}
        template={editingTemplate}
      />

      {/* 삭제 확인 다이얼로그 */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="delete-template-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>템플릿 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              정말로 이 서비스 템플릿을 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">취소</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? '삭제 중...' : '삭제'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}