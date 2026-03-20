// P2P 에스크로 계약 페이지 — v3 (계약 요약·보호뱃지·체크리스트·타임라인·서명 CTA)
import { useRoute } from 'wouter';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Lock, Shield, CheckCircle2, Handshake, MapPin, Calendar, DollarSign, Clock } from 'lucide-react';
import { api } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface ContractParty { id: string; name: string; avatarUrl?: string | null; initials?: string }
interface PaymentMilestone { label: string; amount: number; dueDate?: string; status: 'pending' | 'paid' | 'upcoming' }
interface Contract {
  id: number;
  serviceTitle: string;
  serviceDate?: string;
  location?: string;
  totalAmount: number;
  currency: string;
  depositPercent: number;
  scopeItems: string[];
  milestones: PaymentMilestone[];
  traveler: ContractParty;
  guide: ContractParty;
  status: 'draft' | 'pending' | 'signed' | 'completed';
}

const MOCK_SCOPE = ['guide', 'photo', 'transport', 'meal'] as string[];
const MOCK_MILESTONES = ['booking', 'start', 'complete', 'settlement'] as const;

function Avatar({ party, size = 52 }: { party: ContractParty; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: party.avatarUrl ? undefined : 'var(--surface-2)',
      backgroundImage: party.avatarUrl ? `url(${party.avatarUrl})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
      border: '2px solid var(--accent-gold)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.28, color: 'var(--accent-gold)',
    }}>
      {!party.avatarUrl && (party.initials ?? party.name[0]?.toUpperCase())}
    </div>
  );
}

export default function ContractPage() {
  const { t } = useTranslation('ui');
  const [, params] = useRoute('/contract/:id');
  const { toast } = useToast();
  const [signing, setSigning] = useState(false);
  const contractId = params?.id;

  const { data: contract, isLoading, error } = useQuery<Contract>({
    queryKey: ['/api/contracts', contractId],
    queryFn: async () => {
      const r = await fetch(`/api/contracts/${contractId}`);
      if (!r.ok) throw new Error('not found');
      return r.json();
    },
    enabled: !!contractId,
  });

  const signMutation = useMutation({
    mutationFn: async () => api(`/api/contracts/${contractId}/sign`, { method: 'POST' }),
    onSuccess: () => toast({ title: t('contract.signSuccess'), description: t('contract.signSuccessDesc') }),
    onError: () => toast({ title: t('contract.signError'), variant: 'destructive' }),
    onSettled: () => setSigning(false),
  });

  const cardStyle = { borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 } as const;
  const labelStyle = { color: 'var(--text-secondary)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.05em', marginBottom: 6 };

  if (isLoading) return (
    <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 28, height: 28, border: '3px solid var(--accent-mint)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
    </div>
  );

  // Graceful error + demo mode for preview
  const demo: Contract | null = error || !contract ? {
    id: 0, serviceTitle: t('contract.demoTitle'), serviceDate: '2026-04-01', location: 'Seoul',
    totalAmount: 150, currency: 'USD', depositPercent: 30,
    scopeItems: MOCK_SCOPE, status: 'pending',
    traveler: { id: 't1', name: 'Traveler', initials: 'TR' },
    guide: { id: 'g1', name: 'Guide', initials: 'GD' },
    milestones: MOCK_MILESTONES.map((k, i) => ({ label: k, amount: [45, 0, 105, 0][i]!, status: i === 0 ? 'paid' : 'upcoming' })),
  } : null;
  const c = contract ?? demo!;
  const depositAmt = c.totalAmount * c.depositPercent / 100;
  const balanceAmt = c.totalAmount - depositAmt;
  const fmt = (n: number) => new Intl.NumberFormat('en-US', { style: 'currency', currency: c.currency ?? 'USD' }).format(n);

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', paddingBottom: 96 }}>

      {/* Header */}
      <div className="tg-glass" style={{ position: 'sticky', top: 0, zIndex: 30, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()} style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('contract.header')} <Lock size={15} color="var(--accent-gold)" />
        </h1>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Two-party avatar row */}
        <div className="tg-surface" style={{ ...cardStyle, display: 'flex', alignItems: 'center', justifyContent: 'space-around' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar party={c.traveler} size={60} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('contract.travelerLabel')}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.traveler.name}</span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 44, height: 44, borderRadius: '50%', background: 'rgba(230,201,137,0.12)', border: '1px solid rgba(230,201,137,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Handshake size={22} color="var(--accent-gold)" />
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <Avatar party={c.guide} size={60} />
            <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{t('contract.guideLabel')}</span>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{c.guide.name}</span>
          </div>
        </div>

        {/* Contract summary */}
        <div className="tg-surface" style={cardStyle}>
          <p style={labelStyle}>{t('contract.summaryTitle')}</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginBottom: 12 }}>{c.serviceTitle}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {c.serviceDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Calendar size={14} color="var(--accent-mint)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('contract.dateLabel')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', marginLeft: 'auto' }}>{c.serviceDate}</span>
              </div>
            )}
            {c.location && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <MapPin size={14} color="var(--accent-mint)" />
                <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('contract.locationLabel')}</span>
                <span style={{ fontSize: 13, color: 'var(--text-primary)', marginLeft: 'auto' }}>{c.location}</span>
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <DollarSign size={14} color="var(--accent-gold)" />
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{t('contract.totalAmount')}</span>
              <span style={{ fontSize: 17, fontWeight: 700, color: 'var(--accent-gold)', marginLeft: 'auto' }}>{fmt(c.totalAmount)}</span>
            </div>
          </div>

          {/* Payment schedule */}
          <div style={{ marginTop: 14, paddingTop: 12, borderTop: '1px solid var(--stroke)' }}>
            <p style={labelStyle}>{t('contract.paymentSchedule')}</p>
            <div style={{ display: 'flex', gap: 10 }}>
              <div className="tg-surface-2" style={{ flex: 1, borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(200,168,78,0.15)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('contract.deposit')} ({c.depositPercent}%)</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--accent-gold)', marginTop: 2 }}>{fmt(depositAmt)}</p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{t('contract.depositDesc')}</p>
              </div>
              <div className="tg-surface-2" style={{ flex: 1, borderRadius: 12, padding: '10px 12px', border: '1px solid rgba(200,168,78,0.15)' }}>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('contract.balance')}</p>
                <p style={{ fontSize: 16, fontWeight: 700, color: 'var(--text-primary)', marginTop: 2 }}>{fmt(balanceAmt)}</p>
                <p style={{ fontSize: 10, color: 'var(--text-secondary)', marginTop: 2 }}>{t('contract.balanceDesc')}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Escrow protection badge */}
        <div className="tg-surface" style={{ ...cardStyle, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'rgba(107,168,255,0.12)', border: '1px solid rgba(107,168,255,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={18} color="var(--accent-blue)" />
          </div>
          <div>
            <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--accent-blue)', marginBottom: 4 }}>{t('contract.escrow.title')}</p>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.5 }}>{t('contract.escrow.desc')}</p>
          </div>
        </div>

        {/* Scope checklist */}
        {c.scopeItems.length > 0 && (
          <div className="tg-surface" style={cardStyle}>
            <p style={labelStyle}>{t('contract.scopeTitle')}</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {c.scopeItems.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={15} color="var(--accent-mint)" style={{ flexShrink: 0 }} />
                  <span style={{ fontSize: 14, color: 'var(--text-primary)' }}>{t(`contract.scope.${item}`, { defaultValue: item })}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Milestone timeline */}
        <div className="tg-surface" style={cardStyle}>
          <p style={labelStyle}>{t('contract.milestoneTitle')}</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {MOCK_MILESTONES.map((key, i) => {
              const isPaid = i === 0;
              const isActive = i === 1;
              return (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, paddingBottom: i < 3 ? 16 : 0, position: 'relative' }}>
                  {i < 3 && <div style={{ position: 'absolute', left: 10, top: 22, width: 2, height: '100%', background: isPaid ? 'var(--accent-mint)' : 'var(--stroke)' }} />}
                  <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, background: isPaid ? 'var(--accent-mint)' : isActive ? 'rgba(124,231,214,0.2)' : 'var(--surface-2)', border: `2px solid ${isPaid ? 'var(--accent-mint)' : isActive ? 'var(--accent-mint)' : 'var(--stroke)'}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {isPaid && <CheckCircle2 size={12} color="#0A0B10" />}
                    {isActive && <Clock size={11} color="var(--accent-mint)" />}
                  </div>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: isPaid ? 'var(--accent-mint)' : isActive ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {t(`contract.milestone.${key}`)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Sticky bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'rgba(17,19,26,0.95)', backdropFilter: 'blur(12px)', borderTop: '1px solid rgba(200,168,78,0.15)', padding: '12px 16px', display: 'flex', gap: 10, zIndex: 50 }}>
        <button className="tg-btn-ghost" style={{ flex: 1, padding: '12px 0', fontSize: 14, cursor: 'pointer' }}
          onClick={() => toast({ title: t('contract.reviseNote') })}>
          {t('contract.reviseCTA')}
        </button>
        <button className="tg-btn-primary" style={{ flex: 2, padding: '14px 0', fontSize: 15, fontWeight: 700, border: 'none', cursor: signing ? 'not-allowed' : 'pointer', opacity: signing ? 0.7 : 1 }}
          onClick={() => { setSigning(true); signMutation.mutate(); }} disabled={signing} data-testid="button-sign">
          {signing ? t('contract.signing') : t('contract.signCTA')}
        </button>
      </div>

    </div>
  );
}
