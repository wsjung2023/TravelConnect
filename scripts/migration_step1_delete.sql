-- Step 1: DELETE 기존 데이터 (먼저 실행)
DELETE FROM poi_category_translations WHERE category_id IN (1,2,3,4,5,6,7,8,9);
DELETE FROM poi_type_translations WHERE type_id IN (SELECT id FROM poi_types WHERE category_id IN (1,2,3,4,5,6,7,8,9));
DELETE FROM poi_types WHERE category_id IN (1,2,3,4,5,6,7,8,9);
DELETE FROM poi_categories WHERE id IN (1,2,3,4,5,6,7,8,9);
DELETE FROM system_settings WHERE id IN (
  'api_pagination_default', 'api_rate_limit', 'api_request_timeout', 'app_version',
  'business_default_timeline_days', 'business_max_content_length', 'business_max_images_per_post',
  'business_max_title_length', 'chat_message_limit', 'feature_booking_enabled', 'feature_chat_enabled',
  'feature_timeline_enabled', 'feed_pagination_limit', 'legal_terms_ui', 'maintenance_mode',
  'map_cluster_threshold', 'map_default_zoom', 'notification_demo_interval', 'notification_types',
  'oauth_callback_timeout', 'oauth_google_scope', 'oauth_session_duration', 'privacy_policy_url',
  'rate_limit_requests', 'rate_limit_window_hours', 'search_radius_km', 'seo_meta_description',
  'seo_meta_title', 'terms_of_service_url', 'theme_colors_ui', 'timeline_max_days',
  'ui_default_language', 'ui_default_theme', 'ui_max_upload_size', 'upload_allowed_types',
  'upload_max_file_size', 'user_bio_max_length'
);
DELETE FROM translations WHERE namespace = 'interests';
