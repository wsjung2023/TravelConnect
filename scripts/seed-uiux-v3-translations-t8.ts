// 시드 스크립트 — Ticket 8 (Feed Post Detail) 번역 키 6개 언어로 삽입
import { neon } from '@neondatabase/serverless';

const sql = neon(process.env.DATABASE_URL!);

const translations: Array<{ key: string; en: string; ko: string; ja: string; zh: string; fr: string; es: string }> = [
  // Post detail — time
  { key: 'post.detail.timeAgo.justNow', en: 'Just now', ko: '방금 전', ja: 'たった今', zh: '刚刚', fr: "À l'instant", es: 'Justo ahora' },
  { key: 'post.detail.timeAgo.mins', en: '{{count}}m ago', ko: '{{count}}분 전', ja: '{{count}}分前', zh: '{{count}}分钟前', fr: 'il y a {{count}} min', es: 'hace {{count}} min' },
  { key: 'post.detail.timeAgo.hours', en: '{{count}}h ago', ko: '{{count}}시간 전', ja: '{{count}}時間前', zh: '{{count}}小时前', fr: 'il y a {{count}} h', es: 'hace {{count}} h' },
  { key: 'post.detail.timeAgo.days', en: '{{count}}d ago', ko: '{{count}}일 전', ja: '{{count}}日前', zh: '{{count}}天前', fr: 'il y a {{count}} j', es: 'hace {{count}} d' },

  // Post detail — actions
  { key: 'post.detail.like', en: 'Like', ko: '좋아요', ja: 'いいね', zh: '点赞', fr: "J'aime", es: 'Me gusta' },
  { key: 'post.detail.comment', en: 'Comment', ko: '댓글', ja: 'コメント', zh: '评论', fr: 'Commenter', es: 'Comentar' },
  { key: 'post.detail.save', en: 'Save', ko: '저장', ja: '保存', zh: '收藏', fr: 'Enregistrer', es: 'Guardar' },
  { key: 'post.detail.saved', en: 'Saved', ko: '저장됨', ja: '保存済み', zh: '已收藏', fr: 'Enregistré', es: 'Guardado' },
  { key: 'post.detail.share', en: 'Share', ko: '공유', ja: 'シェア', zh: '分享', fr: 'Partager', es: 'Compartir' },
  { key: 'post.detail.follow', en: 'Follow', ko: '팔로우', ja: 'フォロー', zh: '关注', fr: 'Suivre', es: 'Seguir' },
  { key: 'post.detail.following', en: 'Following', ko: '팔로잉', ja: 'フォロー中', zh: '已关注', fr: 'Abonné', es: 'Siguiendo' },

  // Post detail — map
  { key: 'post.detail.mapView', en: 'View on Map', ko: '지도에서 보기', ja: '地図で見る', zh: '在地图上查看', fr: 'Voir sur la carte', es: 'Ver en el mapa' },

  // Post detail — comments
  { key: 'post.detail.comments.title', en: 'Comments', ko: '댓글', ja: 'コメント', zh: '评论', fr: 'Commentaires', es: 'Comentarios' },
  { key: 'post.detail.comments.loading', en: 'Loading…', ko: '불러오는 중…', ja: '読み込み中…', zh: '加载中…', fr: 'Chargement…', es: 'Cargando…' },
  { key: 'post.detail.comments.empty', en: 'No comments yet. Be the first!', ko: '아직 댓글이 없어요. 첫 댓글을 남겨보세요!', ja: 'まだコメントがありません。最初に投稿しましょう！', zh: '还没有评论，快来抢沙发！', fr: 'Aucun commentaire. Soyez le premier !', es: '¡Sin comentarios aún. ¡Sé el primero!' },
  { key: 'post.detail.comments.reply', en: 'Reply', ko: '답글', ja: '返信', zh: '回复', fr: 'Répondre', es: 'Responder' },
  { key: 'post.detail.comments.replyBadge', en: 'Reply', ko: '답글', ja: '返信', zh: '回复', fr: 'Réponse', es: 'Respuesta' },
  { key: 'post.detail.comments.replyPlaceholder', en: 'Write a reply…', ko: '답글을 입력하세요', ja: '返信を入力…', zh: '写回复…', fr: 'Écrire une réponse…', es: 'Escribe una respuesta…' },
  { key: 'post.detail.comments.placeholder', en: 'Write a comment…', ko: '댓글을 입력하세요', ja: 'コメントを入力…', zh: '写评论…', fr: 'Écrire un commentaire…', es: 'Escribe un comentario…' },
  { key: 'post.detail.comments.sending', en: 'sending', ko: '전송 중', ja: '送信中', zh: '发送中', fr: 'envoi en cours', es: 'enviando' },

  // Post detail — offer
  { key: 'post.detail.offer.guideBadge', en: 'Guide', ko: '가이드', ja: 'ガイド', zh: '向导', fr: 'Guide', es: 'Guía' },
  { key: 'post.detail.offer.specialOffer', en: 'Special Offer', ko: '특별 제안', ja: 'スペシャルオファー', zh: '特别优惠', fr: 'Offre spéciale', es: 'Oferta especial' },
  { key: 'post.detail.offer.accepted', en: 'Accepted', ko: '수락됨', ja: '承認済み', zh: '已接受', fr: 'Accepté', es: 'Aceptado' },
  { key: 'post.detail.offer.declined', en: 'Declined', ko: '거절됨', ja: '拒否済み', zh: '已拒绝', fr: 'Refusé', es: 'Rechazado' },
  { key: 'post.detail.offer.pending', en: 'Pending', ko: '대기 중', ja: '保留中', zh: '待处理', fr: 'En attente', es: 'Pendiente' },
  { key: 'post.detail.offer.viewOffer', en: 'View Offer', ko: '제안 보기', ja: 'オファーを見る', zh: '查看报价', fr: "Voir l'offre", es: 'Ver oferta' },
  { key: 'post.detail.offer.accept', en: 'Accept', ko: '수락', ja: '承認', zh: '接受', fr: 'Accepter', es: 'Aceptar' },
  { key: 'post.detail.offer.decline', en: 'Decline', ko: '거절', ja: '拒否', zh: '拒绝', fr: 'Refuser', es: 'Rechazar' },
  { key: 'post.detail.offer.title', en: 'Make an Offer', ko: '오퍼 제안하기', ja: 'オファーを提案', zh: '发送报价', fr: 'Faire une offre', es: 'Hacer una oferta' },
  { key: 'post.detail.offer.contentPlaceholder', en: 'Describe your service…', ko: '서비스 내용을 작성해주세요', ja: 'サービス内容を入力…', zh: '描述您的服务…', fr: 'Décrivez votre service…', es: 'Describe tu servicio…' },
  { key: 'post.detail.offer.priceLabel', en: 'Price (USD)', ko: '가격 (USD)', ja: '料金 (USD)', zh: '价格 (USD)', fr: 'Prix (USD)', es: 'Precio (USD)' },
  { key: 'post.detail.offer.durationLabel', en: 'Duration', ko: '소요시간', ja: '所要時間', zh: '时长', fr: 'Durée', es: 'Duración' },
  { key: 'post.detail.offer.descriptionPlaceholder', en: 'Additional details (optional)', ko: '상세 설명 (선택)', ja: '詳細説明（任意）', zh: '详细说明（可选）', fr: 'Détails supplémentaires (optionnel)', es: 'Detalles adicionales (opcional)' },
  { key: 'post.detail.offer.cancel', en: 'Cancel', ko: '취소', ja: 'キャンセル', zh: '取消', fr: 'Annuler', es: 'Cancelar' },
  { key: 'post.detail.offer.send', en: 'Send Offer', ko: '오퍼 보내기', ja: 'オファーを送る', zh: '发送报价', fr: "Envoyer l'offre", es: 'Enviar oferta' },
  { key: 'post.detail.offer.sending', en: 'Sending…', ko: '전송중…', ja: '送信中…', zh: '发送中…', fr: 'Envoi…', es: 'Enviando…' },
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
