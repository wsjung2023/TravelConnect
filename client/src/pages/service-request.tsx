// 여행 도움 요청 페이지 — v3 컨셉아트 기반 전체화면 서비스 요청 폼
import { useState, useRef } from 'react';
import { useLocation } from 'wouter';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, MapPin, Calendar, Users, DollarSign, FileText, Globe, ImagePlus, Star, Minus, Plus } from 'lucide-react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

const SERVICE_TYPES = ['guide', 'translation', 'transport', 'accommodation', 'activity'] as const;
type ServiceType = typeof SERVICE_TYPES[number];
const LANG_OPTIONS = ['EN', 'KO', 'JA', 'ZH', 'FR', 'ES'] as const;

export default function ServiceRequestPage() {
  const { t } = useTranslation('ui');
  const [, navigate] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);

  const [destination, setDestination] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [serviceTypes, setServiceTypes] = useState<ServiceType[]>([]);
  const [groupSize, setGroupSize] = useState(2);
  const [budget, setBudget] = useState(100);
  const [description, setDescription] = useState('');
  const [languages, setLanguages] = useState<string[]>(['EN']);
  const [photoNames, setPhotoNames] = useState<string[]>([]);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data: experiencesRaw } = useQuery<any[]>({
    queryKey: ['/api/experiences'],
    queryFn: async () => {
      const r = await fetch('/api/experiences?limit=6');
      if (!r.ok) return [];
      const data = await r.json();
      return Array.isArray(data) ? data : (data.experiences ?? []);
    },
  });

  // Deduplicate by hostId to show up to 3 distinct guides
  const guidePreview = (() => {
    if (!experiencesRaw?.length) return [];
    const seen = new Set<string>();
    const result: any[] = [];
    for (const exp of experiencesRaw) {
      if (!exp.hostId || seen.has(exp.hostId)) continue;
      seen.add(exp.hostId);
      result.push(exp);
      if (result.length === 3) break;
    }
    return result;
  })();

  const submitMutation = useMutation({
    mutationFn: async () => {
      const title = destination
        ? `${destination} — ${serviceTypes.map(s => t(`sreq.serviceType.${s}`)).join(', ')}`
        : serviceTypes.map(s => t(`sreq.serviceType.${s}`)).join(', ');
      return api('/api/requests/create', {
        method: 'POST',
        body: {
          title: title || t('sreq.header'),
          description,
          category: 'custom_planning',
          location: destination,
          budgetMin: Math.max(0, budget - 50),
          budgetMax: budget,
          currency: 'USD',
          deadline: dateTo ? new Date(dateTo).toISOString() : undefined,
          urgencyLevel: 'normal',
          preferredLanguage: languages[0]?.toLowerCase() || 'en',
          tags: [...serviceTypes, `group:${groupSize}`],
        },
      });
    },
    onSuccess: () => {
      toast({ title: t('sreq.success.title'), description: t('sreq.success.desc') });
      queryClient.invalidateQueries({ queryKey: ['/api/requests/my'] });
      navigate('/profile');
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: t('sreq.error.title'), description: err.message || t('sreq.error.desc') });
    },
  });

  const validate = () => {
    const e: Record<string, string> = {};
    if (!destination.trim()) e.destination = t('sreq.validation.destination');
    if (!serviceTypes.length) e.serviceTypes = t('sreq.validation.serviceType');
    if (!description.trim()) e.description = t('sreq.validation.description');
    setErrors(e);
    return !Object.keys(e).length;
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    submitMutation.mutate();
  };

  const toggleService = (s: ServiceType) =>
    setServiceTypes(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);

  const toggleLang = (l: string) =>
    setLanguages(prev => prev.includes(l) ? (prev.length > 1 ? prev.filter(x => x !== l) : prev) : [...prev, l]);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setPhotoNames(prev => [...prev, ...files.map(f => f.name)].slice(0, 5));
  };

  const cardStyle: React.CSSProperties = { borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 };
  const labelStyle: React.CSSProperties = { color: 'var(--text-secondary)', fontSize: 12, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 };
  const inputStyle: React.CSSProperties = { width: '100%', background: 'var(--surface-2)', border: '1px solid var(--stroke)', borderRadius: 12, padding: '10px 14px', color: 'var(--text-primary)', fontSize: 14, outline: 'none', boxSizing: 'border-box' };
  const errStyle: React.CSSProperties = { color: 'var(--accent-coral)', fontSize: 12, marginTop: 4 };

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', paddingBottom: 24 }}>

      {/* Header */}
      <div className="tg-glass" style={{ position: 'sticky', top: 0, zIndex: 30, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => window.history.back()} data-testid="button-back"
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}>
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ color: 'var(--text-primary)', fontSize: 17, fontWeight: 700, flex: 1 }}>{t('sreq.header')}</h1>
      </div>

      <form onSubmit={handleSubmit} style={{ padding: '12px 16px 0' }}>

        {/* Destination */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><MapPin size={13} color="var(--accent-mint)" />{t('sreq.destination.label')}</div>
          <input type="text" value={destination} onChange={e => setDestination(e.target.value)}
            placeholder={t('sreq.destination.placeholder')} style={inputStyle} data-testid="input-destination" />
          {errors.destination && <p style={errStyle}>{errors.destination}</p>}
        </div>

        {/* Date range */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><Calendar size={13} color="var(--accent-mint)" />{t('sreq.dates.label')}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4 }}>{t('sreq.dates.from')}</div>
              <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }} data-testid="input-date-from" />
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginBottom: 4 }}>{t('sreq.dates.to')}</div>
              <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
                style={{ ...inputStyle, colorScheme: 'dark' }} data-testid="input-date-to" />
            </div>
          </div>
        </div>

        {/* Service type chips */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><FileText size={13} color="var(--accent-mint)" />{t('sreq.serviceType.label')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {SERVICE_TYPES.map(s => {
              const active = serviceTypes.includes(s);
              return (
                <button key={s} type="button" onClick={() => toggleService(s)} data-testid={`chip-service-${s}`}
                  className={active ? 'tg-chip tg-chip-active' : 'tg-chip'}
                  style={{ cursor: 'pointer', border: 'none', transition: 'all 0.15s' }}>
                  {t(`sreq.serviceType.${s}`)}
                </button>
              );
            })}
          </div>
          {errors.serviceTypes && <p style={errStyle}>{errors.serviceTypes}</p>}
        </div>

        {/* Group size stepper */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><Users size={13} color="var(--accent-mint)" />{t('sreq.groupSize.label')}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button type="button" onClick={() => setGroupSize(g => Math.max(1, g - 1))}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }} data-testid="btn-group-minus">
              <Minus size={16} />
            </button>
            <span style={{ color: 'var(--text-primary)', fontWeight: 700, fontSize: 20, minWidth: 48, textAlign: 'center' }} data-testid="text-group-size">
              {groupSize} <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-secondary)' }}>{t('sreq.groupSize.people')}</span>
            </span>
            <button type="button" onClick={() => setGroupSize(g => Math.min(20, g + 1))}
              style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }} data-testid="btn-group-plus">
              <Plus size={16} />
            </button>
          </div>
        </div>

        {/* Budget slider (gold accent) */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><DollarSign size={13} color="var(--accent-gold)" />{t('sreq.budget.label')}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>$0</span>
            <span style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 18 }} data-testid="text-budget">
              ${budget}<span style={{ fontSize: 12, fontWeight: 400, color: 'var(--text-secondary)' }}>{t('sreq.budget.perDay')}</span>
            </span>
            <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>$500</span>
          </div>
          <input type="range" min={0} max={500} step={10} value={budget} onChange={e => setBudget(Number(e.target.value))}
            data-testid="slider-budget"
            style={{ width: '100%', accentColor: 'var(--accent-gold)', height: 4, cursor: 'pointer' }} />
        </div>

        {/* Description */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><FileText size={13} color="var(--accent-mint)" />{t('sreq.description.label')}</div>
          <textarea value={description} onChange={e => setDescription(e.target.value)}
            placeholder={t('sreq.description.placeholder')} rows={4} data-testid="textarea-description"
            style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
          {errors.description && <p style={errStyle}>{errors.description}</p>}
        </div>

        {/* Language chips */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><Globe size={13} color="var(--accent-mint)" />{t('sreq.languages.label')}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {LANG_OPTIONS.map(l => {
              const active = languages.includes(l);
              return (
                <button key={l} type="button" onClick={() => toggleLang(l)} data-testid={`chip-lang-${l}`}
                  className={active ? 'tg-chip tg-chip-active' : 'tg-chip'}
                  style={{ cursor: 'pointer', border: 'none' }}>
                  {l}
                </button>
              );
            })}
          </div>
        </div>

        {/* Photo attachment */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><ImagePlus size={13} color="var(--accent-mint)" />{t('sreq.photos.label')}</div>
          <button type="button" onClick={() => fileRef.current?.click()} data-testid="btn-add-photo"
            style={{ width: '100%', height: 72, border: '1.5px dashed var(--stroke)', borderRadius: 16, background: 'var(--surface-2)', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
            <ImagePlus size={20} color="var(--text-secondary)" />
            <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{t('sreq.photos.hint')}</span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" multiple onChange={handleFiles} style={{ display: 'none' }} />
          {photoNames.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
              {photoNames.map((name, i) => (
                <span key={i} className="tg-chip" style={{ fontSize: 11 }}>{name}</span>
              ))}
            </div>
          )}
        </div>

        {/* Guide preview */}
        <div className="tg-surface" style={cardStyle}>
          <div style={labelStyle}><Star size={13} color="var(--accent-gold)" />{t('sreq.guidesPreview.title')}</div>
          {guidePreview.length === 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ height: 12, background: 'var(--surface-2)', borderRadius: 6, marginBottom: 6, width: '60%' }} />
                    <div style={{ height: 10, background: 'var(--surface-2)', borderRadius: 6, width: '40%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {guidePreview.map((exp, i) => {
                const name = exp.host?.firstName && exp.host?.lastName
                  ? `${exp.host.firstName} ${exp.host.lastName}`
                  : t('sreq.guidesPreview.unknownGuide');
                const initial = (exp.host?.firstName?.[0] || '?').toUpperCase();
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'var(--surface-2)', border: '2px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 15, overflow: 'hidden', flexShrink: 0 }}>
                      {exp.host?.profileImageUrl
                        ? <img src={exp.host.profileImageUrl} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{name}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <Star size={11} fill="var(--accent-gold)" color="var(--accent-gold)" />
                        <span style={{ color: 'var(--accent-gold)', fontSize: 12, fontWeight: 600 }}>{exp.rating || '—'}</span>
                        <span style={{ color: 'var(--text-secondary)', fontSize: 11 }}>({exp.reviewCount ?? 0} {t('sreq.guidesPreview.reviews')})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Submit */}
        <button type="submit" className="tg-btn-primary" data-testid="button-submit"
          disabled={submitMutation.isPending}
          style={{ width: '100%', padding: '16px 0', border: 'none', cursor: submitMutation.isPending ? 'not-allowed' : 'pointer', opacity: submitMutation.isPending ? 0.7 : 1, fontSize: 16, fontWeight: 700, marginTop: 4 }}>
          {submitMutation.isPending ? t('sreq.submitting') : t('sreq.submit')}
        </button>

      </form>
    </div>
  );
}
