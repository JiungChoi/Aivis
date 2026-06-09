# Git-Flow 브랜치 전략 (필수 준수)

> **이 문서의 규칙은 Aivis 레포의 모든 개발에 무조건 적용된다. Mr. Choi · Aivis · Mr. Park · Ms. Kang 및 모든 자동화 에이전트는 예외 없이 따른다.**

원격: `git@github.com:JiungChoi/Aivis.git` (origin, SSH)

---

## 1. 브랜치 구조

| 브랜치 | 역할 | 직접 커밋 | 베이스 |
|--------|------|-----------|--------|
| `main` | 프로덕션 (배포 가능 상태만) | ❌ 금지 | — |
| `develop` | 통합 (다음 릴리스 누적) | ⚠️ 지양 (머지로만) | `main` |
| `feature/*` | 기능 개발 | ✅ | `develop` |
| `release/*` | 릴리스 준비 (버전·QA) | ✅ | `develop` |
| `hotfix/*` | 운영 긴급 수정 | ✅ | `main` |

`main` 과 `develop` 은 **영구 브랜치**. 나머지는 머지 후 삭제한다.

---

## 2. 네이밍 규칙

```
feature/<scope>-<short-desc>     예) feature/dashboard-drag-delete
release/<version>                예) release/0.2.0
hotfix/<scope>-<short-desc>      예) hotfix/schedule-timezone
```

- 소문자 + 케밥케이스. 한글 금지(브랜치명).
- `<scope>` 는 dashboard / schedule / news / character / backend / infra 등.

---

## 3. 기능 개발 플로우 (가장 자주 쓰는 경로)

```bash
# 1) 최신 develop 에서 분기
git checkout develop
git pull origin develop
git checkout -b feature/<scope>-<desc>

# 2) 작업 + 커밋 (Conventional Commits, 아래 §5)
git add <변경파일>
git commit -m "feat(<scope>): ..."

# 3) develop 에 머지 (반드시 --no-ff 로 머지 커밋 남김)
git checkout develop
git pull origin develop
git merge --no-ff feature/<scope>-<desc>
git push origin develop

# 4) 기능 브랜치 삭제
git branch -d feature/<scope>-<desc>
```

> 협업/리뷰가 필요하면 3) 대신 `git push origin feature/...` 후 **GitHub PR(→ develop)** 로 머지한다. PR 머지 시에도 `--no-ff`(merge commit) 방식을 사용한다.

---

## 4. 릴리스 / 핫픽스

**release**: `develop` 가 충분히 쌓이면
```bash
git checkout -b release/0.2.0 develop
# 버전 표기·문서·QA 수정만
git checkout main && git merge --no-ff release/0.2.0 && git tag -a v0.2.0 -m "v0.2.0"
git checkout develop && git merge --no-ff release/0.2.0
git push origin main develop --tags
```

**hotfix**: 운영 버그
```bash
git checkout -b hotfix/<desc> main
# 수정
git checkout main && git merge --no-ff hotfix/<desc> && git tag -a v0.2.1 -m "v0.2.1"
git checkout develop && git merge --no-ff hotfix/<desc>
git push origin main develop --tags
```

---

## 5. 커밋 메시지 규칙 (Conventional Commits)

```
<type>(<scope>): <제목 — 한국어 가능, 명령형>

<본문 — 무엇을/왜. 선택>

Co-Authored-By: ...   # AI 협업 시
```

| type | 용도 |
|------|------|
| `feat` | 기능 추가 |
| `fix` | 버그 수정 |
| `refactor` | 동작 변화 없는 구조 개선 |
| `style` | 포맷/스타일 (로직 X) |
| `docs` | 문서 |
| `chore` | 빌드·설정·잡무 |
| `test` | 테스트 |
| `perf` | 성능 |

- 한 커밋 = 한 논리적 변경. 백엔드/프론트 섞지 않기.
- 제목 50자 내외, 마침표 X.

---

## 6. 절대 규칙 (Hard Rules)

1. **`main` 직접 커밋·push 금지.** 오직 release/hotfix 머지로만 갱신.
2. **`develop` 에 직접 작업 금지.** 항상 `feature/*` 에서 작업 후 `--no-ff` 머지.
3. **비밀키 커밋 금지.** `Environments/**/.env`, API 키, DB 비밀번호는 절대 스테이징하지 않는다. (`.gitignore` 로 차단됨 — 우회 금지)
4. **머지 전 빌드/타입체크 통과 필수.** 프론트 `npm run build`(tsc 포함), 백엔드 `dotnet build`. → main/develop PR·develop push 시 **GitHub Actions CI**(`.github/workflows/ci.yml`)가 자동 검증한다.
5. **기능 브랜치는 머지 후 삭제.**
6. `--no-ff` 로 머지해 히스토리에 기능 경계를 남긴다.

---

## 7. 현재 상태 (2026-06-07 기준)

- `main` ← 프로덕션 (원격 동기화됨)
- `develop` ← 통합 (대시보드/캐릭터 UI 기능 + 백엔드 스냅샷 + 보안 정리 머지됨)
- 커밋 identity: `JiungChoi <wldnd6091@gmail.com>`
