# Git 히스토리에서 민감한 정보 제거하기

## 문제 상황
- 코드에서 API 키를 제거했지만 Git 히스토리에 여전히 남아있음
- GitHub이 과거 커밋에서 키를 발견해서 push를 차단

## 해결 방법들

### 방법 1: Git 히스토리 완전 정리 (가장 확실)
```bash
# 새로운 초기 커밋으로 히스토리 리셋
git checkout --orphan new-main
git add .
git commit -m "Initial commit with secure keys"
git branch -D main
git branch -m main
git push -f origin main
```

### 방법 2: BFG Repo-Cleaner 사용
```bash
# BFG 도구로 히스토리에서 키 제거
java -jar bfg.jar --replace-text passwords.txt
git reflog expire --expire=now --all && git gc --prune=now --aggressive
git push --force
```

### 방법 3: 새 레포지토리 생성 (가장 간단)
1. GitHub에서 새로운 레포지토리 생성
2. 현재 코드만 새 레포에 push
3. 기존 레포는 삭제

### 방법 4: GitHub에 문의
- GitHub Support에 연락해서 false positive라고 신고
- 키가 더 이상 유효하지 않다고 증명

## 권장 사항
**방법 3 (새 레포 생성)**이 가장 간단하고 확실합니다.
현재 코드는 이미 안전하므로 새 레포에 푸시하면 문제없이 작동할 것입니다.