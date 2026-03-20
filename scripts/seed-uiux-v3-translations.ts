// 시드 스크립트 — UI/UX v3 (Tickets 3-7) 번역 키를 translations 테이블에 삽입 (6개 언어)
// 실행: npx tsx scripts/seed-uiux-v3-translations.ts
import { Pool, neonConfig } from '@neondatabase/serverless';
import ws from 'ws';

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// All new UI v3 translation keys: [key, en, ko, ja, zh, fr, es]
const ROWS: [string, string, string, string, string, string, string][] = [
  // ── Map tab ──
  ['map.searchPlaceholder',       'Where / Who / Vibe',                         '어디 / 누구 / 분위기',                          'どこ / 誰 / 雰囲気',                         '地点 / 人物 / 氛围',                     'Où / Qui / Ambiance',                        '¿Dónde / Quién / Ambiente?'],
  ['map.sheet.title',             'What to do for the next hour?',               '지금 1시간, 뭐 하지?',                          '今から1時間、何しようか？',                    '现在1小时，做什么？',                    'Que faire pendant une heure ?',              '¿Qué hacer durante una hora?'],
  ['map.sheet.view',              'View',                                         '보기',                                          '見る',                                        '查看',                                   'Voir',                                       'Ver'],
  ['map.sheet.exploreMore',       'Explore more activities nearby',               '주변 더 많은 활동을 탐색하세요',                  '近くのアクティビティをもっと探す',             '探索附近更多活动',                       'Explorer plus d\'activités à proximité',     'Explorar más actividades cercanas'],
  ['map.sheet.sayHello',          'Say Hello',                                    '인사 보내기',                                   '挨拶する',                                    '打招呼',                                 'Dire bonjour',                               'Saludar'],
  ['map.sheet.profile',           'Profile',                                      '프로필',                                        'プロフィール',                                 '个人资料',                               'Profil',                                     'Perfil'],

  // ── Explore tab ──
  ['explore.title',               'Explore',                                      '탐색',                                          '探索',                                        '探索',                                   'Explorer',                                   'Explorar'],
  ['explore.emptyLoading',        'Loading nearby places…',                       '주변 장소를 불러오는 중...',                     '近くの場所を読み込み中...',                    '正在加载附近地点...',                    'Chargement des lieux à proximité…',          'Cargando lugares cercanos…'],
  ['explore.segments.recommended','Recommended',                                  '추천',                                          'おすすめ',                                    '推荐',                                   'Recommandé',                                 'Recomendado'],
  ['explore.segments.nearby',     'Nearby',                                       '주변',                                          '近く',                                        '附近',                                   'À proximité',                                'Cercanos'],
  ['explore.segments.reels',      'Reels',                                        '릴스',                                          'リール',                                      '短视频',                                 'Reels',                                      'Reels'],
  ['explore.segments.localhost',  'Localhost',                                    '로컬호스트',                                    'ローカルホスト',                               '本地主机',                               'Hôte local',                                 'Anfitrión local'],
  ['explore.segments.routes',     'Routes',                                       '경로',                                          'ルート',                                      '路线',                                   'Itinéraires',                                'Rutas'],

  // ── Meet tab ──
  ['meet.title',                  'People to meet now',                           '지금 만날 사람',                                '今すぐ会える人',                               '现在可见面的人',                         'Personnes à rencontrer',                     'Personas para conocer ahora'],
  ['meet.online',                 'Online',                                       '온라인',                                        'オンライン',                                  '在线',                                   'En ligne',                                   'En línea'],
  ['meet.offline',                'Offline',                                      '오프라인',                                      'オフライン',                                  '离线',                                   'Hors ligne',                                 'Fuera de línea'],
  ['meet.myStatus',               'My Status',                                    '나의 상태',                                     '自分のステータス',                             '我的状态',                               'Mon statut',                                 'Mi estado'],
  ['meet.empty.noUsers',          'No travelers available nearby right now',      '근처에 지금 만날 수 있는 여행자가 없어요',       '近くに今会える旅行者はいません',               '附近暂时没有可见面的旅行者',             'Aucun voyageur disponible à proximité',      'No hay viajeros disponibles cerca ahora'],
  ['meet.empty.openToMeetHint',   'Turn on Open to Meet to appear to others',     'Open to Meet을 켜면 다른 여행자에게 보여요',    'Open to Meetをオンにすると他の旅行者に表示されます', '开启Open to Meet即可向其他旅行者显示', 'Activez Open to Meet pour apparaître aux autres', 'Activa Open to Meet para aparecer a otros'],
  ['meet.filter.now',             'Now',                                          '지금',                                          '今すぐ',                                      '现在',                                   'Maintenant',                                 'Ahora'],
  ['meet.filter.1hour',           '1 hour',                                       '1시간',                                         '1時間',                                       '1小时',                                  '1 heure',                                    '1 hora'],
  ['meet.filter.2km',             '2 km',                                         '2km',                                           '2km',                                         '2公里',                                  '2 km',                                       '2 km'],
  ['meet.filter.dinner',          'Dinner',                                       '저녁',                                          '夕食',                                        '晚餐',                                   'Dîner',                                      'Cena'],
  ['meet.filter.walk',            'Walk',                                         '산책',                                          '散歩',                                        '散步',                                   'Promenade',                                  'Paseo'],
  ['meet.filter.langExchange',    'Language Exchange',                            '언어교환',                                      '言語交換',                                    '语言交换',                               'Échange linguistique',                       'Intercambio de idiomas'],

  // ── Chat tab ──
  ['chat.title',                  'Chat',                                         '채팅',                                          'チャット',                                    '聊天',                                   'Discussion',                                 'Chat'],
  ['chat.searchPlaceholder',      'Search conversations…',                        '대화 검색...',                                  '会話を検索...',                               '搜索对话...',                            'Rechercher des conversations…',              'Buscar conversaciones…'],
  ['chat.empty.title',            'No conversations yet',                         '아직 대화가 없어요',                             'まだ会話がありません',                         '暂无对话',                               'Pas encore de conversations',                'Aún no hay conversaciones'],
  ['chat.empty.hint',             'Why not say hello first?',                     '먼저 인사를 건네볼까요?',                        'まず挨拶してみませんか？',                     '先打个招呼吧？',                         'Pourquoi ne pas dire bonjour en premier ?',  '¿Por qué no saludar primero?'],
  ['chat.group.today',            'Today',                                        '오늘',                                          '今日',                                        '今天',                                   'Aujourd\'hui',                               'Hoy'],
  ['chat.group.thisWeek',         'This week',                                    '이번 주',                                       '今週',                                        '本周',                                   'Cette semaine',                              'Esta semana'],
  ['chat.group.older',            'Earlier',                                      '이전',                                          '以前',                                        '更早',                                   'Plus tôt',                                   'Antes'],
];

const LOCALES = ['en', 'ko', 'ja', 'zh', 'fr', 'es'] as const;
const LOCALE_IDX: Record<typeof LOCALES[number], number> = { en: 1, ko: 2, ja: 3, zh: 4, fr: 5, es: 6 };

async function seed() {
  const client = await pool.connect();
  try {
    let inserted = 0;
    let updated = 0;

    for (const [key, en, ko, ja, zh, fr, es] of ROWS) {
      const values = [en, ko, ja, zh, fr, es];
      for (const locale of LOCALES) {
        const value = values[LOCALE_IDX[locale] - 1]!;
        const result = await client.query(
          `INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
           VALUES ('ui', $1, $2, $3, false, 1, NOW(), NOW())
           ON CONFLICT (namespace, key, locale)
           DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
           RETURNING (xmax = 0) AS inserted`,
          [key, locale, value]
        );
        if (result.rows[0]?.inserted) inserted++; else updated++;
      }
    }

    console.log(`Done: ${inserted} inserted, ${updated} updated (${ROWS.length} keys × 6 locales)`);
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((err) => { console.error(err); process.exit(1); });
