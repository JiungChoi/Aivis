# UI 구체화 계획 (UI Refinement Plan)

> 작성: 2026-06-07 · 대상: Electron 데스크톱(다크/홀로그램 테마)
> 디자인 방향: **JARVIS풍 HUD · 글래스모피즘 · 차분한 다크 베이스 + 시안/블루 액센트**
> 진행: 각 항목 `feature/ui-*` 브랜치 ([git-flow](../06_process/git-flow.md) 준수). 토큰화는 [refactoring-plan A3](../03_architecture/refactoring-plan.md) 와 연계.

---

## 0. 완료됨 (2026-06-07, develop 반영)
- ✅ 오늘의 일정: 드래그 → 하단 휴지통 존 드롭으로 삭제 (드래그 중에만 노출)
- ✅ 뉴스: "뉴스" 제목 + 언더라인 탭(버튼형 제거)
- ✅ 시간분석/AI작업제안/노트 패널 제목 + 컬럼 스크롤
- ✅ 24h 타임라인(00:00–23:30) 미리 추가 지원
- ✅ AIVIS 홀로그램 JARVIS HUD(회전 링·눈금·조준 브래킷·아크리액터)
- ✅ Mr. Park / Ms. Kang 머리(오브)만 표시

> 이 항목들은 추가 다듬기 대상(아래 §1~)이며, 베이스는 이미 동작한다.

---

## 1. 디자인 시스템 토대 🔴
구체화의 전제. [refactoring A3](../03_architecture/refactoring-plan.md) 의 `theme/tokens.ts` 와 한 몸.
- **컬러 토큰**: `bg/base #000`, `surface #0d1829`, `surface-2 #1c1c1e`, `border rgba(255,255,255,.06)`, `accent #0a84ff`, `accent-cyan #00cfff`, 카테고리 6색, priority 3색.
- **타이포 스케일**: title 16/600, section 11 uppercase 0.05em, body 11–13, caption 9–10.
- **스페이싱/반경**: 4·8·12·16 / radius 8·12·16. 그림자 1종(elev).
- **공통 컴포넌트**: `<SectionTitle>`, `<Card>`, `<Tab>`, `<Pill>`, `<IconButton>`, `<Modal>`, `<EmptyState>`, `<Skeleton>`, `<Toast>`.
- 산출물: `documents/04_ux/design-tokens.md` + 코드 토큰.

---

## 2. 대시보드 정밀화 🔴
4컬럼(일정 | 인사이트 | 뉴스 | 채팅) 레이아웃 유지하되:
- **일정 타임라인**
  - 삭제 UX 보강: 드래그 시작 시 미세 햅틱감(스케일/그림자), 휴지통 존을 컬럼 하단 sticky로 + "ESC로 취소" 힌트. 모바일/트랙패드 고려해 **항목 hover 시 ✕ 버튼**도 병행 제공(드래그가 어려운 경우 대비).
  - 현재 시각 라인 라벨(`now`) + 클릭 시 해당 시간으로 스크롤.
  - 겹치는 일정 나란히 배치(컬럼 분할) — 현재는 겹침.
  - 빈 슬롯 hover + 버튼 외에 더블클릭으로 모달.
- **인사이트 컬럼**: 세 패널 제목을 `<SectionTitle>` 로 통일, 각 패널 접기/펼치기, 스크롤 시 제목 sticky.
- **뉴스**: 탭 언더라인 애니메이션, 카드 → 리스트형(구분선) 옵션, 출처 파비콘, "더보기" 페이지네이션.
- **반응형**: 창 폭 좁을 때 컬럼 우선순위(일정 > 뉴스 > 인사이트) 자동 숨김/탭화.

---

## 3. 캐릭터/홀로그램 시스템 🟡
- **AIVIS(JARVIS)**: 상태별 프리셋(idle/listening/speaking/thinking) — 색·회전속도·코어 맥동 차등(현재 recording/speaking만). 음성 입력 시 파형↔HUD 동기화 강화.
- **Mr. Park / Ms. Kang(머리형)**: 말풍선 위치/충돌 회피 개선, 정체성 색 라벨 유지, hover 시 역할 툴팁. 클릭 → 해당 페르소나에게 바로 질문(채팅 프리필).
- **공통**: 캐릭터 on/off·속도 설정을 Settings 에 노출.

---

## 4. 페이지별 일관화 🟡
Dashboard 외 페이지(Schedule/Memory/Analytics/Todo/Notes/Settings)를 §1 토큰·공통 컴포넌트로 재정렬.
- 공통 페이지 헤더(`<PageHeader title subtitle actions>`), 빈 상태/로딩 스켈레톤 표준.
- Analytics: 차트 컴포넌트(`DonutChart`) 재사용·확장.
- Settings: 섹션 그룹·토글 컴포넌트 통일(Obsidian 토글 패턴 재사용).

---

## 5. 인터랙션/피드백 🟡
- **Toast** 알림(저장/삭제/에러) — [refactor A7](../03_architecture/refactoring-plan.md).
- **낙관적 업데이트** 일관 적용(일정 삭제는 적용됨 → 생성/수정/노트로 확대).
- **키보드**: Cmd+K 팔레트(있음) 확장, 타임라인 방향키 이동, 모달 Enter/Esc(있음) 표준화.
- **모션**: 200–300ms ease, 과한 애니메이션 자제. `prefers-reduced-motion` 존중.

---

## 6. 접근성/품질 🟢
- 대비비(WCAG AA) 점검 — 현재 저대비 회색 텍스트 다수.
- 포커스 링·aria-label, 키보드 내비.
- 폰트 렌더링·DPI(레티나) 캔버스 스케일 점검(HUD/차트 `devicePixelRatio`).

---

## 실행 순서
1. **§1 디자인 토큰** (refactor A3 와 동시) — 이후 모든 UI 작업의 기준
2. **§2 대시보드 정밀화** (refactor A4 분해 위에서)
3. §3 캐릭터 다듬기 → §4 페이지 일관화
4. §5 피드백 → §6 접근성
