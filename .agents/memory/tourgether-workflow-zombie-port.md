---
name: Start application "failed (no output)" = 좀비 dev 프로세스 포트 점유
description: restart_workflow가 출력 없이 실패하고 preview가 안 뜰 때의 실제 원인과 해결
---

# 증상
- `Start application` 워크플로우가 `FAILED` + "No output available"(로그 파일 0줄)로 표시되는데,
  `curl localhost:5000` 은 HTTP 200을 반환하고 `smoke-auth-cookies` 는 통과함.
- preview는 계속 스피너(안 뜸). 코드(예: Paddle 결제 변경)는 원인이 아님 —
  모듈 로드/생성자에서 throw하지 않으므로 기동을 깨지 않음.

# 진짜 원인
- 이전 실행의 **dev 서버 프로세스 트리가 안 죽고 남아 포트 5000을 점유**.
  새 `restart_workflow`가 새 인스턴스를 띄우면 포트 충돌로 즉시 실패 → 출력 없는 FAILED.
- 부모만 죽이면 안 됨: `npm run dev`(부모) → `sh -c ... tsx`(자식) → **`node ... server/index.ts`(손자)** 구조.
  실제 리스너는 **손자 node PID**. `pkill -f "tsx server/index.ts"`로 부모/자식만 잡으면 손자가 살아남아 200 계속 응답.

# 해결 순서
1. `ps aux | grep server/index.ts` 로 **손자 node PID 포함** 전부 확인.
2. `kill -9 <손자 node PID> <esbuild PID들>` 로 직접 종료 → `curl localhost:5000` 이 000/무응답이 될 때까지.
3. 그 다음 `restart_workflow("Start application")` → running 정상.

# 함정
- bash 명령에 문자열 `npm run dev`가 들어가면(예: `grep "npm run dev"`) 명령 전체가 차단됨.
  grep 패턴은 `run\.dev` / `server/index.ts` 등으로 우회.
- `ss -ltnp`가 5000 리스너를 못 보여줄 수 있음(네임스페이스). 점유 확인은 `curl` HTTP 코드로 판단.
