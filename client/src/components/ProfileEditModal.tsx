import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, Upload, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
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
import { MultiSelect, type MultiSelectOption } from '@/components/ui/multi-select';
import { LocationSearchInput } from '@/components/ui/location-search-input';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api';
import { INTEREST_OPTIONS, LANGUAGE_OPTIONS } from '@shared/constants';
import type { User } from '@shared/schema';

const profileEditSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  bio: z.string().max(500).optional(),
  location: z.string().optional(),
  interests: z.array(z.string()).optional(),
  languages: z.array(z.string()).optional(),
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
  const { t } = useTranslation(['ui', 'common']);
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
      interests: user.interests || [],
      languages: user.languages || [],
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
        interests: user.interests || [],
        languages: user.languages || [],
      });
      setImageFile(null);
      setImagePreview(null);
    }
  }, [open, user, form]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: t('ui:profileEdit.fileSizeError'),
          description: t('ui:profileEdit.fileSizeErrorDesc'),
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

        try {
          const uploadRes = await fetch('/api/upload/image', {
            method: 'POST',
            body: formData,
            headers: {
              Authorization: `Bearer ${localStorage.getItem('token')}`,
            },
          });

          if (!uploadRes.ok) {
            const errorText = await uploadRes.text();
            console.error('Image upload failed:', errorText);
            throw new Error(t('ui:profileEdit.imageUploadError'));
          }

          const uploadData = await uploadRes.json();
          profileImageUrl = uploadData.imageUrl;
        } catch (error: any) {
          console.error('Image upload error:', error?.message || error);
          setIsUploadingImage(false);
          throw error;
        }
      }

      // 프로필 정보 업데이트
      const updateData = {
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        bio: data.bio || null,
        location: data.location || null,
        interests: data.interests || [],
        languages: data.languages || [],
        profileImageUrl,
      };

      console.log('Sending profile update:', updateData);

      try {
        const result = await api('/api/user/profile', {
          method: 'PATCH',
          body: updateData,
        });
        return result;
      } catch (error: any) {
        console.error('Profile update failed:', error?.message || error);
        throw new Error(error?.message || t('ui:profileEdit.updateFailedDesc'));
      }
    },
    onSuccess: () => {
      toast({
        title: t('ui:profileEdit.updated'),
        description: t('ui:profileEdit.updatedDesc'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/me'] });
      onOpenChange(false);
      setImageFile(null);
      setImagePreview(null);
    },
    onError: (error: any) => {
      console.error('Profile update error:', error?.message || error?.toString() || error);
      toast({
        title: t('ui:profileEdit.updateFailed'),
        description: error?.message || t('ui:profileEdit.updateFailedDesc'),
        variant: 'destructive',
      });
      setIsUploadingImage(false);
    },
  });

  const onSubmit = (data: ProfileEditFormData) => {
    updateProfileMutation.mutate(data);
  };

  // 관심사 옵션 변환
  const interestOptions: MultiSelectOption[] = INTEREST_OPTIONS.map((interest) => ({
    value: interest,
    label: t(`ui:interests.${interest}`),
  }));

  // 언어 옵션 변환
  const languageOptions: MultiSelectOption[] = LANGUAGE_OPTIONS.map((lang) => ({
    value: lang.code,
    label: lang.name,
  }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {t('ui:profileEdit.title')}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* 프로필 사진 */}
            <div className="flex flex-col items-center gap-4">
              <Avatar className="w-24 h-24">
                <AvatarImage
                  src={imagePreview || user.profileImageUrl || ''}
                  alt={t('ui:profileEdit.profileImage')}
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
                    {t('ui:profileEdit.changeImage')}
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
                    <FormLabel>{t('ui:profileEdit.firstName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('ui:profileEdit.firstNamePlaceholder')}
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
                    <FormLabel>{t('ui:profileEdit.lastName')}</FormLabel>
                    <FormControl>
                      <Input
                        placeholder={t('ui:profileEdit.lastNamePlaceholder')}
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
                  <FormLabel>{t('ui:profileEdit.bio')}</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder={t('ui:profileEdit.bioPlaceholder')}
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
                  <FormLabel>{t('ui:profileEdit.location')}</FormLabel>
                  <FormControl>
                    <LocationSearchInput
                      value={field.value || ''}
                      onChange={(value) => field.onChange(value)}
                      placeholder={t('ui:profileEdit.locationPlaceholder')}
                      useCurrentLocationText={t('ui:profileEdit.useCurrentLocation')}
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
                  <FormLabel>{t('ui:profileEdit.interests')}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={interestOptions}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder={t('ui:profileEdit.interestsPlaceholder')}
                      emptyText={t('ui:profileEdit.noInterestsSelected')}
                      searchPlaceholder={t('ui:profileEdit.searchLocation')}
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
                  <FormLabel>{t('ui:profileEdit.languages')}</FormLabel>
                  <FormControl>
                    <MultiSelect
                      options={languageOptions}
                      selected={field.value || []}
                      onChange={field.onChange}
                      placeholder={t('ui:profileEdit.languagesPlaceholder')}
                      emptyText={t('ui:profileEdit.noLanguagesSelected')}
                      searchPlaceholder={t('ui:profileEdit.searchLocation')}
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
                {t('common:app.cancel')}
              </Button>
              <Button
                type="submit"
                disabled={updateProfileMutation.isPending || isUploadingImage}
                data-testid="button-save-profile"
              >
                {updateProfileMutation.isPending || isUploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingImage ? t('ui:profileEdit.uploading') : t('ui:profileEdit.saving')}
                  </>
                ) : (
                  t('common:app.save')
                )}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
