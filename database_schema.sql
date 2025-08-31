-- 데이터베이스 스키마 백업 (2025-01-27)
-- 프로젝트: Tourgether - 여행 경험 공유 플랫폼

-- users 테이블
CREATE TABLE users (
    id character varying NOT NULL,
    email character varying,
    first_name character varying,
    last_name character varying,
    profile_image_url character varying,
    bio text,
    location character varying,
    is_host boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    role character varying DEFAULT 'user'
);

-- posts 테이블 (여행 포스트 - 검색 기능 완료)
CREATE TABLE posts (
    id integer NOT NULL,
    user_id character varying NOT NULL,
    content text,
    images character varying[],
    location character varying,
    latitude numeric,
    longitude numeric,
    experience_id integer,
    likes_count integer DEFAULT 0,
    comments_count integer DEFAULT 0,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    title character varying,
    videos character varying[],
    day integer,
    shape character varying DEFAULT 'none',
    theme character varying,
    post_date character varying,
    post_time character varying,
    tags character varying[]
);

-- 현재 시스템 상태:
-- ✅ 검색 기능 완전 복원 (장소 검색 + 컨텐츠 검색)
-- ✅ Google Maps API 정상 작동
-- ✅ 포스트 데이터 30개 로드 완료
-- ✅ 마커 25개 표시 정상
