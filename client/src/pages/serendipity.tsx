// 세렌디피티 매칭 순간 페이지 — v3 (radial glow·수렴 애니·매칭카드·미니맵·CTA)
import { useTranslation } from 'react-i18next';
import { useLocation } from 'wouter';
import { ArrowLeft, MapPin, Globe, Heart, Sparkles } from 'lucide-react';

interface MatchUser {
  id: string;
  name: string;
  avatarUrl?: string | null;
  initials?: string;
  location?: string;
  interests?: string[];
  languages?: string[];
  mood?: string;
}

const DEMO_A: MatchUser = {
  id: 'a1', name: 'Ji-eun', initials: 'JE',
  location: 'Seoul', interests: ['photo', 'food', 'solo'],
  languages: ['ko', 'en'], mood: 'explore',
};
const DEMO_B: MatchUser = {
  id: 'b1', name: 'Marco', initials: 'MC',
  location: 'Rome → Seoul', interests: ['food', 'history', 'solo'],
  languages: ['it', 'en'], mood: 'chill',
};

function AvatarCircle({ user, size = 64, glow = false }: { user: MatchUser; size?: number; glow?: boolean }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: user.avatarUrl ? undefined : 'var(--surface-2)',
      backgroundImage: user.avatarUrl ? `url(${user.avatarUrl})` : undefined,
      backgroundSize: 'cover', backgroundPosition: 'center',
      border: '2px solid var(--accent-mint)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontWeight: 700, fontSize: size * 0.28, color: 'var(--accent-mint)',
      flexShrink: 0,
      boxShadow: glow ? '0 0 0 6px rgba(124,231,214,0.18), 0 0 24px rgba(124,231,214,0.35)' : 'none',
    }}>
      {!user.avatarUrl && (user.initials ?? user.name[0]?.toUpperCase())}
    </div>
  );
}

export default function SerendipityPage() {
  const { t } = useTranslation('ui');
  const [, setLocation] = useLocation();

  const a = DEMO_A;
  const b = DEMO_B;

  const interestsA = new Set(a.interests ?? []);
  const commonInterests = (b.interests ?? []).filter(i => interestsA.has(i));

  return (
    <div style={{ background: 'var(--app-bg)', minHeight: '100vh', paddingBottom: 100, position: 'relative', overflow: 'hidden' }}>

      {/* Radial mint glow background */}
      <div style={{
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, pointerEvents: 'none', zIndex: 0,
        background: 'radial-gradient(ellipse 70% 50% at 50% 42%, rgba(124,231,214,0.10) 0%, transparent 70%)',
      }} />

      <style>{`
        @keyframes srnPulse {
          0%, 100% { opacity: 0.6; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.08); }
        }
        @keyframes srnSlideLeft {
          0% { transform: translateX(36px); opacity: 0.4; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes srnSlideRight {
          0% { transform: translateX(-36px); opacity: 0.4; }
          100% { transform: translateX(0); opacity: 1; }
        }
        @keyframes srnRingPulse {
          0%, 100% { opacity: 0.35; transform: scale(1); }
          50% { opacity: 0.65; transform: scale(1.12); }
        }
        @keyframes srnBadgePop {
          0% { transform: scale(0.6) translateY(-6px); opacity: 0; }
          70% { transform: scale(1.08) translateY(2px); opacity: 1; }
          100% { transform: scale(1) translateY(0); opacity: 1; }
        }
        .srn-avatar-a { animation: srnSlideLeft 0.7s cubic-bezier(.34,1.56,.64,1) forwards; }
        .srn-avatar-b { animation: srnSlideRight 0.7s cubic-bezier(.34,1.56,.64,1) 0.08s forwards; }
        .srn-ring { animation: srnRingPulse 2s ease-in-out infinite; }
        .srn-badge { animation: srnBadgePop 0.5s cubic-bezier(.34,1.56,.64,1) 0.4s both; }
        .srn-pulse { animation: srnPulse 2s ease-in-out infinite; }
      `}</style>

      {/* Header */}
      <div className="tg-glass" style={{ position: 'sticky', top: 0, zIndex: 30, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={() => setLocation('/')}
          style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--surface-2)', border: '1px solid var(--stroke)', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--text-primary)', flexShrink: 0 }}
        >
          <ArrowLeft size={18} />
        </button>
        <h1 style={{ flex: 1, fontSize: 17, fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {t('serendipity.header')} <Sparkles size={15} color="var(--accent-mint)" />
        </h1>
      </div>

      <div style={{ padding: '24px 16px 0', position: 'relative', zIndex: 1 }}>

        {/* ── Matching visualization ── */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>

          {/* Avatar row with ring overlap */}
          <div style={{ position: 'relative', width: 200, height: 90, marginBottom: 12 }}>

            {/* Shared mint ring in centre */}
            <div className="srn-ring" style={{
              position: 'absolute', left: '50%', top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 80, height: 80, borderRadius: '50%',
              border: '2px solid var(--accent-mint)',
              background: 'rgba(124,231,214,0.06)',
            }} />

            {/* Avatar A (left) */}
            <div className="srn-avatar-a" style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <AvatarCircle user={a} size={72} glow />
            </div>

            {/* Avatar B (right) */}
            <div className="srn-avatar-b" style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)' }}>
              <AvatarCircle user={b} size={72} glow />
            </div>
          </div>

          {/* Distance badge */}
          <div className="srn-badge" style={{
            display: 'flex', alignItems: 'center', gap: 5, padding: '5px 12px', borderRadius: 99,
            background: 'rgba(124,231,214,0.12)', border: '1px solid rgba(124,231,214,0.4)',
          }}>
            <MapPin size={12} color="var(--accent-mint)" />
            <span style={{ fontSize: 12, color: 'var(--accent-mint)', fontWeight: 600 }}>
              {t('serendipity.distance', { defaultValue: '0.3 km apart' })}
            </span>
          </div>

          {/* Match label */}
          <p style={{ marginTop: 8, fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
            {t('serendipity.matchLabel', { defaultValue: 'You\'re nearby right now!' })}
          </p>
        </div>

        {/* ── Match detail card ── */}
        <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: 16, marginBottom: 12 }}>

          {/* User summaries */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 14 }}>
            {[a, b].map((u, idx) => (
              <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <AvatarCircle user={u} size={48} />
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{u.name}</span>
                {u.location && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                    <MapPin size={11} color="var(--text-secondary)" />
                    <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{u.location}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          <div style={{ borderTop: '1px solid var(--stroke)', paddingTop: 12 }}>

            {/* Common interests */}
            {commonInterests.length > 0 && (
              <div style={{ marginBottom: 10 }}>
                <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                  {t('serendipity.commonInterests')}
                </p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {commonInterests.map((interest) => (
                    <span key={interest} style={{
                      padding: '4px 10px', borderRadius: 99, fontSize: 12, fontWeight: 500,
                      background: 'rgba(124,231,214,0.10)', color: 'var(--accent-mint)',
                      border: '1px solid rgba(124,231,214,0.25)',
                    }}>
                      {t(`serendipity.interest.${interest}`, { defaultValue: interest })}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Languages */}
            <div style={{ marginBottom: 10 }}>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {t('serendipity.languages')}
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[...new Set([...(a.languages ?? []), ...(b.languages ?? [])])].map((lang) => (
                  <span key={lang} style={{
                    display: 'flex', alignItems: 'center', gap: 4,
                    padding: '4px 10px', borderRadius: 99, fontSize: 12,
                    background: 'var(--surface-2)', color: 'var(--text-secondary)',
                    border: '1px solid var(--stroke)',
                  }}>
                    <Globe size={10} />
                    {t(`serendipity.lang.${lang}`, { defaultValue: lang.toUpperCase() })}
                  </span>
                ))}
              </div>
            </div>

            {/* Mood tags */}
            <div>
              <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
                {t('serendipity.mood')}
              </p>
              <div style={{ display: 'flex', gap: 6 }}>
                {[a.mood, b.mood].filter(Boolean).map((m, i) => (
                  <span key={i} style={{
                    padding: '4px 10px', borderRadius: 99, fontSize: 12,
                    background: 'rgba(230,201,137,0.10)', color: 'var(--accent-gold)',
                    border: '1px solid rgba(230,201,137,0.25)',
                  }}>
                    {t(`serendipity.moodTag.${m}`, { defaultValue: m })}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Mini map view ── */}
        <div className="tg-surface" style={{ borderRadius: 'var(--radius-card)', padding: 14, marginBottom: 12 }}>
          <p style={{ fontSize: 11, color: 'var(--text-secondary)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 10 }}>
            {t('serendipity.miniMap')}
          </p>
          <div style={{ position: 'relative', height: 110, borderRadius: 14, overflow: 'hidden', background: '#0d1520' }}>
            {/* Grid lines */}
            {[20, 40, 60, 80].map(p => (
              <div key={p} style={{ position: 'absolute', left: 0, right: 0, top: `${p}%`, height: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}
            {[20, 40, 60, 80].map(p => (
              <div key={p} style={{ position: 'absolute', top: 0, bottom: 0, left: `${p}%`, width: 1, background: 'rgba(255,255,255,0.04)' }} />
            ))}

            {/* Connecting line */}
            <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}>
              <line x1="28%" y1="42%" x2="72%" y2="58%" stroke="rgba(124,231,214,0.4)" strokeWidth="1.5" strokeDasharray="4 3" />
            </svg>

            {/* Dot A */}
            <div className="srn-pulse" style={{
              position: 'absolute', left: '26%', top: '38%',
              transform: 'translate(-50%, -50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--accent-mint)',
              boxShadow: '0 0 8px rgba(124,231,214,0.7)',
            }} />
            {/* Dot B */}
            <div className="srn-pulse" style={{
              position: 'absolute', left: '74%', top: '54%',
              transform: 'translate(-50%, -50%)',
              width: 10, height: 10, borderRadius: '50%',
              background: 'var(--accent-coral)',
              boxShadow: '0 0 8px rgba(255,138,112,0.7)',
              animationDelay: '0.5s',
            }} />

            {/* Labels */}
            <span style={{ position: 'absolute', left: '26%', top: 'calc(38% + 10px)', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--accent-mint)', fontWeight: 600 }}>{a.name}</span>
            <span style={{ position: 'absolute', left: '74%', top: 'calc(54% + 10px)', transform: 'translateX(-50%)', fontSize: 10, color: 'var(--accent-coral)', fontWeight: 600 }}>{b.name}</span>
          </div>
        </div>

      </div>

      {/* ── Sticky CTA bar ── */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'rgba(17,19,26,0.95)', backdropFilter: 'blur(12px)',
        borderTop: '1px solid rgba(200,168,78,0.15)',
        padding: '12px 16px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <button
          className="tg-btn-primary"
          style={{ width: '100%', padding: '15px 0', fontSize: 16, fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}
        >
          <Heart size={17} fill="#fff" color="#fff" />
          {t('serendipity.greetCTA')}
        </button>
        <button
          className="tg-btn-ghost"
          style={{ width: '100%', padding: '11px 0', fontSize: 14, cursor: 'pointer' }}
          onClick={() => setLocation('/')}
        >
          {t('serendipity.laterCTA')}
        </button>
      </div>

    </div>
  );
}
