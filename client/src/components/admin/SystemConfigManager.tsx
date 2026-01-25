import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { apiRequest } from '@/lib/queryClient';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Settings,
  Search,
  Save,
  RotateCcw,
  ChevronRight,
  DollarSign,
  Bot,
  Clock,
  MapPin,
  Database,
  FileText,
  Globe,
  MessageSquare,
  Compass,
  Percent,
  Hash,
  ToggleLeft,
  Braces,
  AlertCircle,
  Check,
} from 'lucide-react';

interface SystemConfig {
  id: number;
  key: string;
  category: string;
  valueType: 'string' | 'number' | 'boolean' | 'json';
  valueString: string | null;
  valueNumber: string | null;
  valueBoolean: boolean | null;
  valueJson: any | null;
  description: string | null;
  isEditable: boolean;
  validationMin: string | null;
  validationMax: string | null;
  validationPattern: string | null;
  validationOptions: string[] | null;
  environment: string;
  createdAt: string;
  updatedAt: string;
}

const CATEGORY_ICONS: Record<string, any> = {
  payment: DollarSign,
  ai: Bot,
  rate_limit: Clock,
  distance: MapPin,
  cache: Database,
  pagination: FileText,
  user_experience: Settings,
  file: FileText,
  i18n: Globe,
  comment: MessageSquare,
  geo: Compass,
  host_plan: Percent,
};

const CATEGORY_COLORS: Record<string, string> = {
  payment: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
  ai: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
  rate_limit: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
  distance: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
  cache: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
  pagination: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
  user_experience: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
  file: 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200',
  i18n: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
  comment: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
  geo: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200',
  host_plan: 'bg-rose-100 text-rose-800 dark:bg-rose-900 dark:text-rose-200',
};

export default function SystemConfigManager() {
  const { t } = useTranslation('ui');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [editingConfig, setEditingConfig] = useState<SystemConfig | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  const { data: configs, isLoading, error } = useQuery<SystemConfig[]>({
    queryKey: ['/api/system-settings'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<SystemConfig> }) => {
      return apiRequest(`/api/system-settings/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/system-settings'] });
      toast({
        title: t('admin.configUpdated', 'Setting updated'),
        description: t('admin.configUpdatedDesc', 'The configuration has been saved successfully.'),
      });
      setEditingConfig(null);
    },
    onError: (error: any) => {
      toast({
        title: t('admin.configUpdateFailed', 'Update failed'),
        description: error.message || t('admin.configUpdateFailedDesc', 'Failed to update the setting.'),
        variant: 'destructive',
      });
    },
  });

  const categories = useMemo(() => {
    if (!configs) return [];
    const cats = Array.from(new Set(configs.map((c) => c.category)));
    return cats.sort();
  }, [configs]);

  const filteredConfigs = useMemo(() => {
    if (!configs) return [];
    return configs.filter((config) => {
      const matchesCategory = selectedCategory === 'all' || config.category === selectedCategory;
      const matchesSearch =
        !searchTerm ||
        config.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
        config.description?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [configs, selectedCategory, searchTerm]);

  const groupedConfigs = useMemo(() => {
    const groups: Record<string, SystemConfig[]> = {};
    filteredConfigs.forEach((config) => {
      if (!groups[config.category]) {
        groups[config.category] = [];
      }
      groups[config.category]!.push(config);
    });
    return groups;
  }, [filteredConfigs]);

  const getValue = (config: SystemConfig): string => {
    switch (config.valueType) {
      case 'string':
        return config.valueString || '';
      case 'number':
        return config.valueNumber?.toString() || '0';
      case 'boolean':
        return config.valueBoolean ? 'true' : 'false';
      case 'json':
        return JSON.stringify(config.valueJson, null, 2);
      default:
        return '';
    }
  };

  const getValueTypeIcon = (type: string) => {
    switch (type) {
      case 'string':
        return <Hash className="w-3 h-3" />;
      case 'number':
        return <Percent className="w-3 h-3" />;
      case 'boolean':
        return <ToggleLeft className="w-3 h-3" />;
      case 'json':
        return <Braces className="w-3 h-3" />;
      default:
        return null;
    }
  };

  const openEditDialog = (config: SystemConfig) => {
    setEditingConfig(config);
    setEditValue(getValue(config));
  };

  const handleSave = () => {
    if (!editingConfig) return;

    const updates: Partial<SystemConfig> = {};

    try {
      switch (editingConfig.valueType) {
        case 'string':
          updates.valueString = editValue;
          break;
        case 'number':
          const num = parseFloat(editValue);
          if (isNaN(num)) {
            toast({
              title: t('admin.invalidNumber', 'Invalid number'),
              description: t('admin.enterValidNumber', 'Please enter a valid number.'),
              variant: 'destructive',
            });
            return;
          }
          if (editingConfig.validationMin && num < parseFloat(editingConfig.validationMin)) {
            toast({
              title: t('admin.valueTooLow', 'Value too low'),
              description: t('admin.minValue', 'Minimum value is {{min}}', { min: editingConfig.validationMin }),
              variant: 'destructive',
            });
            return;
          }
          if (editingConfig.validationMax && num > parseFloat(editingConfig.validationMax)) {
            toast({
              title: t('admin.valueTooHigh', 'Value too high'),
              description: t('admin.maxValue', 'Maximum value is {{max}}', { max: editingConfig.validationMax }),
              variant: 'destructive',
            });
            return;
          }
          updates.valueNumber = editValue;
          break;
        case 'boolean':
          updates.valueBoolean = editValue === 'true';
          break;
        case 'json':
          const parsed = JSON.parse(editValue);
          updates.valueJson = parsed;
          break;
      }

      updateMutation.mutate({ id: editingConfig.id, updates });
    } catch (e) {
      toast({
        title: t('admin.invalidJson', 'Invalid JSON'),
        description: t('admin.enterValidJson', 'Please enter valid JSON.'),
        variant: 'destructive',
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('admin.systemConfig', 'System Configuration')}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-500">
            <AlertCircle className="w-12 h-12 mx-auto mb-4" />
            <p>{t('admin.configLoadError', 'Failed to load system configuration')}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {t('admin.systemConfig', 'System Configuration')}
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            {t('admin.systemConfigDesc', 'Manage all system settings from the database. Changes take effect immediately.')}
          </p>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 mb-6 flex-col sm:flex-row">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder={t('admin.searchConfig', 'Search settings...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder={t('admin.selectCategory', 'Select category')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('admin.allCategories', 'All categories')}</SelectItem>
                {categories.map((cat) => (
                  <SelectItem key={cat} value={cat}>
                    {cat.replace('_', ' ').toUpperCase()}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="text-sm text-muted-foreground mb-4">
            {filteredConfigs.length} / {configs?.length || 0} {t('admin.settings', 'settings')}
          </div>

          <div className="space-y-6">
            {Object.entries(groupedConfigs).map(([category, categoryConfigs]) => {
              const IconComponent = CATEGORY_ICONS[category] || Settings;
              const colorClass = CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-800';

              return (
                <div key={category} className="border rounded-lg overflow-hidden">
                  <div className={`px-4 py-3 flex items-center gap-2 ${colorClass}`}>
                    <IconComponent className="w-4 h-4" />
                    <span className="font-semibold text-sm uppercase tracking-wide">
                      {category.replace('_', ' ')}
                    </span>
                    <Badge variant="secondary" className="ml-auto">
                      {categoryConfigs.length}
                    </Badge>
                  </div>
                  <div className="divide-y">
                    {categoryConfigs.map((config) => (
                      <div
                        key={config.id}
                        className="px-4 py-3 flex items-center gap-4 hover:bg-muted/50 transition-colors cursor-pointer"
                        onClick={() => config.isEditable && openEditDialog(config)}
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <code className="text-sm font-medium text-foreground">
                              {config.key}
                            </code>
                            <div className="flex items-center gap-1 text-xs text-muted-foreground">
                              {getValueTypeIcon(config.valueType)}
                              <span>{config.valueType}</span>
                            </div>
                            {!config.isEditable && (
                              <Badge variant="outline" className="text-xs">
                                Read-only
                              </Badge>
                            )}
                          </div>
                          {config.description && (
                            <p className="text-xs text-muted-foreground mt-1 truncate">
                              {config.description}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          <code className="text-sm font-mono bg-muted px-2 py-1 rounded">
                            {getValue(config).length > 30
                              ? getValue(config).slice(0, 30) + '...'
                              : getValue(config)}
                          </code>
                        </div>
                        {config.isEditable && (
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={!!editingConfig} onOpenChange={(open) => !open && setEditingConfig(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              {t('admin.editSetting', 'Edit Setting')}
            </DialogTitle>
          </DialogHeader>
          {editingConfig && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium">{t('admin.settingKey', 'Key')}</label>
                <code className="block mt-1 text-sm bg-muted px-3 py-2 rounded">
                  {editingConfig.key}
                </code>
              </div>
              {editingConfig.description && (
                <div>
                  <label className="text-sm font-medium">{t('admin.description', 'Description')}</label>
                  <p className="text-sm text-muted-foreground mt-1">{editingConfig.description}</p>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">{t('admin.value', 'Value')}</label>
                {editingConfig.valueType === 'boolean' ? (
                  <Select value={editValue} onValueChange={setEditValue}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="true">true</SelectItem>
                      <SelectItem value="false">false</SelectItem>
                    </SelectContent>
                  </Select>
                ) : editingConfig.valueType === 'json' ? (
                  <textarea
                    className="mt-1 w-full h-32 px-3 py-2 border rounded-md font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                  />
                ) : (
                  <Input
                    className="mt-1"
                    type={editingConfig.valueType === 'number' ? 'number' : 'text'}
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    min={editingConfig.validationMin || undefined}
                    max={editingConfig.validationMax || undefined}
                  />
                )}
                {(editingConfig.validationMin || editingConfig.validationMax) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    {editingConfig.validationMin && `Min: ${editingConfig.validationMin}`}
                    {editingConfig.validationMin && editingConfig.validationMax && ' / '}
                    {editingConfig.validationMax && `Max: ${editingConfig.validationMax}`}
                  </p>
                )}
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setEditingConfig(null)}>
              <RotateCcw className="w-4 h-4 mr-2" />
              {t('common.app.cancel', 'Cancel')}
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? (
                <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Save className="w-4 h-4 mr-2" />
              )}
              {t('common.app.save', 'Save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
