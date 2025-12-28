-- UAT 피드백 기반 누락된 i18n 번역 키 추가
-- 생성일: 2025-12-28
-- 대상: translations 테이블
-- 네임스페이스: ui
-- 언어: en, ko, ja, zh, fr, es

-- =====================================================
-- post 관련 키 (게시글 작성 모달)
-- =====================================================

-- post.gallery
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.gallery', 'en', 'Gallery', true, 1, NOW(), NOW()),
  ('ui', 'post.gallery', 'ko', '갤러리', true, 1, NOW(), NOW()),
  ('ui', 'post.gallery', 'ja', 'ギャラリー', true, 1, NOW(), NOW()),
  ('ui', 'post.gallery', 'zh', '相册', true, 1, NOW(), NOW()),
  ('ui', 'post.gallery', 'fr', 'Galerie', true, 1, NOW(), NOW()),
  ('ui', 'post.gallery', 'es', 'Galería', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.takePhoto
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.takePhoto', 'en', 'Take Photo', true, 1, NOW(), NOW()),
  ('ui', 'post.takePhoto', 'ko', '사진 촬영', true, 1, NOW(), NOW()),
  ('ui', 'post.takePhoto', 'ja', '写真を撮る', true, 1, NOW(), NOW()),
  ('ui', 'post.takePhoto', 'zh', '拍照', true, 1, NOW(), NOW()),
  ('ui', 'post.takePhoto', 'fr', 'Prendre une photo', true, 1, NOW(), NOW()),
  ('ui', 'post.takePhoto', 'es', 'Tomar foto', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.recordVideo
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.recordVideo', 'en', 'Record Video', true, 1, NOW(), NOW()),
  ('ui', 'post.recordVideo', 'ko', '동영상 촬영', true, 1, NOW(), NOW()),
  ('ui', 'post.recordVideo', 'ja', '動画を撮る', true, 1, NOW(), NOW()),
  ('ui', 'post.recordVideo', 'zh', '录制视频', true, 1, NOW(), NOW()),
  ('ui', 'post.recordVideo', 'fr', 'Enregistrer une vidéo', true, 1, NOW(), NOW()),
  ('ui', 'post.recordVideo', 'es', 'Grabar video', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.addMedia
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.addMedia', 'en', 'Add Photos & Videos', true, 1, NOW(), NOW()),
  ('ui', 'post.addMedia', 'ko', '사진 및 동영상 추가', true, 1, NOW(), NOW()),
  ('ui', 'post.addMedia', 'ja', '写真・動画を追加', true, 1, NOW(), NOW()),
  ('ui', 'post.addMedia', 'zh', '添加照片和视频', true, 1, NOW(), NOW()),
  ('ui', 'post.addMedia', 'fr', 'Ajouter photos et vidéos', true, 1, NOW(), NOW()),
  ('ui', 'post.addMedia', 'es', 'Agregar fotos y videos', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.youtubeUrl
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.youtubeUrl', 'en', 'YouTube URL', true, 1, NOW(), NOW()),
  ('ui', 'post.youtubeUrl', 'ko', 'YouTube URL', true, 1, NOW(), NOW()),
  ('ui', 'post.youtubeUrl', 'ja', 'YouTube URL', true, 1, NOW(), NOW()),
  ('ui', 'post.youtubeUrl', 'zh', 'YouTube 链接', true, 1, NOW(), NOW()),
  ('ui', 'post.youtubeUrl', 'fr', 'URL YouTube', true, 1, NOW(), NOW()),
  ('ui', 'post.youtubeUrl', 'es', 'URL de YouTube', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.noMediaSelected
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.noMediaSelected', 'en', 'No media selected', true, 1, NOW(), NOW()),
  ('ui', 'post.noMediaSelected', 'ko', '선택된 미디어 없음', true, 1, NOW(), NOW()),
  ('ui', 'post.noMediaSelected', 'ja', 'メディアが選択されていません', true, 1, NOW(), NOW()),
  ('ui', 'post.noMediaSelected', 'zh', '未选择媒体', true, 1, NOW(), NOW()),
  ('ui', 'post.noMediaSelected', 'fr', 'Aucun média sélectionné', true, 1, NOW(), NOW()),
  ('ui', 'post.noMediaSelected', 'es', 'Sin medios seleccionados', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.videoTooLarge
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.videoTooLarge', 'en', 'Video is too large', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLarge', 'ko', '동영상 파일이 너무 큽니다', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLarge', 'ja', '動画ファイルが大きすぎます', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLarge', 'zh', '视频文件太大', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLarge', 'fr', 'La vidéo est trop volumineuse', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLarge', 'es', 'El video es demasiado grande', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- post.videoTooLargeDesc
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'post.videoTooLargeDesc', 'en', 'Maximum video size is 50MB', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLargeDesc', 'ko', '최대 동영상 크기는 50MB입니다', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLargeDesc', 'ja', '動画の最大サイズは50MBです', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLargeDesc', 'zh', '视频最大大小为50MB', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLargeDesc', 'fr', 'La taille maximale de la vidéo est de 50 Mo', true, 1, NOW(), NOW()),
  ('ui', 'post.videoTooLargeDesc', 'es', 'El tamaño máximo del video es 50MB', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- guide 관련 키 (가이드 프로필 페이지)
-- =====================================================

-- guide.notFound
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.notFound', 'en', 'Guide not found', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFound', 'ko', '가이드를 찾을 수 없습니다', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFound', 'ja', 'ガイドが見つかりません', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFound', 'zh', '未找到导游', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFound', 'fr', 'Guide non trouvé', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFound', 'es', 'Guía no encontrado', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.notFoundDesc
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.notFoundDesc', 'en', 'The guide you are looking for does not exist or has been removed.', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFoundDesc', 'ko', '찾으시는 가이드가 존재하지 않거나 삭제되었습니다.', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFoundDesc', 'ja', 'お探しのガイドは存在しないか、削除されました。', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFoundDesc', 'zh', '您查找的导游不存在或已被删除。', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFoundDesc', 'fr', 'Le guide que vous recherchez n''existe pas ou a été supprimé.', true, 1, NOW(), NOW()),
  ('ui', 'guide.notFoundDesc', 'es', 'El guía que buscas no existe o ha sido eliminado.', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.sendMessage
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.sendMessage', 'en', 'Send Message', true, 1, NOW(), NOW()),
  ('ui', 'guide.sendMessage', 'ko', '메시지 보내기', true, 1, NOW(), NOW()),
  ('ui', 'guide.sendMessage', 'ja', 'メッセージを送る', true, 1, NOW(), NOW()),
  ('ui', 'guide.sendMessage', 'zh', '发送消息', true, 1, NOW(), NOW()),
  ('ui', 'guide.sendMessage', 'fr', 'Envoyer un message', true, 1, NOW(), NOW()),
  ('ui', 'guide.sendMessage', 'es', 'Enviar mensaje', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.experiencesTab
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.experiencesTab', 'en', 'Experiences ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiencesTab', 'ko', '체험 ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiencesTab', 'ja', '体験 ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiencesTab', 'zh', '体验 ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiencesTab', 'fr', 'Expériences ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiencesTab', 'es', 'Experiencias ({{count}})', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.storiesTab
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.storiesTab', 'en', 'Stories', true, 1, NOW(), NOW()),
  ('ui', 'guide.storiesTab', 'ko', '스토리', true, 1, NOW(), NOW()),
  ('ui', 'guide.storiesTab', 'ja', 'ストーリー', true, 1, NOW(), NOW()),
  ('ui', 'guide.storiesTab', 'zh', '故事', true, 1, NOW(), NOW()),
  ('ui', 'guide.storiesTab', 'fr', 'Histoires', true, 1, NOW(), NOW()),
  ('ui', 'guide.storiesTab', 'es', 'Historias', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.reviewsTab
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.reviewsTab', 'en', 'Reviews ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsTab', 'ko', '리뷰 ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsTab', 'ja', 'レビュー ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsTab', 'zh', '评价 ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsTab', 'fr', 'Avis ({{count}})', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsTab', 'es', 'Reseñas ({{count}})', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.viewDetails
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.viewDetails', 'en', 'View Details', true, 1, NOW(), NOW()),
  ('ui', 'guide.viewDetails', 'ko', '상세 보기', true, 1, NOW(), NOW()),
  ('ui', 'guide.viewDetails', 'ja', '詳細を見る', true, 1, NOW(), NOW()),
  ('ui', 'guide.viewDetails', 'zh', '查看详情', true, 1, NOW(), NOW()),
  ('ui', 'guide.viewDetails', 'fr', 'Voir les détails', true, 1, NOW(), NOW()),
  ('ui', 'guide.viewDetails', 'es', 'Ver detalles', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.hours
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.hours', 'en', 'h', true, 1, NOW(), NOW()),
  ('ui', 'guide.hours', 'ko', '시간', true, 1, NOW(), NOW()),
  ('ui', 'guide.hours', 'ja', '時間', true, 1, NOW(), NOW()),
  ('ui', 'guide.hours', 'zh', '小时', true, 1, NOW(), NOW()),
  ('ui', 'guide.hours', 'fr', 'h', true, 1, NOW(), NOW()),
  ('ui', 'guide.hours', 'es', 'h', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.minutes
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.minutes', 'en', 'min', true, 1, NOW(), NOW()),
  ('ui', 'guide.minutes', 'ko', '분', true, 1, NOW(), NOW()),
  ('ui', 'guide.minutes', 'ja', '分', true, 1, NOW(), NOW()),
  ('ui', 'guide.minutes', 'zh', '分钟', true, 1, NOW(), NOW()),
  ('ui', 'guide.minutes', 'fr', 'min', true, 1, NOW(), NOW()),
  ('ui', 'guide.minutes', 'es', 'min', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.maxParticipants
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.maxParticipants', 'en', 'Max {{count}} participants', true, 1, NOW(), NOW()),
  ('ui', 'guide.maxParticipants', 'ko', '최대 {{count}}명', true, 1, NOW(), NOW()),
  ('ui', 'guide.maxParticipants', 'ja', '最大{{count}}名', true, 1, NOW(), NOW()),
  ('ui', 'guide.maxParticipants', 'zh', '最多{{count}}人', true, 1, NOW(), NOW()),
  ('ui', 'guide.maxParticipants', 'fr', 'Max {{count}} participants', true, 1, NOW(), NOW()),
  ('ui', 'guide.maxParticipants', 'es', 'Máx. {{count}} participantes', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.verifiedGuide
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.verifiedGuide', 'en', 'Verified Guide', true, 1, NOW(), NOW()),
  ('ui', 'guide.verifiedGuide', 'ko', '인증된 가이드', true, 1, NOW(), NOW()),
  ('ui', 'guide.verifiedGuide', 'ja', '認証済みガイド', true, 1, NOW(), NOW()),
  ('ui', 'guide.verifiedGuide', 'zh', '认证导游', true, 1, NOW(), NOW()),
  ('ui', 'guide.verifiedGuide', 'fr', 'Guide vérifié', true, 1, NOW(), NOW()),
  ('ui', 'guide.verifiedGuide', 'es', 'Guía verificado', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.categoryTour
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.categoryTour', 'en', 'Tour', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTour', 'ko', '투어', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTour', 'ja', 'ツアー', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTour', 'zh', '旅游', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTour', 'fr', 'Visite', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTour', 'es', 'Tour', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.categoryFood
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.categoryFood', 'en', 'Food', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryFood', 'ko', '음식', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryFood', 'ja', 'グルメ', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryFood', 'zh', '美食', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryFood', 'fr', 'Gastronomie', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryFood', 'es', 'Comida', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.categoryActivity
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.categoryActivity', 'en', 'Activity', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryActivity', 'ko', '액티비티', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryActivity', 'ja', 'アクティビティ', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryActivity', 'zh', '活动', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryActivity', 'fr', 'Activité', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryActivity', 'es', 'Actividad', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.categoryTip
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.categoryTip', 'en', 'Tip', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTip', 'ko', '팁', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTip', 'ja', 'ヒント', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTip', 'zh', '提示', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTip', 'fr', 'Conseil', true, 1, NOW(), NOW()),
  ('ui', 'guide.categoryTip', 'es', 'Consejo', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.experiences
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.experiences', 'en', 'Experiences', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiences', 'ko', '체험', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiences', 'ja', '体験', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiences', 'zh', '体验', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiences', 'fr', 'Expériences', true, 1, NOW(), NOW()),
  ('ui', 'guide.experiences', 'es', 'Experiencias', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.reviewsCount
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.reviewsCount', 'en', '{{count}} Reviews', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsCount', 'ko', '{{count}}개 리뷰', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsCount', 'ja', '{{count}}件のレビュー', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsCount', 'zh', '{{count}}条评价', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsCount', 'fr', '{{count}} Avis', true, 1, NOW(), NOW()),
  ('ui', 'guide.reviewsCount', 'es', '{{count}} Reseñas', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.responseRate
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.responseRate', 'en', 'Response Rate', true, 1, NOW(), NOW()),
  ('ui', 'guide.responseRate', 'ko', '응답률', true, 1, NOW(), NOW()),
  ('ui', 'guide.responseRate', 'ja', '返信率', true, 1, NOW(), NOW()),
  ('ui', 'guide.responseRate', 'zh', '回复率', true, 1, NOW(), NOW()),
  ('ui', 'guide.responseRate', 'fr', 'Taux de réponse', true, 1, NOW(), NOW()),
  ('ui', 'guide.responseRate', 'es', 'Tasa de respuesta', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.joinedYear
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.joinedYear', 'en', 'Joined', true, 1, NOW(), NOW()),
  ('ui', 'guide.joinedYear', 'ko', '가입', true, 1, NOW(), NOW()),
  ('ui', 'guide.joinedYear', 'ja', '登録年', true, 1, NOW(), NOW()),
  ('ui', 'guide.joinedYear', 'zh', '加入年份', true, 1, NOW(), NOW()),
  ('ui', 'guide.joinedYear', 'fr', 'Inscrit depuis', true, 1, NOW(), NOW()),
  ('ui', 'guide.joinedYear', 'es', 'Unido desde', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.noReviews
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.noReviews', 'en', 'No reviews yet', true, 1, NOW(), NOW()),
  ('ui', 'guide.noReviews', 'ko', '아직 리뷰가 없습니다', true, 1, NOW(), NOW()),
  ('ui', 'guide.noReviews', 'ja', 'まだレビューがありません', true, 1, NOW(), NOW()),
  ('ui', 'guide.noReviews', 'zh', '暂无评价', true, 1, NOW(), NOW()),
  ('ui', 'guide.noReviews', 'fr', 'Pas encore d''avis', true, 1, NOW(), NOW()),
  ('ui', 'guide.noReviews', 'es', 'Sin reseñas aún', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.noExperiences
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.noExperiences', 'en', 'No experiences yet', true, 1, NOW(), NOW()),
  ('ui', 'guide.noExperiences', 'ko', '아직 등록된 체험이 없습니다', true, 1, NOW(), NOW()),
  ('ui', 'guide.noExperiences', 'ja', 'まだ体験がありません', true, 1, NOW(), NOW()),
  ('ui', 'guide.noExperiences', 'zh', '暂无体验', true, 1, NOW(), NOW()),
  ('ui', 'guide.noExperiences', 'fr', 'Pas encore d''expériences', true, 1, NOW(), NOW()),
  ('ui', 'guide.noExperiences', 'es', 'Sin experiencias aún', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- guide.noStories
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'guide.noStories', 'en', 'No stories yet', true, 1, NOW(), NOW()),
  ('ui', 'guide.noStories', 'ko', '아직 작성된 스토리가 없습니다', true, 1, NOW(), NOW()),
  ('ui', 'guide.noStories', 'ja', 'まだストーリーがありません', true, 1, NOW(), NOW()),
  ('ui', 'guide.noStories', 'zh', '暂无故事', true, 1, NOW(), NOW()),
  ('ui', 'guide.noStories', 'fr', 'Pas encore d''histoires', true, 1, NOW(), NOW()),
  ('ui', 'guide.noStories', 'es', 'Sin historias aún', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- themes 관련 키 (게시글 테마)
-- =====================================================

-- themes.shopping
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'themes.shopping', 'en', 'Shopping', true, 1, NOW(), NOW()),
  ('ui', 'themes.shopping', 'ko', '쇼핑', true, 1, NOW(), NOW()),
  ('ui', 'themes.shopping', 'ja', 'ショッピング', true, 1, NOW(), NOW()),
  ('ui', 'themes.shopping', 'zh', '购物', true, 1, NOW(), NOW()),
  ('ui', 'themes.shopping', 'fr', 'Shopping', true, 1, NOW(), NOW()),
  ('ui', 'themes.shopping', 'es', 'Compras', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- 공통 UI 키 추가
-- =====================================================

-- common.back
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.back', 'en', 'Back', true, 1, NOW(), NOW()),
  ('ui', 'common.back', 'ko', '뒤로', true, 1, NOW(), NOW()),
  ('ui', 'common.back', 'ja', '戻る', true, 1, NOW(), NOW()),
  ('ui', 'common.back', 'zh', '返回', true, 1, NOW(), NOW()),
  ('ui', 'common.back', 'fr', 'Retour', true, 1, NOW(), NOW()),
  ('ui', 'common.back', 'es', 'Volver', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- common.loading
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.loading', 'en', 'Loading...', true, 1, NOW(), NOW()),
  ('ui', 'common.loading', 'ko', '로딩 중...', true, 1, NOW(), NOW()),
  ('ui', 'common.loading', 'ja', '読み込み中...', true, 1, NOW(), NOW()),
  ('ui', 'common.loading', 'zh', '加载中...', true, 1, NOW(), NOW()),
  ('ui', 'common.loading', 'fr', 'Chargement...', true, 1, NOW(), NOW()),
  ('ui', 'common.loading', 'es', 'Cargando...', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- common.save
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.save', 'en', 'Save', true, 1, NOW(), NOW()),
  ('ui', 'common.save', 'ko', '저장', true, 1, NOW(), NOW()),
  ('ui', 'common.save', 'ja', '保存', true, 1, NOW(), NOW()),
  ('ui', 'common.save', 'zh', '保存', true, 1, NOW(), NOW()),
  ('ui', 'common.save', 'fr', 'Enregistrer', true, 1, NOW(), NOW()),
  ('ui', 'common.save', 'es', 'Guardar', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- common.cancel
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.cancel', 'en', 'Cancel', true, 1, NOW(), NOW()),
  ('ui', 'common.cancel', 'ko', '취소', true, 1, NOW(), NOW()),
  ('ui', 'common.cancel', 'ja', 'キャンセル', true, 1, NOW(), NOW()),
  ('ui', 'common.cancel', 'zh', '取消', true, 1, NOW(), NOW()),
  ('ui', 'common.cancel', 'fr', 'Annuler', true, 1, NOW(), NOW()),
  ('ui', 'common.cancel', 'es', 'Cancelar', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- common.bookmark
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.bookmark', 'en', 'Bookmark', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmark', 'ko', '북마크', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmark', 'ja', 'ブックマーク', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmark', 'zh', '收藏', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmark', 'fr', 'Signet', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmark', 'es', 'Marcador', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- common.bookmarkSave
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.bookmarkSave', 'en', 'Save to bookmarks', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkSave', 'ko', '북마크에 저장', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkSave', 'ja', 'ブックマークに保存', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkSave', 'zh', '添加到收藏', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkSave', 'fr', 'Enregistrer dans les signets', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkSave', 'es', 'Guardar en marcadores', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- common.bookmarkRemove
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'common.bookmarkRemove', 'en', 'Remove from bookmarks', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkRemove', 'ko', '북마크에서 제거', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkRemove', 'ja', 'ブックマークから削除', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkRemove', 'zh', '从收藏中删除', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkRemove', 'fr', 'Supprimer des signets', true, 1, NOW(), NOW()),
  ('ui', 'common.bookmarkRemove', 'es', 'Eliminar de marcadores', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- 알림 관련 키
-- =====================================================

-- notification.like
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'notification.like', 'en', '{{name}} liked your post', true, 1, NOW(), NOW()),
  ('ui', 'notification.like', 'ko', '{{name}}님이 회원님의 게시글을 좋아합니다', true, 1, NOW(), NOW()),
  ('ui', 'notification.like', 'ja', '{{name}}さんがあなたの投稿にいいねしました', true, 1, NOW(), NOW()),
  ('ui', 'notification.like', 'zh', '{{name}}赞了您的帖子', true, 1, NOW(), NOW()),
  ('ui', 'notification.like', 'fr', '{{name}} a aimé votre publication', true, 1, NOW(), NOW()),
  ('ui', 'notification.like', 'es', 'A {{name}} le gustó tu publicación', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- notification.comment
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'notification.comment', 'en', '{{name}} commented on your post', true, 1, NOW(), NOW()),
  ('ui', 'notification.comment', 'ko', '{{name}}님이 댓글을 남겼습니다', true, 1, NOW(), NOW()),
  ('ui', 'notification.comment', 'ja', '{{name}}さんがコメントしました', true, 1, NOW(), NOW()),
  ('ui', 'notification.comment', 'zh', '{{name}}评论了您的帖子', true, 1, NOW(), NOW()),
  ('ui', 'notification.comment', 'fr', '{{name}} a commenté votre publication', true, 1, NOW(), NOW()),
  ('ui', 'notification.comment', 'es', '{{name}} comentó en tu publicación', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- notification.follow
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'notification.follow', 'en', '{{name}} started following you', true, 1, NOW(), NOW()),
  ('ui', 'notification.follow', 'ko', '{{name}}님이 회원님을 팔로우하기 시작했습니다', true, 1, NOW(), NOW()),
  ('ui', 'notification.follow', 'ja', '{{name}}さんがあなたをフォローしました', true, 1, NOW(), NOW()),
  ('ui', 'notification.follow', 'zh', '{{name}}开始关注您', true, 1, NOW(), NOW()),
  ('ui', 'notification.follow', 'fr', '{{name}} a commencé à vous suivre', true, 1, NOW(), NOW()),
  ('ui', 'notification.follow', 'es', '{{name}} comenzó a seguirte', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- notification.booking
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'notification.booking', 'en', 'New booking for your experience', true, 1, NOW(), NOW()),
  ('ui', 'notification.booking', 'ko', '체험에 새로운 예약이 있습니다', true, 1, NOW(), NOW()),
  ('ui', 'notification.booking', 'ja', '体験に新しい予約があります', true, 1, NOW(), NOW()),
  ('ui', 'notification.booking', 'zh', '您的体验有新预订', true, 1, NOW(), NOW()),
  ('ui', 'notification.booking', 'fr', 'Nouvelle réservation pour votre expérience', true, 1, NOW(), NOW()),
  ('ui', 'notification.booking', 'es', 'Nueva reserva para tu experiencia', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- 프로필 탭 관련 키
-- =====================================================

-- profile.bookmarksTab
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'profile.bookmarksTab', 'en', 'Bookmarks', true, 1, NOW(), NOW()),
  ('ui', 'profile.bookmarksTab', 'ko', '북마크', true, 1, NOW(), NOW()),
  ('ui', 'profile.bookmarksTab', 'ja', 'ブックマーク', true, 1, NOW(), NOW()),
  ('ui', 'profile.bookmarksTab', 'zh', '收藏', true, 1, NOW(), NOW()),
  ('ui', 'profile.bookmarksTab', 'fr', 'Signets', true, 1, NOW(), NOW()),
  ('ui', 'profile.bookmarksTab', 'es', 'Marcadores', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- profile.myBookingsTab
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'profile.myBookingsTab', 'en', 'My Bookings', true, 1, NOW(), NOW()),
  ('ui', 'profile.myBookingsTab', 'ko', '내 예약', true, 1, NOW(), NOW()),
  ('ui', 'profile.myBookingsTab', 'ja', '予約一覧', true, 1, NOW(), NOW()),
  ('ui', 'profile.myBookingsTab', 'zh', '我的预订', true, 1, NOW(), NOW()),
  ('ui', 'profile.myBookingsTab', 'fr', 'Mes réservations', true, 1, NOW(), NOW()),
  ('ui', 'profile.myBookingsTab', 'es', 'Mis reservas', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- profile.hostDashboard
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'profile.hostDashboard', 'en', 'Host Dashboard', true, 1, NOW(), NOW()),
  ('ui', 'profile.hostDashboard', 'ko', '호스트 대시보드', true, 1, NOW(), NOW()),
  ('ui', 'profile.hostDashboard', 'ja', 'ホストダッシュボード', true, 1, NOW(), NOW()),
  ('ui', 'profile.hostDashboard', 'zh', '主人控制面板', true, 1, NOW(), NOW()),
  ('ui', 'profile.hostDashboard', 'fr', 'Tableau de bord hôte', true, 1, NOW(), NOW()),
  ('ui', 'profile.hostDashboard', 'es', 'Panel de anfitrión', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- profile.marketplace
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'profile.marketplace', 'en', 'Marketplace', true, 1, NOW(), NOW()),
  ('ui', 'profile.marketplace', 'ko', '마켓플레이스', true, 1, NOW(), NOW()),
  ('ui', 'profile.marketplace', 'ja', 'マーケットプレイス', true, 1, NOW(), NOW()),
  ('ui', 'profile.marketplace', 'zh', '市场', true, 1, NOW(), NOW()),
  ('ui', 'profile.marketplace', 'fr', 'Marketplace', true, 1, NOW(), NOW()),
  ('ui', 'profile.marketplace', 'es', 'Mercado', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- profile.noBookmarks
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'profile.noBookmarks', 'en', 'No bookmarks yet', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookmarks', 'ko', '아직 북마크한 게시글이 없습니다', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookmarks', 'ja', 'まだブックマークがありません', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookmarks', 'zh', '暂无收藏', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookmarks', 'fr', 'Pas encore de signets', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookmarks', 'es', 'Sin marcadores aún', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- profile.noBookings
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'profile.noBookings', 'en', 'No bookings yet', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookings', 'ko', '아직 예약이 없습니다', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookings', 'ja', 'まだ予約がありません', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookings', 'zh', '暂无预订', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookings', 'fr', 'Pas encore de réservations', true, 1, NOW(), NOW()),
  ('ui', 'profile.noBookings', 'es', 'Sin reservas aún', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- 네비게이션 관련 키
-- =====================================================

-- nav.marketplace
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'nav.marketplace', 'en', 'Marketplace', true, 1, NOW(), NOW()),
  ('ui', 'nav.marketplace', 'ko', '마켓플레이스', true, 1, NOW(), NOW()),
  ('ui', 'nav.marketplace', 'ja', 'マーケットプレイス', true, 1, NOW(), NOW()),
  ('ui', 'nav.marketplace', 'zh', '市场', true, 1, NOW(), NOW()),
  ('ui', 'nav.marketplace', 'fr', 'Marketplace', true, 1, NOW(), NOW()),
  ('ui', 'nav.marketplace', 'es', 'Mercado', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- 피드 정렬 관련 키
-- =====================================================

-- feed.sortLatest
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'feed.sortLatest', 'en', 'Latest', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortLatest', 'ko', '최신순', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortLatest', 'ja', '最新順', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortLatest', 'zh', '最新', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortLatest', 'fr', 'Plus récent', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortLatest', 'es', 'Más reciente', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- feed.sortPopular
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'feed.sortPopular', 'en', 'Popular', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortPopular', 'ko', '인기순', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortPopular', 'ja', '人気順', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortPopular', 'zh', '热门', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortPopular', 'fr', 'Populaire', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortPopular', 'es', 'Popular', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- feed.sortNearby
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'feed.sortNearby', 'en', 'Nearby', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortNearby', 'ko', '가까운순', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortNearby', 'ja', '近い順', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortNearby', 'zh', '附近', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortNearby', 'fr', 'À proximité', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortNearby', 'es', 'Cercano', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- feed.sortFollowing
INSERT INTO translations (namespace, key, locale, value, is_reviewed, version, created_at, updated_at)
VALUES 
  ('ui', 'feed.sortFollowing', 'en', 'Following', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortFollowing', 'ko', '팔로잉', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortFollowing', 'ja', 'フォロー中', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortFollowing', 'zh', '关注', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortFollowing', 'fr', 'Abonnements', true, 1, NOW(), NOW()),
  ('ui', 'feed.sortFollowing', 'es', 'Siguiendo', true, 1, NOW(), NOW())
ON CONFLICT (namespace, key, locale) DO UPDATE SET value = EXCLUDED.value, updated_at = NOW();

-- =====================================================
-- 마이그레이션 완료 확인
-- =====================================================
-- 총 추가 키: 약 45개 × 6개 언어 = 270개 레코드
