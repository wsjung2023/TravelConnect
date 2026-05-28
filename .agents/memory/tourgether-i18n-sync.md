---
name: Tourgether i18n sync 운영 노하우
description: 신규 t() 키 추가 후 DB/seed 동기화 절차 — OpenAI batch timeout 회피.
---

`scripts/i18n-sync.mjs`는 코드 t() 호출을 스캔 → 누락 키를 OpenAI `gpt-4o-mini`로 배치 번역(15개 단위) → DB upsert + `db/seed-translations.json` 갱신한다.

**문제**: 100+ 신규 키 × 4개 비영어 로케일이면 7+ 배치, 단일 node 프로세스가 직렬 호출이라 2분 timeout에 자주 걸린다. en 값을 키 이름에서 `humanizeKey()`로 추측하므로 출력 품질도 떨어진다(`slotForm.titleLabel` → "Title Label").

**권장 절차** (대량 신규 키):
1. 임시 `scripts/seed-<round>-koen.mjs` 작성 — `[key, ko, en]` 배열을 직접 INSERT(`ON CONFLICT DO NOTHING`). 자연어 ko/en을 사람이 박는다.
2. en 값이 DB에 있으면 `i18n-sync.mjs`가 그걸 OpenAI 입력으로 사용하므로 ja/zh/fr/es 품질이 좋아진다.
3. `node scripts/i18n-sync.mjs` 실행 — DB에 있는 ko/en은 스킵, 비영어 4개만 채움.
4. timeout 걸리면 백그라운드(`nohup … &`)로 돌리거나 무시(영어 fallback으로 기능은 동작).

**Why**: 압축으로 컨텍스트 잃었을 때 "왜 임시 스크립트 만들었지?"를 다시 추론하지 않기 위함. en 값을 humanizeKey에 맡기면 운영 번역 품질이 무너진다.

**How to apply**: 한 라운드에 ~10키 이하면 humanizeKey로도 무방. 30키 이상이거나 placeholder/메시지 톤이 중요한 키면 임시 ko/en 시드 먼저.
