---
name: 서버 기동 실패 = 컨테이너 자원 고갈 의심
description: 워크플로우가 DIDNT_OPEN_A_PORT로 죽고 DB 연결까지 타임아웃될 때의 진짜 원인 진단법
---

# 증상
- `Start application` 워크플로우가 `DIDNT_OPEN_A_PORT`로 실패, 로그 출력 0줄.
- 수동 `tsx server/index.ts`도 첫 console.log 전에 무한 hang(포그라운드 exit 124).
- `node -e "select 1"` DB 연결까지 타임아웃 → "DB 다운"처럼 보임.

# 진짜 원인 (이번 사례)
컨테이너 **메모리 고갈**(used 15.5GB/16GB, free 403MB, swap 0) + load avg ~7.4.
범인은 앱과 무관한 떠도는 프로세스: Claude CLI(`/home/runner/.claude`)가 띄운
`bfs ... -name playwright -type d`가 3.5시간째 메모리 32%/CPU 59% 점유.
→ node·DB연결·서버 기동이 전부 자원 부족으로 멈춤. DB 무응답은 증상일 뿐.

# 진단/복구 순서
1. 서버가 출력 0줄로 hang하면 코드 의심 전에 `uptime`(load) + `free -m`(메모리) 확인.
2. `ps -eo pid,ppid,pcpu,pmem,etime,cmd --sort=-pcpu | head` 로 장시간/고메모리 프로세스 탐색.
3. 앱과 무관한 좀비(검색/빌드 잔여 등) `kill -TERM` → 안 죽으면 `-9`.
4. 메모리 회복 후 DB 핑(`select 1`)으로 확인 → 워크플로우 자동 재기동되어 HTTP 200 복구.

**Why:** 자원 고갈일 때 로그가 안 나와 "DB 다운/코드 버그"로 오진하기 쉬움. 추측 금지 가드레일상 반드시 부하/메모리부터 확인.
