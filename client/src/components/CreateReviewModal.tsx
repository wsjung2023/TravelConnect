import { useState, useRef } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useToast } from '@/hooks/use-toast';
import { Star, Camera, X, MessageSquare } from 'lucide-react';
import { insertReviewSchema } from '@shared/schema';
import { api } from '@/lib/api';
import type { InsertReview, Booking } from '@shared/schema';

interface CreateReviewModalProps {
  booking: Booking;
  children: React.ReactNode;
}

interface StarRatingProps {
  rating: number;
  onRatingChange: (rating: number) => void;
}

function StarRating({ rating, onRatingChange }: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          className="text-2xl transition-colors focus:outline-none"
          onMouseEnter={() => setHoverRating(star)}
          onMouseLeave={() => setHoverRating(0)}
          onClick={() => onRatingChange(star)}
          data-testid={`star-${star}`}
        >
          <Star
            className={`w-8 h-8 ${
              star <= (hoverRating || rating)
                ? 'fill-yellow-400 text-yellow-400'
                : 'text-gray-300'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

export default function CreateReviewModal({ booking, children }: CreateReviewModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const form = useForm<InsertReview>({
    resolver: zodResolver(insertReviewSchema),
    defaultValues: {
      experienceId: booking.experienceId,
      bookingId: booking.id,
      reviewerId: '', // 서버에서 현재 사용자로 설정
      rating: 5,
      comment: '',
      images: [],
    },
  });

  const createReviewMutation = useMutation({
    mutationFn: async (data: InsertReview) => {
      const reviewData = {
        ...data,
        images: uploadedImages,
      };
      return api('/api/reviews', {
        method: 'POST',
        body: reviewData,
      });
    },
    onSuccess: () => {
      toast({
        title: '후기 등록 완료',
        description: '소중한 후기를 남겨주셔서 감사합니다!',
      });
      
      // 관련 쿼리들 갱신
      queryClient.invalidateQueries({ queryKey: ['/api/experiences'] });
      queryClient.invalidateQueries({ queryKey: ['/api/bookings'] });
      queryClient.invalidateQueries({ queryKey: ['/api/reviews'] });
      
      setIsOpen(false);
      form.reset();
      setUploadedImages([]);
    },
    onError: (error) => {
      console.error('Review creation error:', error);
      toast({
        title: '후기 등록 실패',
        description: '후기 등록 중 오류가 발생했습니다. 다시 시도해주세요.',
        variant: 'destructive',
      });
    },
  });

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files) return;

    // 최대 5개 이미지 제한
    if (uploadedImages.length + files.length > 5) {
      toast({
        title: '이미지 개수 초과',
        description: '이미지는 최대 5개까지 업로드 가능합니다.',
        variant: 'destructive',
      });
      return;
    }

    const formData = new FormData();
    Array.from(files).forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const result = await response.json();
        setUploadedImages(prev => [...prev, ...result.files]);
        toast({
          title: '이미지 업로드 완료',
          description: `${result.files.length}개의 이미지가 업로드되었습니다.`,
        });
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      console.error('Image upload error:', error);
      toast({
        title: '이미지 업로드 실패',
        description: '이미지 업로드 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const onSubmit = (data: InsertReview) => {
    createReviewMutation.mutate(data);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5" />
            후기 작성
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 평점 */}
            <FormField
              control={form.control}
              name="rating"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>평점</FormLabel>
                  <FormControl>
                    <div className="space-y-2">
                      <StarRating
                        rating={field.value}
                        onRatingChange={field.onChange}
                      />
                      <p className="text-sm text-gray-600">
                        {field.value === 1 && '매우 불만족'}
                        {field.value === 2 && '불만족'}
                        {field.value === 3 && '보통'}
                        {field.value === 4 && '만족'}
                        {field.value === 5 && '매우 만족'}
                      </p>
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 후기 내용 */}
            <FormField
              control={form.control}
              name="comment"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>후기 내용</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      value={field.value || ''}
                      placeholder="경험에 대한 솔직한 후기를 작성해주세요..."
                      className="min-h-[120px] resize-none"
                      data-testid="input-review-comment"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 이미지 업로드 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">후기 사진 (선택사항)</label>
              
              <div className="flex flex-wrap gap-3">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative">
                    <img
                      src={image}
                      alt={`후기 이미지 ${index + 1}`}
                      className="w-20 h-20 object-cover rounded-lg border"
                    />
                    <button
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600"
                      data-testid={`remove-image-${index}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
                
                {uploadedImages.length < 5 && (
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors"
                    data-testid="button-upload-image"
                  >
                    <Camera className="w-6 h-6 text-gray-400" />
                  </button>
                )}
              </div>

              <Input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="hidden"
              />
              
              <p className="text-xs text-gray-500">
                이미지는 최대 5개까지 업로드 가능합니다
              </p>
            </div>

            {/* 제출 버튼 */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                className="flex-1"
                data-testid="button-cancel-review"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={createReviewMutation.isPending}
                className="flex-1"
                data-testid="button-submit-review"
              >
                {createReviewMutation.isPending ? '등록 중...' : '후기 등록'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}