---
name: CineMap 영상 렌더링
description: ffmpeg 슬라이드쇼 렌더링의 폰트/자원/SSRF 관련 비자명한 제약들
---

# CineMap 영상 렌더링 (server/services/cinemapVideoService.ts)

## CJK 폰트는 반드시 레포 번들 + fontfile= 절대경로
시스템엔 DejaVu만 있고 fontconfig는 `/usr/share/fonts`·`~/.fonts`만 스캔한다.
nix로 `noto-fonts-cjk-sans`를 설치해도 fontconfig가 nix store를 보지 않아 무용지물.
→ Noto Sans CJK KR OTF를 `server/assets/fonts/`에 번들하고 ffmpeg `drawtext fontfile=`에
절대경로로 지정해야 한/일/중 자막이 깨지지 않는다.
**Why:** Replit 환경 fontconfig 스캔 경로 제약. 패키지 설치만으로는 해결 안 됨.

## zoompan은 컨테이너에서 자원 위험
zoompan은 내부 슈퍼샘플링 비용이 커서 메모리/CPU를 크게 먹는다(과거 메모리 압박 이력).
정적 이미지 + fade + `preset ultrafast`로 충분. zoompan 도입 시 자원 모니터링 필수.

## SSRF 차단 — 사진 URL은 내부 경로만
storyboard 사진 URL을 서버가 직접 fetch하면 SSRF가 된다.
`resolvePhotoUrl`은 `/api/files/{name}`만 허용하고(→ getSignedReadUrl로 변환),
외부 임의 http(s) URL은 거부해야 한다. 실제 네트워크 fetch 대상은 우리가 만든
Object Storage 서명 URL뿐이어야 안전.

## 자원 보호 가드(반드시 유지)
- ffmpeg 호출마다 타임아웃 워치독(멈춤 시 SIGKILL)
- 다운로드 타임아웃 + 이미지 크기 상한
- 렌더 직렬화 락(동시 ffmpeg 금지) — 다중 잡 CPU/메모리 급증 방지

## Object Storage 파일명은 /api/files 검증기와 반드시 호환
`/api/files/:filename` 라우트는 hex+하이픈 이름만 통과시킨다(`^[a-f0-9-]+\.[a-z0-9]+$`).
업로드 파일명에 `cinemap-` 같은 a-f 밖 영문 접두사를 붙이면 조회 시 400이 되어
재생이 안 된다. → 업로드 파일명은 `randomUUID()`(hex+하이픈)만 사용할 것.
**Why:** 업로드와 조회가 다른 파일에 있어 규칙이 어긋나도 컴파일은 통과, 런타임에만 깨짐.
