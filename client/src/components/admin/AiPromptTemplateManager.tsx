import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { queryClient, apiRequest } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit2, Search } from 'lucide-react';
import type { AiPromptTemplate } from '@shared/schema';

const CATEGORIES = ['concierge', 'mini_concierge', 'cinemap', 'translation'];
const LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'es', 'de'];
const AI_PROVIDERS = ['openai', 'anthropic', 'google'];

export function AiPromptTemplateManager() {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [editingTemplate, setEditingTemplate] = useState<AiPromptTemplate | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const { data: templates = [], isLoading } = useQuery<AiPromptTemplate[]>({
    queryKey: ['/api/ai-prompt-templates'],
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: number; updates: Partial<AiPromptTemplate> }) => {
      return await apiRequest(`/api/ai-prompt-templates/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-prompt-templates'] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const createMutation = useMutation({
    mutationFn: async (template: Partial<AiPromptTemplate>) => {
      return await apiRequest('/api/ai-prompt-templates', {
        method: 'POST',
        body: JSON.stringify(template),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai-prompt-templates'] });
      setIsDialogOpen(false);
      setEditingTemplate(null);
    },
  });

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !searchTerm ||
      t.templateKey.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = categoryFilter === 'all' || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  const handleSave = () => {
    if (!editingTemplate) return;

    if (editingTemplate.id) {
      updateMutation.mutate({
        id: editingTemplate.id,
        updates: {
          name: editingTemplate.name,
          description: editingTemplate.description,
          aiProvider: editingTemplate.aiProvider,
          aiModel: editingTemplate.aiModel,
          maxTokens: editingTemplate.maxTokens,
          temperature: editingTemplate.temperature,
          systemPrompt: editingTemplate.systemPrompt,
          userPromptTemplate: editingTemplate.userPromptTemplate,
          locale: editingTemplate.locale,
          responseFormat: editingTemplate.responseFormat,
          isActive: editingTemplate.isActive,
        },
      });
    } else {
      createMutation.mutate(editingTemplate);
    }
  };

  const handleCreate = () => {
    setEditingTemplate({
      id: 0,
      templateKey: '',
      version: 1,
      name: '',
      nameKo: null,
      description: '',
      aiProvider: 'openai',
      aiModel: 'gpt-5.1-chat-latest',
      maxTokens: 500,
      temperature: '0.70',
      topP: null,
      frequencyPenalty: null,
      presencePenalty: null,
      systemPrompt: '',
      userPromptTemplate: '',
      locale: 'en',
      responseFormat: 'text',
      responseSchema: null,
      isActive: true,
      isDefault: false,
      category: 'concierge',
      tags: null,
      createdAt: null,
      updatedAt: null,
      createdBy: null,
      updatedBy: null,
    });
    setIsDialogOpen(true);
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      concierge: 'bg-blue-100 text-blue-800',
      mini_concierge: 'bg-green-100 text-green-800',
      cinemap: 'bg-purple-100 text-purple-800',
      translation: 'bg-orange-100 text-orange-800',
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  if (isLoading) {
    return <div className="flex items-center justify-center p-8">Loading...</div>;
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>AI Prompt Templates</CardTitle>
        <Button onClick={handleCreate} size="sm">
          <Plus className="w-4 h-4 mr-1" /> Add Template
        </Button>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {CATEGORIES.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat.replace('_', ' ').toUpperCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="text-sm text-muted-foreground mb-4">
          {filteredTemplates.length} / {templates.length} templates
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {filteredTemplates.map((template) => (
            <div
              key={template.id}
              className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 cursor-pointer"
              onClick={() => {
                setEditingTemplate(template);
                setIsDialogOpen(true);
              }}
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{template.name}</span>
                  <Badge className={getCategoryColor(template.category)}>{template.category}</Badge>
                  <Badge variant="outline">{template.locale}</Badge>
                  {!template.isActive && <Badge variant="destructive">Inactive</Badge>}
                </div>
                <div className="text-sm text-muted-foreground mt-1">
                  <span className="font-mono text-xs">{template.templateKey}</span>
                  {template.description && ` - ${template.description.substring(0, 60)}...`}
                </div>
              </div>
              <Button variant="ghost" size="sm">
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
        </div>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {editingTemplate?.id ? 'Edit Template' : 'Create Template'}
              </DialogTitle>
            </DialogHeader>
            {editingTemplate && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">Template Key</label>
                    <Input
                      value={editingTemplate.templateKey}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, templateKey: e.target.value })
                      }
                      placeholder="concierge_system"
                      disabled={!!editingTemplate.id}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={editingTemplate.name}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, name: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">Category</label>
                    <Select
                      value={editingTemplate.category}
                      onValueChange={(v) =>
                        setEditingTemplate({ ...editingTemplate, category: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">Locale</label>
                    <Select
                      value={editingTemplate.locale || 'en'}
                      onValueChange={(v) =>
                        setEditingTemplate({ ...editingTemplate, locale: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALES.map((loc) => (
                          <SelectItem key={loc} value={loc}>
                            {loc.toUpperCase()}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-sm font-medium">AI Provider</label>
                    <Select
                      value={editingTemplate.aiProvider || 'openai'}
                      onValueChange={(v) =>
                        setEditingTemplate({ ...editingTemplate, aiProvider: v })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AI_PROVIDERS.map((p) => (
                          <SelectItem key={p} value={p}>
                            {p}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="text-sm font-medium">AI Model</label>
                    <Input
                      value={editingTemplate.aiModel || ''}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, aiModel: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Tokens</label>
                    <Input
                      type="number"
                      value={editingTemplate.maxTokens || 500}
                      onChange={(e) =>
                        setEditingTemplate({
                          ...editingTemplate,
                          maxTokens: parseInt(e.target.value, 10),
                        })
                      }
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Temperature</label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={editingTemplate.temperature || '0.7'}
                      onChange={(e) =>
                        setEditingTemplate({ ...editingTemplate, temperature: e.target.value })
                      }
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Description</label>
                  <Input
                    value={editingTemplate.description || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, description: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">System Prompt</label>
                  <Textarea
                    rows={5}
                    value={editingTemplate.systemPrompt || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, systemPrompt: e.target.value })
                    }
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">User Prompt Template</label>
                  <Textarea
                    rows={5}
                    value={editingTemplate.userPromptTemplate || ''}
                    onChange={(e) =>
                      setEditingTemplate({ ...editingTemplate, userPromptTemplate: e.target.value })
                    }
                    placeholder="Use {{variable}} for dynamic content"
                  />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={updateMutation.isPending || createMutation.isPending}
              >
                {updateMutation.isPending || createMutation.isPending ? 'Saving...' : 'Save'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
