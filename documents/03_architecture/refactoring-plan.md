# 리팩토링 계획 (Refactoring Plan)

> 작성: 2026-06-07 · 대상: `src/frontend`, `src/backend`
> 진행 방식: 각 항목을 **개별 `feature/refactor-*` 브랜치**로. 동작 변화 없는 변경은 `refactor:` 커밋. ([git-flow](../06_process/git-flow.md) 준수)

## 원칙
- **동작 보존**: 리팩토링 PR은 기능 변경을 포함하지 않는다 (UI 개선은 [ui-refinement-plan](../04_ux/ui-refinement-plan.md)에서 별도 처리).
- **작게 자주**: 한 브랜치 = 한 관심사. 대형 일괄 변경 금지.
- **검증**: 각 단계 후 `npm run build` / `dotnet build` 통과.

---

## A. 프론트엔드

### A1. API 레이어 통합 🔴 (우선순위 高)
**문제**: `http://localhost:5050` 이 12개 서비스에 하드코딩. 네이밍도 제각각(`BASE`/`BASE_URL`/`API_BASE`). 일부는 `apiFetch`, 일부는 raw `fetch` 사용 → `X-User-Id` 헤더 누락 위험.
**조치**
- `src/config.ts` 신설: `export const API_BASE = import.meta.env.VITE_API_BASE ?? 'http://localhost:5050'`.
- `apiClient.ts` 에 `apiGet/apiPost/apiPut/apiDelete` 헬퍼 추가 (JSON 파싱·에러 표준화·`X-User-Id` 자동).
- 12개 서비스가 전부 헬퍼 사용하도록 치환. raw `fetch` 제거.
- `.env.example` 에 `VITE_API_BASE` 문서화.
- 브랜치: `feature/refactor-api-client`

### A2. 공용 유틸 추출 🔴
**문제**: `toMins`, `minsToTimeStr`, `todayKey`, 날짜 포맷 등이 DashboardPage·TimeAnalysisPanel·CharacterConfig·SchedulePage 에 중복 정의.
**조치**: `src/utils/time.ts`, `src/utils/format.ts` 로 단일화 후 import.
- 브랜치: `feature/refactor-shared-utils`

### A3. 디자인 토큰 / 테마 통합 🟡
**문제**: 인라인 style 객체가 수천 줄. 색상 맵(`CATEGORY_BG`, `CATEGORY_CHART_META`, `TAG_COLORS`, `PRIORITY_COLORS`)이 파일마다 중복·불일치. Tailwind 설정돼 있으나 인라인과 혼용.
**조치**
- `src/theme/tokens.ts`: 색/간격/반경/그림자 토큰 + `CATEGORY_META`(라벨·색·태그) 단일 출처.
- Tailwind `theme.extend` 에 토큰 연결(`colors.surface`, `colors.accent` 등).
- 반복 인라인 → Tailwind 클래스 또는 토큰 참조로 점진 이관.
- 브랜치: `feature/refactor-design-tokens`

### A4. DashboardPage 분해 🔴 (가장 큰 부채)
**문제**: `DashboardPage.tsx` ≈ 1340줄. 타임라인·모달·뉴스·날씨·옵시디언·드래그 로직이 한 컴포넌트에 응집.
**조치 (순서대로)**
1. 데이터 훅 분리: `useSchedule()`, `useNews(tab)`, `useWeather()`, `useSuggestions()`, `useNotes(search)`, `useObsidian()`.
2. 컬럼 컴포넌트 분리: `ScheduleTimeline/`(타임라인+슬롯+드래그+삭제존), `NewsColumn/`, `InsightColumn/`(시간분석·제안·노트 래퍼).
3. 모달 분리: `AddEventModal`(이미 함수 분리됨 → 파일로), `ObsidianModal`.
4. DashboardPage 는 레이아웃·컬럼 너비(resize)만 담당하도록 축소(목표 < 200줄).
- 브랜치: `feature/refactor-dashboard-decompose` (단계별 다중 커밋)

### A5. 데이터 패칭/상태 일원화 🟡
**문제**: 페이지마다 `useEffect + useState(loading/error)` 보일러플레이트 반복. 캐시·재검증 없음.
**조치**: 경량 도입 검토 — `@tanstack/react-query`(권장) 또는 자체 `useAsync` 훅. 우선 A4의 커스텀 훅으로 정리 후, 공통 `useQuery` 패턴 합의.
- 브랜치: `feature/refactor-data-fetching`

### A6. 라우팅 정리 🟢 (선택)
**현황**: `App.tsx` 의 `currentPage` 문자열 스위치. 데스크톱 앱이라 당장 문제 없음.
**조치(선택)**: 페이지 증가 시 `react-router`(hash 모드, Electron 호환) 도입 검토. 지금은 `PageKey` 타입·라우트 테이블만 `routes.tsx` 로 분리.

### A7. 에러/알림 시스템 🟡
**문제**: `console.error` 산재, 사용자 피드백 없음.
**조치**: 가벼운 토스트(`Toast` 컨텍스트) + 서비스 에러 표준화(A1과 연계).
- 브랜치: `feature/refactor-error-toasts`

---

## B. 백엔드 (.NET, 4-layer DDD)

> 구조(API / Application / Domain / Infrastructure)는 양호. 국소적 정리 위주.

### B1. LLM 서비스 중복 정리 🔴
**문제**: `ClaudeService.cs`(26줄) 와 신규 `ClaudeLlmService.cs`(276줄) 공존 → 전환 중 잔재로 보임. `OllamaService` 와의 `ILlmService` 일관성 확인 필요.
**조치**: 단일 구현으로 수렴, DI 등록(`InfrastructureExtensions`) 정리, 죽은 코드 제거.
- 브랜치: `feature/refactor-llm-service`

### B2. API 진입점 일관화 🟡
**문제**: `AIVIS.API/Routers/*`(Minimal API, 11개) 와 `AIVIS.Application/Controllers/*`(MVC, 2개) 혼재. 한 컨벤션으로.
**조치**: Conversation/ConversationQuality 컨트롤러를 Router 패턴으로 통일하거나, 반대로 결정 후 일원화. (권장: 기존 다수인 Minimal API Router 로 통일)
- 브랜치: `feature/refactor-api-endpoints`

### B3. 환경설정(Phase1/2/3) 정리 🟡
**문제**: `Program.cs` 가 `Phase1/.env` 하드코딩 로드. `.env` 추적 해제됨(보안) → 신규 클론 시 실행 불가.
**조치**: `Environments/**/.env.example` 추가(키 placeholder), README 에 셋업 절차 명시, 환경 선택을 `ASPNETCORE_ENVIRONMENT` 또는 인자로.
- 브랜치: `feature/refactor-env-config`

### B4. CORS / 설정 외부화 🟢
**현황**: `Program.cs` 에 CORS·포트 인라인. 운영 대비 `appsettings`/env 로 외부화 검토.

---

## C. 공통 / 인프라

### C1. 테스트 부재 🔴
현재 테스트 프로젝트 없음. 최소한 (1) 백엔드 도메인 유닛테스트, (2) 프론트 유틸(time/format) 테스트부터.
- 브랜치: `feature/test-foundation`

### C2. 린트/포맷 자동화 🟡
ESLint + Prettier(프론트), `dotnet format`(백엔드) 설정 + pre-commit 훅(또는 CI).

### C3. CI 파이프라인 🟡
GitHub Actions: PR 시 `npm run build` + `dotnet build` 게이트. git-flow 의 "머지 전 통과" 규칙 자동 강제.

---

## 권장 실행 순서
1. **A1 (API 통합)** → A2 (유틸) → B1 (LLM 중복) — 부채 핵심·저위험
2. **A4 (Dashboard 분해)** — 가장 큰 효과, A1·A2 선행 시 수월
3. A3 (토큰) ↔ [UI 계획] 과 병행
4. C1/C3 (테스트·CI) — 이후 회귀 방지 기반
5. 나머지 우선순위(🟡/🟢) 는 여력에 따라
