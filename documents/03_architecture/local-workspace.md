# 로컬 워크스페이스 구조

AIVIS는 DB에 저장하기에 부적합한 데이터(캐시, 로그, 마크다운 파일 등)를  
사용자 홈 디렉터리 아래 도메인별 폴더로 관리한다.

---

## 루트 경로

```
~/AIVIS/
```

환경변수 `AIVIS_WORKSPACE` 로 오버라이드 가능 (기본값: `~/AIVIS`)

---

## 전체 폴더 구조

```
~/AIVIS/
│
├── users/                          ← 사용자 도메인
│   └── {userId}/                   (예: local/)
│       ├── preferences.json        ← 언어, 톤, 커스텀 인스트럭션
│       └── task-suggestions.json   ← AI 작업제안 캐시
│
├── conversations/                  ← 대화 도메인
│   └── {yyyy-MM}/
│       └── {date}-{sessionId}.md  ← 대화 로그 마크다운
│
├── schedule/                       ← 일정 도메인
│   └── {yyyy}/
│       ├── {MM}.json               ← 월별 일정 데이터
│       └── analytics/
│           ├── daily-{date}.json   ← 일별 시간 분석
│           ├── weekly-{week}.json  ← 주별 시간 분석
│           └── monthly-{MM}.json   ← 월별 시간 분석
│
├── news/                           ← 뉴스 도메인
│   └── cache/
│       └── {date}/
│           ├── all.json
│           ├── economy.json
│           ├── ai-agent.json
│           ├── tech.json
│           └── global.json
│
├── weather/                        ← 날씨 도메인
│   └── cache/
│       └── {date}.json             ← 일별 날씨 캐시 (TTL: 1시간)
│
└── workspace/                      ← 세컨드 브레인 (Phase 2)
    ├── second_brain/
    │   ├── notes/
    │   ├── meetings/
    │   └── ideas/
    └── memory/
```

---

## 도메인별 파일 스펙

### users/{userId}/preferences.json

```json
{
  "language": "Korean",
  "tone": "casual",
  "customInstructions": [
    "항상 한국어로 대답해",
    "코드 예시는 TypeScript 기준으로"
  ],
  "updatedAt": "2026-05-12T10:00:00Z"
}
```

> DB의 `users` 테이블과 동기화. 충돌 시 DB 우선.

---

### users/{userId}/task-suggestions.json

AI가 생성한 작업 제안을 캐싱. 매일 1회 재생성.

```json
{
  "generatedAt": "2026-05-12T08:00:00Z",
  "ttlHours": 24,
  "suggestions": [
    {
      "id": "uuid",
      "icon": "⚡",
      "title": "Phase 2 메모리 서비스 착수",
      "reason": "현재 API 안정화 완료 — 다음 단계 적기",
      "priority": "높음",
      "tags": ["개발", "백엔드"]
    }
  ]
}
```

---

### schedule/{yyyy}/{MM}.json

```json
{
  "year": 2026,
  "month": 5,
  "events": [
    {
      "id": "uuid",
      "date": "2026-05-12",
      "time": "10:00",
      "title": "백엔드 API 설계 검토",
      "tag": "작업",
      "durationMin": 90
    }
  ]
}
```

---

### schedule/{yyyy}/analytics/daily-{date}.json

```json
{
  "date": "2026-05-12",
  "totalMinutes": 510,
  "breakdown": {
    "작업": 216,
    "미팅": 90,
    "코드리뷰": 114,
    "휴식": 90
  },
  "completedTasks": 5,
  "focusBlocks": 3
}
```

---

### news/cache/{date}/{category}.json

```json
{
  "cachedAt": "2026-05-12T06:00:00Z",
  "ttlHours": 6,
  "category": "ai-agent",
  "items": [
    {
      "id": "uuid",
      "tag": "에이전트",
      "title": "OpenAI Codex Agent, GitHub Actions 완전 통합",
      "source": "The Verge",
      "url": "https://...",
      "publishedAt": "2026-05-12T03:00:00Z"
    }
  ]
}
```

---

### weather/cache/{date}.json

```json
{
  "cachedAt": "2026-05-12T10:00:00Z",
  "ttlHours": 1,
  "location": "Seoul",
  "current": {
    "temp": 22,
    "condition": "맑음",
    "icon": "☀️",
    "humidity": 45,
    "wind": "3m/s"
  },
  "hourly": [
    { "hour": "12:00", "temp": 23, "condition": "맑음" }
  ]
}
```

---

## 관리 원칙

| 원칙 | 내용 |
|------|------|
| **DB vs 파일** | 구조화된 관계형 데이터(대화, 유저) → DB / 캐시·로그·마크다운 → 파일 |
| **TTL 캐시** | 뉴스 6h, 날씨 1h, 작업제안 24h — 만료 시 백그라운드 재생성 |
| **도메인 격리** | 도메인 간 직접 파일 접근 금지, 각 도메인 서비스를 통해서만 읽기/쓰기 |
| **초기화** | 앱 시작 시 `WorkspaceManager`가 폴더 구조 자동 생성 |
| **백업** | `workspace/` 는 Git 또는 iCloud Drive 동기화 권장 |
