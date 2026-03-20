// 여행 체험 상품 상세 — v3 컨셉아트 기반 리디자인 (히어로/호스트카드/정보칩/설명/체크리스트/달력/리뷰/스티키바)
import { useRoute, Link } from 'wouter';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, MapPin, Clock, Users, Star,
  CheckCircle2, Globe, ChevronDown, ChevronUp, ShieldCheck,
} from 'lucide-react';
import BookingModal from '@/components/BookingModal';
import { useAuth } from '@/hooks/useAuth';

interface Experience {
  id: number;
  title: string;
  description: string;
  price: string;
  currency: string;
  location: string;
  category: string;
  duration: number;
  maxParticipants: number;
  images: string[];
  rating: string;
  reviewCount: number;
  hostId: string;
  host?: {
    firstName?: string;
    lastName?: string;
    profileImageUrl?: string;
    isVerified?: boolean;
  };
  included: string[];
  requirements: string[];
  cancelPolicy: string;
}

interface Review {
  id: number;
  authorName: string;
  authorAvatar?: string;
  rating: number;
  comment: string;
  createdAt: string;
}

function buildCalendar(year: number, month: number) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDay, daysInMonth };
}

export default function ExperienceDetailPage() {
  const { t } = useTranslation('ui');
  const [, params] = useRoute('/experience/:id');
  const { user } = useAuth();
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [descExpanded, setDescExpanded] = useState(false);
  const experienceId = params?.id;

  const now = new Date();
  const calYear = now.getFullYear();
  const calMonth = now.getMonth();
  const { firstDay, daysInMonth } = buildCalendar(calYear, calMonth);
  const availableDays = Array.from({ length: daysInMonth }, (_, i) => {
    const d = new Date(calYear, calMonth, i + 1);
    return d.getDay() === 5 || d.getDay() === 6 || d.getDay() === 0;
  });

  const { data: experience, isLoading, error } = useQuery<Experience>({
    queryKey: ['/api/experiences', experienceId],
    queryFn: async () => {
      const r = await fetch(`/api/experiences/${experienceId}`);
      if (!r.ok) throw new Error('Failed to fetch experience');
      return r.json();
    },
    enabled: !!experienceId,
  });

  const { data: reviews = [] } = useQuery<Review[]>({
    queryKey: ['/api/experiences', experienceId, 'reviews'],
    queryFn: async () => {
      const r = await fetch(`/api/experiences/${experienceId}/reviews`);
      if (!r.ok) return [];
      return r.json();
    },
    enabled: !!experienceId,
  });

  const formatPrice = (price: string, currency = 'USD') => {
    try {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(parseFloat(price));
    } catch {
      return `$${parseFloat(price).toFixed(2)}`;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return t('exp.detail.minutes', { count: minutes });
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0
      ? t('exp.detail.hoursMinutes', { hours: h, minutes: m })
      : t('exp.detail.hours', { count: h });
  };

  if (isLoading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ width: 32, height: 32, border: '3px solid var(--accent-mint)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>{t('exp.detail.loading')}</p>
        </div>
      </div>
    );
  }

  if (error || !experience) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--app-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ color: 'var(--text-primary)', fontSize: 20, fontWeight: 600, marginBottom: 8 }}>{t('exp.detail.notFound')}</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: 14, marginBottom: 20 }}>{t('exp.detail.notFoundDesc')}</p>
          <button onClick={() => window.history.back()} className="tg-btn-primary"
            style={{ padding: '10px 24px', border: 'none', cursor: 'pointer', fontSize: 14 }} data-testid="button-back">
            {t('exp.detail.back')}
          </button>
        </div>
      </div>
    );
  }

  const hostName = experience.host?.firstName && experience.host?.lastName
    ? `${experience.host.firstName} ${experience.host.lastName}`
    : t('exp.detail.hostCard.unknownHost');
  const heroImage = experience.images?.[0] || null;
  const DESC_LIMIT = 180;
  const shortDesc = experience.description.length > DESC_LIMIT
    ? experience.description.slice(0, DESC_LIMIT) + '…'
    : experience.description;
  const weekDays = t('exp.detail.availability.weekDays').split(',');

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', paddingBottom: 88 }}>

      {/* Hero */}
      <div style={{ position: 'relative', width: '100%', height: 260, overflow: 'hidden', background: 'var(--surface-1)', flexShrink: 0 }}>
        {heroImage ? (
          <img src={heroImage} alt={experience.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        ) : (
          <div style={{ width: '100%', height: '100%', background: 'linear-gradient(135deg, var(--surface-1), var(--surface-2))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>
            🌏
          </div>
        )}
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(10,11,16,0.55) 0%, transparent 40%, rgba(10,11,16,0.6) 100%)' }} />
        <button onClick={() => window.history.back()} data-testid="button-back"
          style={{ position: 'absolute', top: 16, left: 16, width: 36, height: 36, borderRadius: '50%', background: 'rgba(10,11,16,0.7)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)' }}>
          <ArrowLeft size={18} />
        </button>
        <div data-testid="text-price"
          style={{ position: 'absolute', top: 16, right: 16, background: 'var(--accent-gold)', color: '#111', borderRadius: 8, padding: '6px 12px', fontWeight: 700, fontSize: 15, lineHeight: 1 }}>
          {formatPrice(experience.price, experience.currency)}
        </div>
      </div>

      <div style={{ padding: '16px 16px 0' }}>

        {/* Host card */}
        <Link to={`/guide/${experience.hostId}`} data-testid="link-guide-profile">
          <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, cursor: 'pointer', textDecoration: 'none' }}>
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{ width: 48, height: 48, borderRadius: '50%', overflow: 'hidden', background: 'var(--surface-2)', border: '2px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-secondary)', fontWeight: 600, fontSize: 18 }}>
                {experience.host?.profileImageUrl
                  ? <img src={experience.host.profileImageUrl} alt={hostName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (experience.host?.firstName?.[0] || '?').toUpperCase()}
              </div>
              <ShieldCheck size={16} style={{ position: 'absolute', bottom: -2, right: -2, color: 'var(--accent-blue)', background: 'var(--app-bg)', borderRadius: '50%', padding: 1 }} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 14 }}>{hostName}</span>
                <span style={{ background: 'rgba(107,168,255,0.15)', color: 'var(--accent-blue)', borderRadius: 4, padding: '1px 6px', fontSize: 11, fontWeight: 600, flexShrink: 0 }}>{t('exp.detail.hostCard.verifiedBadge')}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 3 }}>
                <Star size={12} fill="var(--accent-gold)" color="var(--accent-gold)" />
                <span style={{ color: 'var(--accent-gold)', fontSize: 13, fontWeight: 600 }}>{experience.rating}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>({experience.reviewCount} {t('exp.detail.hostCard.reviews')})</span>
              </div>
            </div>
            <span style={{ color: 'var(--accent-mint)', fontSize: 12, flexShrink: 0 }}>{t('exp.detail.hostCard.viewProfile')} →</span>
          </div>
        </Link>

        {/* Title + location */}
        <h1 data-testid="text-title"
          style={{ color: 'var(--text-primary)', fontSize: 22, fontWeight: 700, lineHeight: 1.3, marginBottom: 8 }}>
          {experience.title}
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
          <MapPin size={14} color="var(--text-secondary)" />
          <span style={{ color: 'var(--text-secondary)', fontSize: 13 }}>{experience.location}</span>
        </div>

        {/* Info chips */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
          <div className="tg-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} color="var(--accent-mint)" />
            <span>{formatDuration(experience.duration)}</span>
          </div>
          <div className="tg-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Globe size={13} color="var(--accent-mint)" />
            <span>{(experience as any).language || t('exp.detail.infoChip.langDefault')}</span>
          </div>
          <div className="tg-chip" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Users size={13} color="var(--accent-mint)" />
            <span>{t('exp.detail.infoChip.maxPeople', { count: experience.maxParticipants })}</span>
          </div>
        </div>

        {/* Description */}
        <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, marginBottom: 10 }}>{t('exp.detail.description')}</h3>
          <p data-testid="text-description" style={{ color: 'var(--text-secondary)', fontSize: 14, lineHeight: 1.65, margin: 0 }}>
            {descExpanded ? experience.description : shortDesc}
          </p>
          {experience.description.length > DESC_LIMIT && (
            <button onClick={() => setDescExpanded(!descExpanded)}
              style={{ marginTop: 8, color: 'var(--accent-mint)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 4, padding: 0 }}>
              {descExpanded
                ? <><ChevronUp size={14} />{t('exp.detail.descCollapse')}</>
                : <><ChevronDown size={14} />{t('exp.detail.descExpand')}</>}
            </button>
          )}
        </div>

        {/* Included checklist */}
        {experience.included && experience.included.length > 0 && (
          <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 }}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{t('exp.detail.includes.title')}</h3>
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {experience.included.map((item, i) => (
                <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <CheckCircle2 size={16} color="var(--accent-mint)" style={{ flexShrink: 0 }} />
                  <span style={{ color: 'var(--text-primary)', fontSize: 14 }}>{item}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Mini calendar */}
        <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 }}>
          <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15, marginBottom: 12 }}>{t('exp.detail.availability.title')}</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, textAlign: 'center' }}>
            {weekDays.map((d, i) => (
              <div key={i} style={{ fontSize: 11, color: 'var(--text-secondary)', paddingBottom: 4 }}>{d}</div>
            ))}
            {Array.from({ length: firstDay }).map((_, i) => <div key={`empty-${i}`} />)}
            {availableDays.map((avail, i) => (
              <div key={i} style={{ fontSize: 12, width: 28, height: 28, borderRadius: '50%', margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', background: avail ? 'rgba(124,231,214,0.15)' : 'transparent', color: avail ? 'var(--accent-mint)' : 'var(--text-secondary)', fontWeight: avail ? 600 : 400 }}>
                {i + 1}
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--accent-mint)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('exp.detail.availability.available')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--stroke)' }} />
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{t('exp.detail.availability.unavailable')}</span>
            </div>
          </div>
        </div>

        {/* Reviews */}
        <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h3 style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 15 }}>{t('exp.detail.reviews.title')}</h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <Star size={13} fill="var(--accent-gold)" color="var(--accent-gold)" />
              <span style={{ color: 'var(--accent-gold)', fontWeight: 600, fontSize: 14 }}>{experience.rating}</span>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>({experience.reviewCount})</span>
            </div>
          </div>
          {reviews.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: 13, textAlign: 'center', padding: '8px 0', margin: 0 }}>{t('exp.detail.reviews.empty')}</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {reviews.slice(0, 3).map((review) => (
                <div key={review.id} style={{ borderTop: '1px solid var(--stroke)', paddingTop: 12, paddingBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', flexShrink: 0 }}>
                      {review.authorName[0]}
                    </div>
                    <span style={{ color: 'var(--text-primary)', fontWeight: 600, fontSize: 13 }}>{review.authorName}</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', gap: 2 }}>
                      {Array.from({ length: Math.min(review.rating, 5) }).map((_, i) => (
                        <Star key={i} size={11} fill="var(--accent-gold)" color="var(--accent-gold)" />
                      ))}
                    </div>
                  </div>
                  <p style={{ color: 'var(--text-secondary)', fontSize: 13, lineHeight: 1.5, margin: 0 }}>{review.comment}</p>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Sticky bottom bar */}
      <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface-1)', borderTop: '1px solid var(--stroke)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, zIndex: 50 }}>
        <div style={{ flexShrink: 0 }}>
          <div data-testid="text-price-sticky" style={{ color: 'var(--accent-gold)', fontWeight: 700, fontSize: 18, lineHeight: 1 }}>
            {formatPrice(experience.price, experience.currency)}
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 2 }}>{t('exp.detail.perPerson')}</div>
        </div>
        <button className="tg-btn-primary"
          style={{ flex: 1, padding: '14px 0', border: 'none', cursor: user ? 'pointer' : 'not-allowed', opacity: user ? 1 : 0.55, fontSize: 15, fontWeight: 600 }}
          onClick={() => user && setIsBookingModalOpen(true)}
          disabled={!user}
          data-testid="button-book">
          {user ? t('exp.detail.bookNow') : t('exp.detail.loginToBook')}
        </button>
      </div>

      {isBookingModalOpen && (
        <BookingModal
          experience={experience as any}
          isOpen={isBookingModalOpen}
          onClose={() => setIsBookingModalOpen(false)}
        />
      )}
    </div>
  );
}
