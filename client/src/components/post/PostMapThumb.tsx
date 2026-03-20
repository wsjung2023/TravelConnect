// 포스트 지도 썸네일 — 위치 정보 시각화 인라인 카드 (장소명 + 장식 지도)
import { MapPin, Navigation } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface Props {
  location?: string | null;
}

export default function PostMapThumb({ location }: Props) {
  const { t } = useTranslation('ui');
  if (!location) return null;

  return (
    <div
      className="mx-4 mb-4 overflow-hidden"
      style={{ borderRadius: 16, border: '1px solid var(--stroke)', background: 'var(--surface-1)' }}
    >
      {/* Decorative map area */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 110, background: 'linear-gradient(135deg, #0d1520 0%, #1a2a40 60%, #0d1a28 100%)', overflow: 'hidden' }}
      >
        {/* Grid lines */}
        {[25, 50, 75].map((p) => (
          <div key={`h${p}`} className="absolute inset-x-0" style={{ top: `${p}%`, height: 1, background: 'rgba(124,231,214,0.07)' }} />
        ))}
        {[25, 50, 75].map((p) => (
          <div key={`v${p}`} className="absolute inset-y-0" style={{ left: `${p}%`, width: 1, background: 'rgba(124,231,214,0.07)' }} />
        ))}

        {/* Decorative route path */}
        <svg className="absolute inset-0 w-full h-full" aria-hidden="true">
          <path
            d="M 40,90 Q 90,55 150,48 T 280,38"
            stroke="#7CE7D6"
            strokeWidth="1.5"
            fill="none"
            strokeDasharray="5 3"
            opacity="0.35"
          />
        </svg>

        {/* Location pin */}
        <div className="flex flex-col items-center" style={{ zIndex: 1 }}>
          <div
            className="flex items-center justify-center w-8 h-8 rounded-full"
            style={{ background: 'var(--accent-coral)', boxShadow: '0 0 14px rgba(255,138,112,0.45)' }}
          >
            <MapPin size={15} color="#fff" />
          </div>
          <div
            className="mt-1 px-2 py-0.5 rounded-full"
            style={{ background: 'rgba(10,11,16,0.7)', backdropFilter: 'blur(4px)', border: '1px solid var(--stroke)' }}
          >
            <span style={{ fontSize: 10, color: 'var(--text-primary)', fontWeight: 600 }}>Tourgether</span>
          </div>
        </div>
      </div>

      {/* Location label + CTA */}
      <div className="flex items-center justify-between px-3 py-2.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <MapPin size={12} style={{ color: 'var(--accent-mint)', flexShrink: 0 }} />
          <span style={{ fontSize: 13, color: 'var(--text-primary)' }} className="truncate">{location}</span>
        </div>
        <button
          className="flex items-center gap-1 flex-shrink-0 tg-chip tg-chip-active"
          style={{ fontSize: 11, padding: '3px 10px' }}
        >
          <Navigation size={10} />
          {t('post.detail.mapView')}
        </button>
      </div>
    </div>
  );
}
