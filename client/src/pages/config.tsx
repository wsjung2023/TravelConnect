import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';
import {
  Settings,
  Save,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  ShieldAlert,
} from 'lucide-react';

interface SystemSetting {
  id: string;
  category: string;
  key: string;
  value: string;
  description: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const categoryColors = {
  oauth: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
  api: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  ui: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
  business:
    'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
  notification: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
};

const categoryDescriptions = {
  oauth: 'OAuth 인증 관련 설정',
  api: 'API 요청 및 제한 설정',
  ui: '사용자 인터페이스 설정',
  business: '비즈니스 로직 설정',
  notification: '알림 시스템 설정',
};

export default function ConfigPage() {
  const { toast } = useToast();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const queryClient = useQueryClient();
  const [editingSettings, setEditingSettings] = useState<
    Record<string, Partial<SystemSetting>>
  >({});

  // 관리자 권한 확인
  useEffect(() => {
    if (!authLoading && (!isAuthenticated || user?.role !== 'admin')) {
      toast({
        title: '접근 권한 없음',
        description: '관리자만 Configuration Panel에 접근할 수 있습니다.',
        variant: 'destructive',
      });
      setTimeout(() => {
        window.location.href = '/';
      }, 2000);
    }
  }, [authLoading, isAuthenticated, user, toast]);

  // 관리자가 아닌 경우 접근 차단 UI
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <ShieldAlert className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                접근 권한 없음
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                관리자만 Configuration Panel에 접근할 수 있습니다.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const {
    data: settings = [],
    isLoading,
    error,
  } = useQuery<SystemSetting[]>({
    queryKey: ['/api/system-settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: Partial<SystemSetting>;
    }) => {
      return await apiRequest(`/api/system-settings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      toast({
        title: '설정 업데이트 완료',
        description: '시스템 설정이 성공적으로 업데이트되었습니다.',
      });
      setEditingSettings({});
    },
    onError: (error) => {
      toast({
        title: '업데이트 실패',
        description: '설정 업데이트 중 오류가 발생했습니다.',
        variant: 'destructive',
      });
    },
  });

  const handleEditChange = (
    id: string,
    field: string,
    value: string | boolean
  ) => {
    setEditingSettings((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [field]: value,
      },
    }));
  };

  const handleSave = (setting: SystemSetting) => {
    const updates = editingSettings[setting.id];
    if (updates) {
      updateMutation.mutate({ id: setting.id, updates });
    }
  };

  const handleCancel = (id: string) => {
    setEditingSettings((prev) => {
      const { [id]: removed, ...rest } = prev;
      return rest;
    });
  };

  const getCurrentValue = (setting: SystemSetting, field: string) => {
    return (
      editingSettings[setting.id]?.[field as keyof SystemSetting] ??
      setting[field as keyof SystemSetting]
    );
  };

  const isEditing = (id: string) => !!editingSettings[id];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-center h-64 text-red-500">
            <AlertCircle className="h-8 w-8 mr-2" />
            설정을 불러오는 중 오류가 발생했습니다.
          </div>
        </div>
      </div>
    );
  }

  const groupedSettings = settings.reduce(
    (acc, setting) => {
      if (!acc[setting.category]) {
        acc[setting.category] = [];
      }
      acc[setting.category].push(setting);
      return acc;
    },
    {} as Record<string, SystemSetting[]>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Configuration Control Panel
            </h1>
          </div>
          <p className="text-gray-600 dark:text-gray-400">
            시스템 설정값을 관리하고 조정할 수 있습니다. 변경 사항은 즉시
            적용됩니다.
          </p>
        </div>

        {/* Settings by Category */}
        <div className="space-y-8">
          {Object.entries(groupedSettings).map(
            ([category, categorySettings]) => (
              <Card key={category} className="shadow-lg">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Badge
                          className={
                            categoryColors[
                              category as keyof typeof categoryColors
                            ]
                          }
                        >
                          {category.toUpperCase()}
                        </Badge>
                        {
                          categoryDescriptions[
                            category as keyof typeof categoryDescriptions
                          ]
                        }
                      </CardTitle>
                      <CardDescription>
                        {categorySettings.length}개 설정항목
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {categorySettings.map((setting) => (
                      <div
                        key={setting.id}
                        className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-800"
                      >
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                          {/* Setting Info */}
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <Label className="font-semibold text-sm">
                                {setting.key}
                              </Label>
                              <Switch
                                checked={
                                  getCurrentValue(
                                    setting,
                                    'isActive'
                                  ) as boolean
                                }
                                onCheckedChange={(checked) =>
                                  handleEditChange(
                                    setting.id,
                                    'isActive',
                                    checked
                                  )
                                }
                                data-testid={`switch-active-${setting.id}`}
                              />
                            </div>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              {
                                getCurrentValue(
                                  setting,
                                  'description'
                                ) as string
                              }
                            </p>
                          </div>

                          {/* Value Input */}
                          <div className="space-y-2">
                            <Label className="text-sm">설정값</Label>
                            <Input
                              value={
                                getCurrentValue(setting, 'value') as string
                              }
                              onChange={(e) =>
                                handleEditChange(
                                  setting.id,
                                  'value',
                                  e.target.value
                                )
                              }
                              placeholder="설정값을 입력하세요"
                              data-testid={`input-value-${setting.id}`}
                            />
                          </div>

                          {/* Description Input */}
                          <div className="space-y-2">
                            <Label className="text-sm">설명</Label>
                            <Textarea
                              value={
                                getCurrentValue(
                                  setting,
                                  'description'
                                ) as string
                              }
                              onChange={(e) =>
                                handleEditChange(
                                  setting.id,
                                  'description',
                                  e.target.value
                                )
                              }
                              placeholder="설정에 대한 설명을 입력하세요"
                              rows={2}
                              data-testid={`textarea-description-${setting.id}`}
                            />
                          </div>
                        </div>

                        {/* Action Buttons */}
                        {isEditing(setting.id) && (
                          <div className="flex gap-2 mt-4 pt-4 border-t">
                            <Button
                              onClick={() => handleSave(setting)}
                              disabled={updateMutation.isPending}
                              size="sm"
                              data-testid={`button-save-${setting.id}`}
                            >
                              <Save className="h-4 w-4 mr-1" />
                              저장
                            </Button>
                            <Button
                              onClick={() => handleCancel(setting.id)}
                              variant="outline"
                              size="sm"
                              data-testid={`button-cancel-${setting.id}`}
                            >
                              취소
                            </Button>
                          </div>
                        )}

                        {/* Last Updated */}
                        <div className="mt-4 pt-4 border-t text-xs text-gray-500 dark:text-gray-400">
                          마지막 업데이트:{' '}
                          {new Date(setting.updatedAt).toLocaleString('ko-KR')}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )
          )}
        </div>

        {/* Footer */}
        <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300">
            <CheckCircle className="h-5 w-5" />
            <span className="text-sm font-medium">
              모든 설정 변경사항은 즉시 시스템에 반영됩니다.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
