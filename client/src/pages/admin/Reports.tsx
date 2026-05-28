// 관리자 신고 처리 대시보드 — pending/reviewing/resolved/dismissed 상태 토글 + 메모 추가
import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';

interface Report {
  id: number;
  reporterId: string;
  targetType: string;
  targetId: string;
  reason: string;
  description: string | null;
  status: string;
  adminNote: string | null;
  createdAt: string;
  resolvedAt: string | null;
}

const STATUS_OPTIONS = ['pending', 'reviewing', 'resolved', 'dismissed'];

export default function AdminReports() {
  const [filter, setFilter] = useState<string>('all');
  const [notes, setNotes] = useState<Record<number, string>>({});
  const { toast } = useToast();

  const { data: reports = [], isLoading } = useQuery<Report[]>({
    queryKey: ['/api/reports/admin/all', filter],
    queryFn: async () => {
      const url = filter === 'all' ? '/api/reports/admin/all' : `/api/reports/admin/all?status=${filter}`;
      return apiRequest(url, { method: 'GET' }).then((r: any) => r);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, status, adminNote }: { id: number; status: string; adminNote: string | undefined }) => {
      return apiRequest(`/api/reports/admin/${id}`, { method: 'PATCH', body: { status, adminNote: adminNote || '' } });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/reports/admin/all'] });
      toast({ title: '처리 완료', description: '신고 상태가 업데이트되었습니다.' });
    },
    onError: (err: any) => toast({ title: '오류', description: err?.message || '처리 실패', variant: 'destructive' }),
  });

  const statusColor = (s: string) => {
    switch (s) {
      case 'pending': return 'destructive';
      case 'reviewing': return 'default';
      case 'resolved': return 'secondary';
      case 'dismissed': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-4" data-testid="admin-reports-page">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">신고 관리</h1>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">전체</SelectItem>
            {STATUS_OPTIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">로딩 중...</p>}
      {!isLoading && reports.length === 0 && <p className="text-sm text-muted-foreground">신고가 없습니다.</p>}

      <div className="space-y-3">
        {reports.map((r) => (
          <Card key={r.id} data-testid={`report-card-${r.id}`}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  #{r.id} · {r.targetType}/{r.targetId} · <span className="text-muted-foreground">{r.reason}</span>
                </CardTitle>
                <Badge variant={statusColor(r.status) as any}>{r.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                신고자: {r.reporterId} · {new Date(r.createdAt).toLocaleString()}
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {r.description && <p className="text-sm">{r.description}</p>}
              {r.adminNote && <p className="text-xs text-blue-600">관리자 메모: {r.adminNote}</p>}
              <Textarea
                placeholder="처리 메모"
                value={notes[r.id] ?? ''}
                onChange={(e) => setNotes((prev) => ({ ...prev, [r.id]: e.target.value }))}
                data-testid={`report-note-${r.id}`}
              />
              <div className="flex gap-2 flex-wrap">
                {STATUS_OPTIONS.map((s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={r.status === s ? 'default' : 'outline'}
                    onClick={() => updateMutation.mutate({ id: r.id, status: s, adminNote: notes[r.id] })}
                    disabled={updateMutation.isPending || r.status === s}
                    data-testid={`btn-set-${s}-${r.id}`}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
