import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MapPin, DollarSign, Calendar, MessageCircle } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import Modal from '@/components/ui/Modal';

interface HelpRequestFormProps {
  isOpen: boolean;
  onClose: () => void;
  initialLocation?: {
    lat: number;
    lng: number;
    name?: string;
  };
}

interface HelpRequestData {
  title: string;
  description: string;
  category: 'local_tip' | 'custom_planning' | 'urgent_help' | 'product_purchase';
  location?: string;
  latitude?: number | undefined;
  longitude?: number | undefined;
  budgetMin?: number | undefined;
  budgetMax?: number | undefined;
  currency: string;
  deadline?: string;
  urgencyLevel: 'urgent' | 'normal' | 'flexible';
  preferredLanguage: string;
  tags: string[];
}

const categories = [
  { id: 'local_tip', icon: MessageCircle, titleKey: 'helpRequest.categories.localTip', descKey: 'helpRequest.categories.localTipDesc' },
  { id: 'custom_planning', icon: Calendar, titleKey: 'helpRequest.categories.customPlanning', descKey: 'helpRequest.categories.customPlanningDesc' },
  { id: 'urgent_help', icon: MapPin, titleKey: 'helpRequest.categories.urgentHelp', descKey: 'helpRequest.categories.urgentHelpDesc' },
  { id: 'product_purchase', icon: DollarSign, titleKey: 'helpRequest.categories.productPurchase', descKey: 'helpRequest.categories.productPurchaseDesc' },
] as const;

const urgencyLevels = [
  { id: 'flexible', labelKey: 'helpRequest.urgency.flexible', color: 'bg-green-100 text-green-800' },
  { id: 'normal', labelKey: 'helpRequest.urgency.normal', color: 'bg-blue-100 text-blue-800' },
  { id: 'urgent', labelKey: 'helpRequest.urgency.urgent', color: 'bg-red-100 text-red-800' },
] as const;

export default function HelpRequestForm({ isOpen, onClose, initialLocation }: HelpRequestFormProps) {
  const { t, i18n } = useTranslation('ui');
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<HelpRequestData>({
    title: '',
    description: '',
    category: 'local_tip',
    location: initialLocation?.name || '',
    latitude: initialLocation?.lat,
    longitude: initialLocation?.lng,
    budgetMin: undefined,
    budgetMax: undefined,
    currency: 'USD',
    deadline: '',
    urgencyLevel: 'normal',
    preferredLanguage: i18n.language || 'ko',
    tags: [],
  });

  const [tagInput, setTagInput] = useState('');
  const [showBudget, setShowBudget] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createHelpRequestMutation = useMutation({
    mutationFn: async (data: HelpRequestData) => {
      const response = await api('/api/requests/create', {
        method: 'POST',
        body: data,
      });
      return response;
    },
    onSuccess: () => {
      toast({
        title: t('helpRequest.created.title'),
        description: t('helpRequest.created.description'),
      });
      queryClient.invalidateQueries({ queryKey: ['/api/requests/my'] });
      onClose();
      resetForm();
    },
    onError: (error: any) => {
      console.error('Failed to create help request:', error);
      toast({
        variant: 'destructive',
        title: t('helpRequest.error.title'),
        description: error.message || t('helpRequest.error.description'),
      });
    },
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      category: 'local_tip',
      location: initialLocation?.name || '',
      latitude: initialLocation?.lat,
      longitude: initialLocation?.lng,
      budgetMin: undefined,
      budgetMax: undefined,
      currency: 'USD',
      deadline: '',
      urgencyLevel: 'normal',
      preferredLanguage: i18n.language || 'ko',
      tags: [],
    });
    setTagInput('');
    setErrors({});
    setShowBudget(false);
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = t('helpRequest.validation.titleRequired');
    }
    if (!formData.description.trim()) {
      newErrors.description = t('helpRequest.validation.descriptionRequired');
    }
    if (formData.budgetMax && formData.budgetMin && formData.budgetMax < formData.budgetMin) {
      newErrors.budget = t('helpRequest.validation.invalidBudgetRange');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      toast({
        variant: 'destructive',
        title: t('auth.required'),
        description: t('auth.loginFirst'),
      });
      return;
    }

    if (!validateForm()) return;

    // Clean data before submission
    const cleanedData = {
      ...formData,
      budgetMin: showBudget && formData.budgetMin ? formData.budgetMin : undefined,
      budgetMax: showBudget && formData.budgetMax ? formData.budgetMax : undefined,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : undefined,
    };

    createHelpRequestMutation.mutate(cleanedData);
  };

  const addTag = () => {
    if (tagInput.trim() && !formData.tags.includes(tagInput.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, tagInput.trim()],
      }));
      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  return (
    <Modal open={isOpen} onClose={onClose}>
      <div className="p-6">
        <h2 className="text-xl font-bold mb-6" data-testid="help-request-form-title">
          {t('helpRequest.form.title')}
        </h2>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium mb-3">
              {t('helpRequest.form.category')} *
            </label>
            <div className="grid grid-cols-2 gap-3">
              {categories.map((category) => {
                const Icon = category.icon;
                return (
                  <button
                    key={category.id}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, category: category.id }))}
                    className={`p-3 rounded-lg border text-left transition-colors ${
                      formData.category === category.id
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    data-testid={`category-${category.id}`}
                  >
                    <Icon className="w-5 h-5 mb-2" />
                    <div className="font-medium text-sm">
                      {t(category.titleKey)}
                    </div>
                    <div className="text-xs text-gray-500">
                      {t(category.descKey)}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('helpRequest.form.requestTitle')} *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              placeholder={t('helpRequest.form.titlePlaceholder')}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.title ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="input-title"
            />
            {errors.title && (
              <p className="text-red-600 text-sm mt-1">{errors.title}</p>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('helpRequest.form.description')} *
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder={t('helpRequest.form.descriptionPlaceholder')}
              rows={4}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                errors.description ? 'border-red-500' : 'border-gray-300'
              }`}
              data-testid="input-description"
            />
            {errors.description && (
              <p className="text-red-600 text-sm mt-1">{errors.description}</p>
            )}
          </div>

          {/* Location */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('helpRequest.form.location')}
            </label>
            <div className="flex items-center space-x-2">
              <MapPin className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                placeholder={t('helpRequest.form.locationPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="input-location"
              />
            </div>
          </div>

          {/* Budget */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium">
                {t('helpRequest.form.budget')}
              </label>
              <button
                type="button"
                onClick={() => setShowBudget(!showBudget)}
                className="text-blue-600 text-sm hover:text-blue-700"
                data-testid="toggle-budget"
              >
                {showBudget ? t('helpRequest.form.hideBudget') : t('helpRequest.form.showBudget')}
              </button>
            </div>
            
            {showBudget && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {t('helpRequest.form.minBudget')}
                  </label>
                  <input
                    type="number"
                    value={formData.budgetMin || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      budgetMin: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    data-testid="input-budget-min"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">
                    {t('helpRequest.form.maxBudget')}
                  </label>
                  <input
                    type="number"
                    value={formData.budgetMax || ''}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      budgetMax: e.target.value ? parseInt(e.target.value) : undefined 
                    }))}
                    placeholder="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    data-testid="input-budget-max"
                  />
                </div>
                {errors.budget && (
                  <p className="text-red-600 text-sm col-span-2">{errors.budget}</p>
                )}
              </div>
            )}
          </div>

          {/* Urgency Level */}
          <div>
            <label className="block text-sm font-medium mb-3">
              {t('helpRequest.form.urgency')}
            </label>
            <div className="flex space-x-3">
              {urgencyLevels.map((level) => (
                <button
                  key={level.id}
                  type="button"
                  onClick={() => setFormData(prev => ({ ...prev, urgencyLevel: level.id }))}
                  className={`px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    formData.urgencyLevel === level.id
                      ? level.color
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                  data-testid={`urgency-${level.id}`}
                >
                  {t(level.labelKey)}
                </button>
              ))}
            </div>
          </div>

          {/* Deadline */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('helpRequest.form.deadline')}
            </label>
            <input
              type="datetime-local"
              value={formData.deadline}
              onChange={(e) => setFormData(prev => ({ ...prev, deadline: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              data-testid="input-deadline"
            />
          </div>

          {/* Tags */}
          <div>
            <label className="block text-sm font-medium mb-2">
              {t('helpRequest.form.tags')}
            </label>
            <div className="flex flex-wrap gap-2 mb-2">
              {formData.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                >
                  {tag}
                  <button
                    type="button"
                    onClick={() => removeTag(tag)}
                    className="ml-1 text-blue-600 hover:text-blue-800"
                    data-testid={`remove-tag-${tag}`}
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
            <div className="flex space-x-2">
              <input
                type="text"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTag())}
                placeholder={t('helpRequest.form.tagsPlaceholder')}
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                data-testid="input-tag"
              />
              <button
                type="button"
                onClick={addTag}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300"
                data-testid="button-add-tag"
              >
                {t('helpRequest.form.addTag')}
              </button>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              data-testid="button-cancel"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={createHelpRequestMutation.isPending}
              className="flex-1 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              data-testid="button-submit"
            >
              {createHelpRequestMutation.isPending
                ? t('helpRequest.form.creating')
                : t('helpRequest.form.createRequest')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
}