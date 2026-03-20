// 시드 스크립트 — Ticket 9 (Experience Detail v3) 번역 키 6개 언어로 삽입
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const translations: Array<{ key: string; en: string; ko: string; ja: string; zh: string; fr: string; es: string }> = [
  // Loading / error states
  { key: 'exp.detail.loading',      en: 'Loading experience…',          ko: '체험 정보를 불러오는 중…',       ja: '体験を読み込み中…',               zh: '加载体验中…',           fr: 'Chargement…',                   es: 'Cargando experiencia…' },
  { key: 'exp.detail.notFound',     en: 'Experience not found',          ko: '체험을 찾을 수 없어요',           ja: '体験が見つかりません',             zh: '找不到该体验',           fr: 'Expérience introuvable',        es: 'Experiencia no encontrada' },
  { key: 'exp.detail.notFoundDesc', en: 'This experience may have been removed or is no longer available.', ko: '이 체험은 삭제되었거나 더 이상 이용할 수 없습니다.', ja: 'この体験は削除されたか利用できません。', zh: '此体验已被删除或不再可用。', fr: "Cette expérience a été supprimée ou n'est plus disponible.", es: 'Esta experiencia fue eliminada o ya no está disponible.' },
  { key: 'exp.detail.back',         en: 'Back',                          ko: '뒤로',                           ja: '戻る',                            zh: '返回',                  fr: 'Retour',                        es: 'Volver' },

  // Duration formatting
  { key: 'exp.detail.minutes',      en: '{{count}} min',                 ko: '{{count}}분',                    ja: '{{count}}分',                     zh: '{{count}}分钟',         fr: '{{count}} min',                 es: '{{count}} min' },
  { key: 'exp.detail.hours',        en: '{{count}} hr',                  ko: '{{count}}시간',                  ja: '{{count}}時間',                   zh: '{{count}}小时',         fr: '{{count}} h',                  es: '{{count}} h' },
  { key: 'exp.detail.hoursMinutes', en: '{{hours}} hr {{minutes}} min',  ko: '{{hours}}시간 {{minutes}}분',    ja: '{{hours}}時間{{minutes}}分',       zh: '{{hours}}小时{{minutes}}分', fr: '{{hours}} h {{minutes}} min', es: '{{hours}} h {{minutes}} min' },

  // Host card
  { key: 'exp.detail.hostCard.unknownHost',    en: 'Guide',             ko: '가이드',          ja: 'ガイド',             zh: '向导',          fr: 'Guide',              es: 'Guía' },
  { key: 'exp.detail.hostCard.verifiedBadge',  en: 'Verified',          ko: '인증',             ja: '認証済み',           zh: '已认证',         fr: 'Vérifié',            es: 'Verificado' },
  { key: 'exp.detail.hostCard.reviews',        en: 'reviews',           ko: '리뷰',             ja: 'レビュー',           zh: '条评价',         fr: 'avis',               es: 'reseñas' },
  { key: 'exp.detail.hostCard.viewProfile',    en: 'View profile',      ko: '프로필 보기',      ja: 'プロフィールを見る', zh: '查看主页',       fr: 'Voir le profil',     es: 'Ver perfil' },

  // Info chips
  { key: 'exp.detail.infoChip.langDefault',  en: 'EN',                  ko: '한국어',           ja: '日本語',             zh: '中文',           fr: 'FR',                 es: 'ES' },
  { key: 'exp.detail.infoChip.maxPeople',    en: 'Up to {{count}}',     ko: '최대 {{count}}명', ja: '最大{{count}}名',   zh: '最多{{count}}人', fr: "Jusqu'à {{count}}", es: 'Hasta {{count}}' },

  // Description
  { key: 'exp.detail.description',   en: 'About this experience',   ko: '이 체험에 대해',       ja: 'この体験について',   zh: '关于此体验',     fr: 'À propos',               es: 'Acerca de esta experiencia' },
  { key: 'exp.detail.descExpand',    en: 'Show more',               ko: '더 보기',              ja: 'もっと見る',         zh: '查看更多',       fr: 'Voir plus',              es: 'Ver más' },
  { key: 'exp.detail.descCollapse',  en: 'Show less',               ko: '접기',                 ja: '折りたたむ',         zh: '收起',           fr: 'Voir moins',             es: 'Ver menos' },

  // Included
  { key: 'exp.detail.includes.title', en: "What's included", ko: '포함 사항', ja: '含まれるもの', zh: '包含内容', fr: 'Ce qui est inclus', es: 'Qué incluye' },

  // Availability calendar
  { key: 'exp.detail.availability.title',       en: 'Availability',      ko: '가용 날짜',       ja: '空き状況',          zh: '可用日期',         fr: 'Disponibilité',       es: 'Disponibilidad' },
  { key: 'exp.detail.availability.available',   en: 'Available',         ko: '예약 가능',       ja: '予約可能',          zh: '可预订',           fr: 'Disponible',          es: 'Disponible' },
  { key: 'exp.detail.availability.unavailable', en: 'Unavailable',       ko: '예약 불가',       ja: '予約不可',          zh: '不可预订',         fr: 'Indisponible',        es: 'No disponible' },
  { key: 'exp.detail.availability.weekDays',    en: 'S,M,T,W,T,F,S',    ko: '일,월,화,수,목,금,토', ja: '日,月,火,水,木,金,土', zh: '日,一,二,三,四,五,六', fr: 'D,L,M,M,J,V,S',   es: 'D,L,M,X,J,V,S' },

  // Reviews
  { key: 'exp.detail.reviews.title', en: 'Reviews',              ko: '리뷰',         ja: 'レビュー',         zh: '评价',     fr: 'Avis',               es: 'Reseñas' },
  { key: 'exp.detail.reviews.empty', en: 'No reviews yet.',      ko: '아직 리뷰가 없습니다.', ja: 'まだレビューはありません。', zh: '暂无评价。', fr: 'Aucun avis pour le moment.', es: 'Aún no hay reseñas.' },

  // Sticky bottom bar
  { key: 'exp.detail.perPerson',    en: 'per person',            ko: '1인 기준',      ja: '一人あたり',       zh: '每人',     fr: 'par personne',       es: 'por persona' },
  { key: 'exp.detail.bookNow',      en: 'Book Now',              ko: '지금 예약',     ja: '今すぐ予約',       zh: '立即预订', fr: 'Réserver',           es: 'Reservar ahora' },
  { key: 'exp.detail.loginToBook',  en: 'Log in to book',        ko: '로그인 후 예약', ja: 'ログインして予約', zh: '登录后预订', fr: 'Connectez-vous pour réserver', es: 'Inicia sesión para reservar' },
];

const LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'es'] as const;
type Locale = typeof LOCALES[number];

async function seed() {
  console.log(`Seeding ${translations.length} keys × ${LOCALES.length} locales…`);
  let inserted = 0;

  for (const row of translations) {
    for (const locale of LOCALES) {
      const value = row[locale as Locale];
      await sql`
        INSERT INTO translations (namespace, key, locale, value, is_reviewed, version)
        VALUES ('ui', ${row.key}, ${locale}, ${value}, false, 1)
        ON CONFLICT (namespace, key, locale)
        DO UPDATE SET value = EXCLUDED.value
      `;
      inserted++;
    }
  }

  console.log(`Done — ${inserted} rows upserted.`);
}

seed().catch((err) => { console.error(err); process.exit(1); });
