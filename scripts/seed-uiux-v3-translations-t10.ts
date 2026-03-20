// 시드 스크립트 — Ticket 10 (Service Request v3) 번역 키 6개 언어로 삽입
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const translations: Array<{ key: string; en: string; ko: string; ja: string; zh: string; fr: string; es: string }> = [
  // Page header
  { key: 'sreq.header', en: 'Request Travel Help', ko: '여행 도움 요청하기', ja: '旅のサポートをリクエスト', zh: '请求旅行帮助', fr: "Demander de l'aide", es: 'Solicitar ayuda de viaje' },
  { key: 'sreq.back',   en: 'Back',               ko: '뒤로',             ja: '戻る',               zh: '返回',         fr: 'Retour',               es: 'Volver' },

  // Destination
  { key: 'sreq.destination.label',       en: 'Destination City',       ko: '목적지 도시',             ja: '目的地の都市',           zh: '目的地城市',     fr: 'Ville de destination',   es: 'Ciudad de destino' },
  { key: 'sreq.destination.placeholder', en: 'e.g. Seoul, Busan…',     ko: '예: 서울, 부산…',          ja: '例：ソウル、釜山…',       zh: '例如：首尔、釜山…', fr: 'ex. Séoul, Busan…',     es: 'ej. Seúl, Busan…' },

  // Dates
  { key: 'sreq.dates.label', en: 'Travel Dates', ko: '여행 날짜', ja: '旅行日程', zh: '旅行日期', fr: 'Dates de voyage', es: 'Fechas de viaje' },
  { key: 'sreq.dates.from',  en: 'From',         ko: '시작일',   ja: '開始日',   zh: '开始日期', fr: 'Du',             es: 'Desde' },
  { key: 'sreq.dates.to',    en: 'To',           ko: '종료일',   ja: '終了日',   zh: '结束日期', fr: 'Au',             es: 'Hasta' },

  // Service types
  { key: 'sreq.serviceType.label',         en: 'Service Type',     ko: '서비스 유형',  ja: 'サービス種別',   zh: '服务类型',   fr: 'Type de service',    es: 'Tipo de servicio' },
  { key: 'sreq.serviceType.guide',         en: 'Guide',            ko: '가이드',       ja: 'ガイド',         zh: '导游',       fr: 'Guide',              es: 'Guía' },
  { key: 'sreq.serviceType.translation',   en: 'Translation',      ko: '번역',         ja: '翻訳',           zh: '翻译',       fr: 'Traduction',         es: 'Traducción' },
  { key: 'sreq.serviceType.transport',     en: 'Transport',        ko: '교통',         ja: '交通',           zh: '交通',       fr: 'Transport',          es: 'Transporte' },
  { key: 'sreq.serviceType.accommodation', en: 'Accommodation',    ko: '숙소',         ja: '宿泊',           zh: '住宿',       fr: 'Hébergement',        es: 'Alojamiento' },
  { key: 'sreq.serviceType.activity',      en: 'Activity',         ko: '활동',         ja: 'アクティビティ', zh: '活动',       fr: 'Activité',           es: 'Actividad' },

  // Group size
  { key: 'sreq.groupSize.label',  en: 'Group Size',  ko: '인원 수', ja: 'グループ人数', zh: '团队人数', fr: 'Taille du groupe', es: 'Tamaño del grupo' },
  { key: 'sreq.groupSize.people', en: 'people',      ko: '명',      ja: '名',           zh: '人',       fr: 'personnes',        es: 'personas' },

  // Budget
  { key: 'sreq.budget.label',  en: 'Budget Range', ko: '예산 범위', ja: '予算範囲', zh: '预算范围', fr: 'Fourchette de budget', es: 'Rango de presupuesto' },
  { key: 'sreq.budget.perDay', en: ' / day',        ko: ' /일',      ja: ' /日',     zh: ' /天',     fr: ' / jour',              es: ' / día' },

  // Description
  { key: 'sreq.description.label',       en: 'Description',                              ko: '요청 설명',                         ja: 'リクエスト内容',           zh: '请求说明',           fr: 'Description',                        es: 'Descripción' },
  { key: 'sreq.description.placeholder', en: 'Describe what you need in detail…',        ko: '원하는 서비스를 자세히 설명해주세요…', ja: '必要なサービスを詳しく…',   zh: '请详细描述您的需求…', fr: 'Décrivez votre besoin en détail…',    es: 'Describe lo que necesitas con detalle…' },

  // Language preference
  { key: 'sreq.languages.label', en: 'Preferred Language', ko: '선호 언어', ja: '希望言語', zh: '语言偏好', fr: 'Langue préférée', es: 'Idioma preferido' },

  // Photos
  { key: 'sreq.photos.label', en: 'Attach Photos',        ko: '사진 첨부',         ja: '写真を添付',       zh: '附加照片',   fr: 'Joindre des photos',          es: 'Adjuntar fotos' },
  { key: 'sreq.photos.hint',  en: 'Tap to add photos',    ko: '탭하여 사진 추가',   ja: 'タップして追加',   zh: '点击添加照片', fr: 'Appuyez pour ajouter',        es: 'Toca para añadir fotos' },

  // Guide preview
  { key: 'sreq.guidesPreview.title',        en: 'Matching Guides',   ko: '매칭 예상 가이드',     ja: 'マッチングガイド',       zh: '匹配导游',     fr: 'Guides disponibles',     es: 'Guías disponibles' },
  { key: 'sreq.guidesPreview.reviews',      en: 'reviews',           ko: '리뷰',                 ja: 'レビュー',               zh: '条评价',       fr: 'avis',                   es: 'reseñas' },
  { key: 'sreq.guidesPreview.unknownGuide', en: 'Guide',             ko: '가이드',               ja: 'ガイド',                 zh: '向导',         fr: 'Guide',                  es: 'Guía' },

  // Submit
  { key: 'sreq.submit',     en: 'Submit Request', ko: '요청 제출하기', ja: 'リクエストを送信', zh: '提交请求', fr: 'Soumettre la demande', es: 'Enviar solicitud' },
  { key: 'sreq.submitting', en: 'Submitting…',    ko: '제출 중…',      ja: '送信中…',          zh: '提交中…',  fr: 'Envoi en cours…',      es: 'Enviando…' },

  // Feedback
  { key: 'sreq.success.title', en: 'Request Sent!',          ko: '요청 완료!',             ja: 'リクエスト送信完了！',   zh: '请求已发送！', fr: 'Demande envoyée !',         es: '¡Solicitud enviada!' },
  { key: 'sreq.success.desc',  en: 'Guides will respond soon.', ko: '가이드들이 곧 응답할 거예요.', ja: 'ガイドがまもなく返答します。', zh: '导游们将很快回复。', fr: 'Les guides répondront bientôt.', es: 'Los guías responderán pronto.' },
  { key: 'sreq.error.title',   en: 'Submission failed',      ko: '제출 실패',              ja: '送信失敗',               zh: '提交失败',     fr: 'Échec de l'envoi',          es: 'Error al enviar' },
  { key: 'sreq.error.desc',    en: 'Please try again.',      ko: '다시 시도해주세요.',      ja: 'もう一度お試しください。', zh: '请重试。',     fr: 'Veuillez réessayer.',       es: 'Por favor, inténtalo de nuevo.' },

  // Validation
  { key: 'sreq.validation.destination',  en: 'Please enter a destination.',     ko: '목적지를 입력해주세요.',       ja: '目的地を入力してください。',   zh: '请输入目的地。',   fr: 'Veuillez entrer une destination.',  es: 'Por favor ingresa un destino.' },
  { key: 'sreq.validation.serviceType',  en: 'Select at least one service.',    ko: '서비스 유형을 선택해주세요.',  ja: 'サービスを選択してください。', zh: '请选择至少一项服务。', fr: 'Sélectionnez au moins un service.', es: 'Selecciona al menos un servicio.' },
  { key: 'sreq.validation.description',  en: 'Please add a description.',       ko: '설명을 입력해주세요.',         ja: '説明を入力してください。',     zh: '请添加描述。',     fr: 'Veuillez ajouter une description.', es: 'Por favor añade una descripción.' },
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
