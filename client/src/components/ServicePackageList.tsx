import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Package, Plus, Edit, Trash2, Eye, Users, Clock, ShoppingBag, Sparkles, MapPin } from 'lucide-react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import ServicePackageForm from './ServicePackageForm';
import type { ServicePackage } from '@shared/schema';

export default function ServicePackageList() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ServicePackage | null>(null);
  const [deletingPackage, setDeletingPackage] = useState<ServicePackage | null>(null);

  // Fetch user's packages
  const { data: packages = [], isLoading, error } = useQuery<ServicePackage[]>({
    queryKey: ['/api/packages/my'],
  });

  // Delete package mutation
  const deleteMutation = useMutation({
    mutationFn: async (packageId: number) => {
      return apiRequest(`/api/packages/${packageId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/packages/my'] });
      toast({
        title: '패키지 삭제 완료',
        description: '패키지가 성공적으로 삭제되었습니다.',
      });
      setDeletingPackage(null);
    },
    onError: (error) => {
      toast({
        title: '삭제 실패',
        description: error instanceof Error ? error.message : '패키지 삭제에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleDelete = (package_: ServicePackage) => {
    setDeletingPackage(package_);
  };

  const confirmDelete = () => {
    if (deletingPackage) {
      deleteMutation.mutate(deletingPackage.id);
    }
  };

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `₩${numPrice.toLocaleString()}`;
  };

  const calculateDiscount = (totalPrice: number | string, discountPercentage: number | null) => {
    if (!discountPercentage) return null;
    const price = typeof totalPrice === 'string' ? parseFloat(totalPrice) : totalPrice;
    const discountAmount = price * (discountPercentage / 100);
    return {
      originalPrice: price,
      discountAmount,
      finalPrice: price - discountAmount,
    };
  };

  if (error) {
    return (
      <div className="text-center py-8">
        <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
        <p className="text-gray-500 mb-4">패키지를 불러오는 중 오류가 발생했습니다.</p>
        <Button onClick={() => queryClient.invalidateQueries({ queryKey: ['/api/packages/my'] })}>
          다시 시도
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="h-4 bg-gray-200 rounded mb-4"></div>
              <div className="h-3 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (packages.length === 0) {
    return (
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">패키지가 없습니다</h3>
        <p className="text-gray-500 mb-6">
          여러 서비스를 묶어서 특별한 패키지를 만들어보세요
        </p>
        <Button 
          onClick={() => setShowCreateForm(true)}
          data-testid="button-create-first-package"
        >
          <Plus className="w-4 h-4 mr-2" />
          첫 번째 패키지 만들기
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">서비스 패키지</h2>
          <p className="text-sm text-gray-500">여러 서비스를 묶은 특별한 패키지들</p>
        </div>
        <Button 
          onClick={() => setShowCreateForm(true)}
          data-testid="button-create-package"
        >
          <Plus className="w-4 h-4 mr-2" />
          새 패키지
        </Button>
      </div>

      {/* Package Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {packages.map((package_: ServicePackage) => {
          const discount = calculateDiscount(package_.totalPrice, package_.discountPercentage);
          
          return (
            <Card key={package_.id} className="relative group hover:shadow-lg transition-shadow" data-testid={`package-card-${package_.id}`}>
              <CardContent className="p-6">
                {/* Status Badge */}
                <div className="absolute top-4 right-4">
                  <Badge 
                    variant={package_.isActive ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {package_.isActive ? '활성' : '비활성'}
                  </Badge>
                </div>

                {/* Package Info */}
                <div className="pr-16 mb-4">
                  <div className="flex items-start space-x-3 mb-3">
                    <div className="p-2 bg-gradient-to-br from-purple-400 to-pink-400 rounded-lg">
                      <Package className="w-5 h-5 text-white" />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900 mb-1">{package_.title}</h3>
                    </div>
                  </div>
                  
                  <p className="text-sm text-gray-600 line-clamp-3 mb-4">
                    {package_.description}
                  </p>
                </div>

                {/* Price Information */}
                <div className="mb-4">
                  {discount ? (
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <span className="text-lg font-bold text-green-600">
                          {formatPrice(discount.finalPrice)}
                        </span>
                        <Badge variant="destructive" className="text-xs">
                          {package_.discountPercentage}% 할인
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-500 line-through">
                        원래 가격: {formatPrice(discount.originalPrice)}
                      </p>
                    </div>
                  ) : (
                    <span className="text-lg font-bold text-gray-900">
                      {formatPrice(package_.totalPrice)}
                    </span>
                  )}
                </div>

                {/* Package Stats */}
                <div className="flex items-center space-x-4 text-xs text-gray-500 mb-4">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{package_.createdAt ? new Date(package_.createdAt).toLocaleDateString('ko-KR') : ''}</span>
                  </div>
                </div>

                {/* Package Items Preview */}
                <PackageItemsPreview packageId={package_.id} />
              </CardContent>

              <CardFooter className="px-6 py-4 bg-gray-50 border-t">
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {/* View package details */}}
                      data-testid={`button-view-package-${package_.id}`}
                    >
                      <Eye className="w-3 h-3 mr-1" />
                      보기
                    </Button>
                  </div>

                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-package-menu-${package_.id}`}
                      >
                        ⋮
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => setEditingPackage(package_)}
                        data-testid={`menu-edit-package-${package_.id}`}
                      >
                        <Edit className="w-4 h-4 mr-2" />
                        수정
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => handleDelete(package_)}
                        className="text-red-600"
                        data-testid={`menu-delete-package-${package_.id}`}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        삭제
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          );
        })}
      </div>

      {/* Create/Edit Package Form */}
      {(showCreateForm || editingPackage) && (
        <ServicePackageForm
          isOpen={true}
          onClose={() => {
            setShowCreateForm(false);
            setEditingPackage(null);
          }}
          package={editingPackage || undefined}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog 
        open={!!deletingPackage} 
        onOpenChange={() => setDeletingPackage(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>패키지 삭제</AlertDialogTitle>
            <AlertDialogDescription>
              '{deletingPackage?.title}' 패키지를 삭제하시겠습니까?
              <br />이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete">
              취소
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
              disabled={deleteMutation.isPending}
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

// Helper component to show package items preview  
function PackageItemsPreview({ packageId }: { packageId: number }) {
  const { data: items = [] } = useQuery<any[]>({
    queryKey: [`/api/package-items/${packageId}`],
  });

  if (items.length === 0) return null;

  return (
    <div className="border-t pt-3 mt-3">
      <p className="text-xs text-gray-500 mb-2">포함된 서비스 ({items.length}개)</p>
      <div className="flex flex-wrap gap-1">
        {items.slice(0, 3).map((item: any, index: number) => (
          <Badge 
            key={index} 
            variant="outline" 
            className="text-xs flex items-center space-x-1"
          >
            {item.itemType === 'template' ? (
              <Sparkles className="w-3 h-3" />
            ) : (
              <MapPin className="w-3 h-3" />
            )}
            <span>{item.itemType === 'template' ? '템플릿' : '체험'}</span>
          </Badge>
        ))}
        {items.length > 3 && (
          <Badge variant="outline" className="text-xs">
            +{items.length - 3}개 더
          </Badge>
        )}
      </div>
    </div>
  );
}