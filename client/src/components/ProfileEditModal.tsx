import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2 } from 'lucide-react';
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
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import type { User } from '@shared/schema';

const profileEditSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(500, '자기소개는 500자 이내로 작성해주세요').optional(),
  location: z.string().optional(),
  interests: z.string().optional(), // 쉼표로 구분된 문자열
  languages: z.string().optional(), // 쉼표로 구분된 문자열
});

type ProfileEditFormData = z.infer<typeof profileEditSchema>;

interface ProfileEditModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  user: User;
}

export default function ProfileEditModal({
  open,
  onOpenChange,
  user,
}: ProfileEditModalProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const form = useForm<ProfileEditFormData>({
    resolver: zodResolver(profileEditSchema),
    defaultValues: {
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      bio: user.bio || '',
      location: user.location || '',
      interests: user.interests?.join(', ') || '',
      languages: user.languages?.join(', ') || '',
    },
  });

  // user가 변경되거나 모달이 열릴 때 폼 초기화
  useEffect(() => {
    if (open) {
      form.reset({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        bio: user.bio || '',
        location: user.location || '',
        interests: user.interests?.join(', ') || '',
        languages: user.languages?.join(', ') || '',
      });
      // 이미지 프리뷰도 초기화
      setImageFile(null);
      setImagePreview(null);
    }
  }, [open, user, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: '파일 크기 초과',
          description: '이미지는 5MB 이하로 업로드해주세요.',
          variant: 'destructive',
        });
        return;
      }

      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileEditFormData) => {
      let profileImageUrl = user.profileImageUrl;

      // 이미지가 변경된 경우 먼저 업로드
      if (imageFile) {
        setIsUploadingImage(true);
        const formData = new FormData();
        formData.append('image', imageFile);

        const uploadRes = await fetch('/api/upload/image', {
          method: 'POST',
          body: formData,
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        });

        if (!uploadRes.ok) {
          throw new Error('이미지 업로드 실패');
        }

        const uploadData = await uploadRes.json();
        profileImageUrl = uploadData.imageUrl;
        setIsUploadingImage(false);
      }

      // 프로필 정보 업데이트
      return api('/api/user/profile', {
        method: 'PATCH',
        body: {
          firstName: data.firstName || null,
          lastName: data.lastName || null,
          bio: data.bio || null,
          location: data.location || null,
          interests: data.interests
            ? data.interests.split(',').map((i) => i.trim()).filter(Boolean)
            : [],
          languages: data.languages
            ? data.languages.split(',').map((l) => l.trim()).filter(Boolean)
            : [],
          profileImageUrl,
        },
      });
    },
    onSuccess: () => {
      toast({
        title: '프로필 업데이트 완료',
        description: '프로필 정보가 성공적으로 업데이트되었습니다.',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onOpenChange(false);
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (error) => {
      console.error('프로필 업데이트 오류:', error);
      toast({
        title: '업데이트 실패',
        description: '프로필 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
      setIsUploadingImage(false);
    },
  });

  const onSubmit = (data: ProfileEditFormData) => {
    updateProfileMutation.mutate(data);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">프로필 편집</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 프로필 사진 */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={imagePreview || user.profileImageUrl || ''}
                  alt="프로필 사진"
                />
                <AvatarFallback className="text-2xl">
                  {user.firstName?.[0] || user.email?.[0]?.toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="hidden"
                  id="profile-image-upload"
                  data-testid="input-profile-image"
                />
                <label htmlFor="profile-image-upload">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('profile-image-upload')?.click()}
                    data-testid="button-upload-image"
                  >
                    <Upload size={16} className="mr-2" />
                    사진 변경
                  </Button>
                </label>
              </div>
            </div>

            {/* 이름 */}
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>이름</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="이름을 입력하세요"
                        {...field}
                        data-testid="input-first-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="lastName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>성</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="성을 입력하세요"
                        {...field}
                        data-testid="input-last-name"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* 자기소개 */}
            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>자기소개</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="자신을 소개해주세요..."
                      className="min-h-[100px] resize-none"
                      {...field}
                      data-testid="input-bio"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 위치 */}
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>위치</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="예: 서울, 대한민국"
                      {...field}
                      data-testid="input-location"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 관심사 */}
            <FormField
              control={form.control}
              name="interests"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>관심사</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="여행, 사진, 맛집 (쉼표로 구분)"
                      {...field}
                      data-testid="input-interests"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 언어 */}
            <FormField
              control={form.control}
              name="languages"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>사용 가능한 언어</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="한국어, 영어, 일본어 (쉼표로 구분)"
                      {...field}
                      data-testid="input-languages"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* 버튼 */}
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={updateProfileMutation.isPending || isUploadingImage}
                data-testid="button-cancel"
              >
                취소
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || isUploadingImage}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending || isUploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingImage ? '이미지 업로드 중...' : '저장 중...'}
                  </>
                ) : (
                  '저장'
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
