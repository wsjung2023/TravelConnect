import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { X, Package, Plus, Trash2, ShoppingBag, MapPin, Sparkles } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import type { ServicePackage, ServiceTemplate, Experience } from '@shared/schema';

// Form validation schema
const packageFormSchema = z.object({
  title: z.string().min(1, '패키지 제목을 입력해주세요'),
  description: z.string().min(10, '패키지 설명을 10자 이상 입력해주세요'),
  totalPrice: z.string().min(1, '총 가격을 입력해주세요'),
  discountPercentage: z.string().optional(),
  isActive: z.boolean().default(true),
});

type PackageFormData = z.infer<typeof packageFormSchema>;

interface PackageItem {
  itemType: 'experience' | 'template';
  itemId: number;
  quantity: number;
  title: string;
  basePrice?: number;
}

interface ServicePackageFormProps {
  isOpen: boolean;
  onClose: () => void;
  package?: ServicePackage;
}

export default function ServicePackageForm({ 
  isOpen, 
  onClose, 
  package: existingPackage 
}: ServicePackageFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedItems, setSelectedItems] = useState<PackageItem[]>([]);

  const form = useForm<PackageFormData>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: {
      title: '',
      description: '',
      totalPrice: '',
      discountPercentage: '0',
      isActive: true,
    },
  });

  // Fetch user's templates and experiences
  const { data: templates = [] } = useQuery<ServiceTemplate[]>({
    queryKey: ['/api/templates/my'],
  });

  const { data: experiences = [] } = useQuery<Experience[]>({
    queryKey: ['/api/experiences/my'],
  });

  // Load existing package data if editing
  useEffect(() => {
    if (existingPackage && isOpen) {
      form.reset({
        title: existingPackage.title,
        description: existingPackage.description,
        totalPrice: existingPackage.totalPrice.toString(),
        discountPercentage: existingPackage.discountPercentage?.toString() || '0',
        isActive: existingPackage.isActive ?? true,
      });

      // Load package items
      if (existingPackage.id) {
        queryClient.fetchQuery({
          queryKey: [`/api/package-items/${existingPackage.id}`],
        }).then((items: any[]) => {
          setSelectedItems(items.map(item => ({
            itemType: item.itemType,
            itemId: item.itemId,
            quantity: item.quantity,
            title: item.itemType === 'template' 
              ? templates.find(t => t.id === item.itemId)?.title || 'Template'
              : experiences.find(e => e.id === item.itemId)?.title || 'Experience',
            basePrice: item.itemType === 'template'
              ? templates.find(t => t.id === item.itemId)?.basePrice
              : experiences.find(e => e.id === item.itemId)?.price,
          })));
        });
      }
    }
  }, [existingPackage, isOpen, form, queryClient, templates, experiences]);

  // Create/Update package mutation
  const packageMutation = useMutation({
    mutationFn: async (data: PackageFormData) => {
      const packageData = {
        ...data,
        totalPrice: parseFloat(data.totalPrice),
        discountPercentage: data.discountPercentage ? parseFloat(data.discountPercentage) : 0,
      };

      if (existingPackage) {
        return apiRequest(`/api/packages/${existingPackage.id}`, {
          method: 'PUT',
          body: packageData,
        });
      } else {
        return apiRequest('/api/packages/create', {
          method: 'POST',
          body: packageData,
        });
      }
    },
    onSuccess: async (newPackage) => {
      // Handle package items
      if (selectedItems.length > 0) {
        for (const item of selectedItems) {
          await apiRequest('/api/package-items', {
            method: 'POST',
            body: {
              packageId: newPackage.id,
              itemType: item.itemType,
              itemId: item.itemId,
              quantity: item.quantity,
            },
          });
        }
      }

      await queryClient.invalidateQueries({ queryKey: ['/api/packages/my'] });
      toast({
        title: existingPackage ? '패키지 수정 완료' : '패키지 생성 완료',
        description: `${form.getValues('title')} 패키지가 ${existingPackage ? '수정' : '생성'}되었습니다.`,
      });
      handleClose();
    },
    onError: (error) => {
      toast({
        title: '오류가 발생했습니다',
        description: error instanceof Error ? error.message : '패키지 저장에 실패했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    form.reset();
    setSelectedItems([]);
    onClose();
  };

  const addItem = (type: 'experience' | 'template', id: number) => {
    const source = type === 'template' ? templates : experiences;
    const item = source.find(item => item.id === id);
    
    if (!item) return;

    const newItem: PackageItem = {
      itemType: type,
      itemId: id,
      quantity: 1,
      title: item.title,
      basePrice: type === 'template' ? item.basePrice : item.price,
    };

    setSelectedItems(prev => [...prev, newItem]);
    calculateTotalPrice([...selectedItems, newItem]);
  };

  const removeItem = (index: number) => {
    const newItems = selectedItems.filter((_, i) => i !== index);
    setSelectedItems(newItems);
    calculateTotalPrice(newItems);
  };

  const updateQuantity = (index: number, quantity: number) => {
    const newItems = selectedItems.map((item, i) => 
      i === index ? { ...item, quantity } : item
    );
    setSelectedItems(newItems);
    calculateTotalPrice(newItems);
  };

  const calculateTotalPrice = (items: PackageItem[]) => {
    const total = items.reduce((sum, item) => {
      const price = item.basePrice || 0;
      return sum + (price * item.quantity);
    }, 0);
    form.setValue('totalPrice', total.toString());
  };

  const onSubmit = (data: PackageFormData) => {
    if (selectedItems.length === 0) {
      toast({
        title: '패키지 구성 필요',
        description: '패키지에 포함할 서비스나 템플릿을 최소 1개 선택해주세요.',
        variant: 'destructive',
      });
      return;
    }
    packageMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto" data-testid="service-package-form-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Package className="w-5 h-5" />
            <span>{existingPackage ? '패키지 수정' : '새 패키지 만들기'}</span>
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Basic Info */}
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>패키지 제목</FormLabel>
                    <FormControl>
                      <Input 
                        {...field} 
                        placeholder="예: 부산 완전정복 패키지"
                        data-testid="input-package-title"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>패키지 설명</FormLabel>
                    <FormControl>
                      <Textarea 
                        {...field} 
                        placeholder="이 패키지에 포함된 서비스들과 특별한 혜택을 설명해주세요..."
                        rows={3}
                        data-testid="textarea-package-description"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="totalPrice"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>총 가격 (원)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="0"
                          data-testid="input-package-price"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="discountPercentage"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>할인율 (%)</FormLabel>
                      <FormControl>
                        <Input 
                          {...field} 
                          type="number"
                          placeholder="0"
                          min="0"
                          max="100"
                          data-testid="input-package-discount"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </div>

            {/* Package Items */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium">패키지 구성</h3>
                <div className="space-x-2">
                  <Select onValueChange={(value) => {
                    const [type, id] = value.split('-');
                    addItem(type as 'experience' | 'template', parseInt(id));
                  }}>
                    <SelectTrigger className="w-48" data-testid="select-add-item">
                      <SelectValue placeholder="서비스/템플릿 추가" />
                    </SelectTrigger>
                    <SelectContent>
                      {templates.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500">내 템플릿</div>
                          {templates.map((template) => (
                            <SelectItem key={`template-${template.id}`} value={`template-${template.id}`}>
                              <div className="flex items-center space-x-2">
                                <Sparkles className="w-4 h-4" />
                                <span>{template.title}</span>
                                <span className="text-xs text-gray-500">₩{Number(template.basePrice).toLocaleString()}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                      {experiences.length > 0 && (
                        <>
                          <div className="px-2 py-1 text-xs font-semibold text-gray-500">내 체험</div>
                          {experiences.map((experience) => (
                            <SelectItem key={`experience-${experience.id}`} value={`experience-${experience.id}`}>
                              <div className="flex items-center space-x-2">
                                <MapPin className="w-4 h-4" />
                                <span>{experience.title}</span>
                                <span className="text-xs text-gray-500">₩{Number(experience.price).toLocaleString()}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {selectedItems.length === 0 ? (
                <Card className="p-6 text-center text-gray-500">
                  <ShoppingBag className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>패키지에 포함할 서비스나 템플릿을 선택해주세요</p>
                </Card>
              ) : (
                <div className="space-y-3">
                  {selectedItems.map((item, index) => (
                    <Card key={`${item.itemType}-${item.itemId}-${index}`} className="p-4" data-testid={`package-item-${index}`}>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          {item.itemType === 'template' ? (
                            <Sparkles className="w-5 h-5 text-purple-500" />
                          ) : (
                            <MapPin className="w-5 h-5 text-blue-500" />
                          )}
                          <div>
                            <h4 className="font-medium">{item.title}</h4>
                            <Badge variant="outline" className="text-xs">
                              {item.itemType === 'template' ? '템플릿' : '체험'}
                            </Badge>
                          </div>
                        </div>
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm">수량:</span>
                            <Input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseInt(e.target.value) || 1)}
                              className="w-16 text-center"
                              data-testid={`input-quantity-${index}`}
                            />
                          </div>
                          <span className="text-sm font-medium">
                            ₩{Number(item.basePrice || 0).toLocaleString()}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeItem(index)}
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* Submit */}
            <div className="flex justify-end space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                data-testid="button-cancel-package"
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={packageMutation.isPending}
                data-testid="button-submit-package"
              >
                {packageMutation.isPending ? '저장 중...' : (existingPackage ? '수정하기' : '생성하기')}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}