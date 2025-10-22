import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { insertServiceTemplateSchema } from '@shared/schema';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { X, Plus, Sparkles, Camera, MapPin, ShoppingBag, MessageCircle } from 'lucide-react';

const templateFormSchema = insertServiceTemplateSchema.extend({
  basePrice: z.coerce.number().min(1000, '최소 가격은 1,000원입니다'),
  durationHours: z.coerce.number().min(1, '최소 1시간 이상이어야 합니다').optional(),
  maxParticipants: z.coerce.number().min(1, '최소 1명 이상이어야 합니다').optional(),
});

type ServiceTemplateFormData = z.infer<typeof templateFormSchema>;

interface ServiceTemplateFormProps {
  isOpen: boolean;
  onClose: () => void;
  template?: any; // ServiceTemplate type for editing
}

const templateTypes = [
  { 
    value: 'custom_planning', 
    label: '맞춤 코스 짜드려요',
    description: '개인 취향에 맞는 완전 맞춤 여행 코스를 제작해 드립니다',
    icon: MapPin,
    color: 'bg-blue-100 text-blue-700'
  },
  { 
    value: 'food_list', 
    label: '먹킷리스트',
    description: '현지인만 아는 진짜 맛집들을 엄선해서 리스트로 드려요',
    icon: ShoppingBag,
    color: 'bg-green-100 text-green-700'
  },
  { 
    value: 'photo_companion', 
    label: '촬영 동행',
    description: '인생샷 스팟에서 전문적인 촬영 서비스를 제공합니다',
    icon: Camera,
    color: 'bg-purple-100 text-purple-700'
  },
  { 
    value: 'translation', 
    label: '번역 서비스',
    description: '현지 언어 번역 및 의사소통을 도와드립니다',
    icon: MessageCircle,
    color: 'bg-orange-100 text-orange-700'
  },
  { 
    value: 'shopping_guide', 
    label: '쇼핑 가이드',
    description: '현지 쇼핑몰과 브랜드 쇼핑을 전문적으로 안내해드려요',
    icon: ShoppingBag,
    color: 'bg-pink-100 text-pink-700'
  },
];

export default function ServiceTemplateForm({ isOpen, onClose, template }: ServiceTemplateFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [includesTags, setIncludesTags] = useState<string[]>(template?.includes || []);
  const [requirementsTags, setRequirementsTags] = useState<string[]>(template?.requirements || []);
  const [sampleTags, setSampleTags] = useState<string[]>(template?.sampleDeliverables || []);
  const [newInclude, setNewInclude] = useState('');
  const [newRequirement, setNewRequirement] = useState('');
  const [newSample, setNewSample] = useState('');

  const form = useForm<ServiceTemplateFormData>({
    resolver: zodResolver(templateFormSchema),
    defaultValues: template ? {
      ...template,
      basePrice: parseFloat(template.basePrice),
      durationHours: template.durationHours || undefined,
      maxParticipants: template.maxParticipants || 1,
    } : {
      templateType: '',
      title: '',
      description: '',
      basePrice: 50000,
      currency: 'KRW',
      durationHours: 2,
      maxParticipants: 1,
    },
  });

  const createMutation = useMutation({
    mutationFn: async (data: ServiceTemplateFormData) => {
      const payload = {
        ...data,
        basePrice: data.basePrice.toString(),
        includes: includesTags,
        requirements: requirementsTags,
        sampleDeliverables: sampleTags,
      };
      
      if (template) {
        return apiRequest(`/api/templates/${template.id}`, {
          method: 'PUT',
          body: payload as any,
        });
      } else {
        return apiRequest('/api/templates/create', {
          method: 'POST',
          body: payload as any,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/templates/my'] });
      toast({
        title: template ? '템플릿 수정 완료' : '템플릿 생성 완료',
        description: template ? '서비스 템플릿이 성공적으로 수정되었습니다.' : '새로운 서비스 템플릿이 생성되었습니다.',
      });
      onClose();
      form.reset();
      setIncludesTags([]);
      setRequirementsTags([]);
      setSampleTags([]);
    },
    onError: (error: any) => {
      toast({
        title: '오류 발생',
        description: error?.message || '템플릿 처리 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const addTag = (tagValue: string, setter: (tags: string[]) => void, currentTags: string[], inputSetter: (value: string) => void) => {
    if (tagValue.trim() && !currentTags.includes(tagValue.trim())) {
      setter([...currentTags, tagValue.trim()]);
      inputSetter('');
    }
  };

  const removeTag = (tagToRemove: string, setter: (tags: string[]) => void, currentTags: string[]) => {
    setter(currentTags.filter(tag => tag !== tagToRemove));
  };

  const onSubmit = (data: ServiceTemplateFormData) => {
    createMutation.mutate(data);
  };

  const selectedTemplateType = templateTypes.find(t => t.value === form.watch('templateType'));

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" data-testid="service-template-form-modal">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-purple-500" />
            <span>{template ? '서비스 템플릿 수정' : '새로운 서비스 템플릿 만들기'}</span>
          </DialogTitle>
          <DialogDescription>
            인플루언서로서 제공할 수 있는 서비스 템플릿을 만들어보세요. 여행객들이 원하는 서비스를 체계적으로 제공할 수 있습니다.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 템플릿 타입 선택 */}
            <FormField
              control={form.control}
              name="templateType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>템플릿 종류</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger data-testid="select-template-type">
                        <SelectValue placeholder="제공하고 싶은 서비스 종류를 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {templateTypes.map((type) => {
                        const Icon = type.icon;
                        return (
                          <SelectItem key={type.value} value={type.value}>
                            <div className="flex items-center space-x-2">
                              <Icon className="w-4 h-4" />
                              <span>{type.label}</span>
                            </div>
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                  {selectedTemplateType && (
                    <div className={`p-3 rounded-lg ${selectedTemplateType.color}`}>
                      <p className="text-sm">{selectedTemplateType.description}</p>
                    </div>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 기본 정보 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>템플릿 제목</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="예: 부산 현지인 맛집 투어"
                        data-testid="input-template-title"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="basePrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>기본 가격 (원)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="50000"
                        data-testid="input-template-price"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>상세 설명</FormLabel>
                  <FormControl>
                    <Textarea 
                      placeholder="이 템플릿으로 어떤 서비스를 제공하는지 자세히 설명해주세요..."
                      className="min-h-[100px]"
                      data-testid="textarea-template-description"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 추가 옵션 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="durationHours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>예상 소요 시간 (시간)</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="2"
                        data-testid="input-template-duration"
                        {...field}
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="maxParticipants"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>최대 참가자 수</FormLabel>
                    <FormControl>
                      <Input 
                        type="number"
                        placeholder="1"
                        data-testid="input-template-participants"
                        {...field}
                        value={field.value || 1}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 포함 사항 */}
            <div className="space-y-2">
              <FormLabel>포함 사항</FormLabel>
              <div className="flex space-x-2">
                <Input 
                  placeholder="예: 맛집 리스트, 예약 대행"
                  value={newInclude}
                  onChange={(e) => setNewInclude(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newInclude, setIncludesTags, includesTags, setNewInclude))}
                  data-testid="input-template-includes"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => addTag(newInclude, setIncludesTags, includesTags, setNewInclude)}
                  data-testid="button-add-includes"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {includesTags.map((tag, index) => (
                  <Badge key={index} variant="secondary" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button 
                      type="button"
                      onClick={() => removeTag(tag, setIncludesTags, includesTags)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 필수 조건 */}
            <div className="space-y-2">
              <FormLabel>필수 조건</FormLabel>
              <div className="flex space-x-2">
                <Input 
                  placeholder="예: 사전 예약 필수, 현금 준비"
                  value={newRequirement}
                  onChange={(e) => setNewRequirement(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newRequirement, setRequirementsTags, requirementsTags, setNewRequirement))}
                  data-testid="input-template-requirements"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => addTag(newRequirement, setRequirementsTags, requirementsTags, setNewRequirement)}
                  data-testid="button-add-requirements"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {requirementsTags.map((tag, index) => (
                  <Badge key={index} variant="outline" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button 
                      type="button"
                      onClick={() => removeTag(tag, setRequirementsTags, requirementsTags)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 샘플 결과물 */}
            <div className="space-y-2">
              <FormLabel>샘플 결과물</FormLabel>
              <div className="flex space-x-2">
                <Input 
                  placeholder="예: 개인별 맞춤 맛집 지도, 예약 확정서"
                  value={newSample}
                  onChange={(e) => setNewSample(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag(newSample, setSampleTags, sampleTags, setNewSample))}
                  data-testid="input-template-samples"
                />
                <Button 
                  type="button" 
                  variant="outline"
                  onClick={() => addTag(newSample, setSampleTags, sampleTags, setNewSample)}
                  data-testid="button-add-samples"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {sampleTags.map((tag, index) => (
                  <Badge key={index} variant="default" className="flex items-center space-x-1">
                    <span>{tag}</span>
                    <button 
                      type="button"
                      onClick={() => removeTag(tag, setSampleTags, sampleTags)}
                      className="ml-1 hover:bg-gray-300 rounded-full p-0.5"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            {/* 액션 버튼 */}
            <div className="flex justify-end space-x-2 pt-4">
              <Button 
                type="button" 
                variant="outline" 
                onClick={onClose}
                data-testid="button-cancel-template"
              >
                취소
              </Button>
              <Button 
                type="submit" 
                disabled={createMutation.isPending}
                data-testid="button-submit-template"
              >
                {createMutation.isPending 
                  ? (template ? '수정 중...' : '생성 중...') 
                  : (template ? '수정 완료' : '템플릿 생성')
                }
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}