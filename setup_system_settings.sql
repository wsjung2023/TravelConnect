-- 시스템 설정 초기 데이터
-- 하드코딩 대신 DB로 관리하는 기본 설정값들

-- OAuth 관련 설정
INSERT INTO system_settings (id, category, key, value, description) VALUES 
('oauth_google_scope', 'oauth', 'google_scope', 'profile email', '구글 OAuth에서 요청할 스코프'),
('oauth_callback_timeout', 'oauth', 'callback_timeout', '300000', 'OAuth 콜백 타임아웃 (ms)'),
('oauth_session_duration', 'oauth', 'session_duration', '604800000', '세션 지속 시간 (7일, ms)');

-- API 관련 설정
INSERT INTO system_settings (id, category, key, value, description) VALUES 
('api_request_timeout', 'api', 'request_timeout', '30000', 'API 요청 타임아웃 (ms)'),
('api_rate_limit', 'api', 'rate_limit', '100', '분당 API 요청 제한'),
('api_pagination_default', 'api', 'pagination_default', '20', '기본 페이지네이션 크기');

-- UI 관련 설정
INSERT INTO system_settings (id, category, key, value, description) VALUES 
('ui_default_theme', 'ui', 'default_theme', 'light', '기본 테마'),
('ui_default_language', 'ui', 'default_language', 'ko', '기본 언어'),
('ui_max_upload_size', 'ui', 'max_upload_size', '10485760', '최대 업로드 크기 (10MB, bytes)');

-- 비즈니스 로직 설정
INSERT INTO system_settings (id, category, key, value, description) VALUES 
('business_max_images_per_post', 'business', 'max_images_per_post', '10', '포스트당 최대 이미지 개수'),
('business_max_title_length', 'business', 'max_title_length', '50', '제목 최대 길이'),
('business_max_content_length', 'business', 'max_content_length', '700', '내용 최대 길이'),
('business_default_timeline_days', 'business', 'default_timeline_days', '7', '기본 타임라인 일수');

-- 알림 설정
INSERT INTO system_settings (id, category, key, value, description) VALUES 
('notification_demo_interval', 'notification', 'demo_interval', '6000', '알림 데모 간격 (ms)'),
('notification_types', 'notification', 'types', 'chat,feed,reaction,follow,help', '사용 가능한 알림 타입들');