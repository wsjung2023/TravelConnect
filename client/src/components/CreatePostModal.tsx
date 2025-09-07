import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Camera, MapPin, Image } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import type { InsertPost } from '@shared/schema';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
  location?: { lat: number; lng: number; name?: string } | null;
}

export default function CreatePostModal({
  isOpen,
  onClose,
  location: initialLocation,
}: CreatePostModalProps) {
  const [content, setContent] = useState('');
  const [location, setLocation] = useState(
    initialLocation?.name ||
      (initialLocation
        ? `${initialLocation.lat.toFixed(4)}, ${initialLocation.lng.toFixed(4)}`
        : '')
  );
  const [images, setImages] = useState<string[]>([]);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createPostMutation = useMutation({
    mutationFn: async (post: InsertPost) => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(post),
      });
      if (!response.ok) {
        throw new Error('Failed to create post');
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: '게시글 작성 완료',
        description: '새로운 여행 스토리가 공유되었습니다!',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/posts'] });
      onClose();
      setContent('');
      setLocation('');
      setImages([]);
    },
    onError: (error) => {
      toast({
        title: '게시글 작성 실패',
        description: '게시글 작성 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: '내용 입력',
        description: '게시글 내용을 입력해주세요.',
        variant: 'destructive',
      });
      return;
    }

    const post: InsertPost = {
      userId: 'current-user', // This should come from auth
      content,
      location: location || undefined,
      images: images.length > 0 ? images : undefined,
    };

    createPostMutation.mutate(post);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-end">
      <div className="bg-white rounded-t-3xl w-full max-h-[90vh] overflow-y-auto slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">새 게시글</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-4">
          {/* Content */}
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="어떤 여행 이야기를 공유하고 싶나요?"
            className="border-0 resize-none text-base"
            rows={6}
            autoFocus
          />

          {/* Location */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <MapPin size={16} />
              <span>위치 추가</span>
            </div>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="어디에서의 이야기인가요?"
              className="border-gray-200"
            />
          </div>

          {/* Image Upload */}
          <div className="mt-4">
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
              <Image size={16} />
              <span>사진 추가</span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2">
              <button
                type="button"
                className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-primary hover:bg-primary/5 transition-colors"
              >
                <Camera size={24} className="text-gray-400" />
              </button>
              {images.map((image, index) => (
                <div key={index} className="relative w-20 h-20 flex-shrink-0">
                  <img
                    src={image}
                    alt={`Upload ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      setImages(images.filter((_, i) => i !== index))
                    }
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 mt-6 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
            >
              취소
            </Button>
            <Button
              type="submit"
              disabled={!content.trim() || createPostMutation.isPending}
              className="flex-1 travel-button"
            >
              {createPostMutation.isPending ? '게시 중...' : '게시하기'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
