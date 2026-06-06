# Conversation 도메인 명세

## 개요
사용자와 AI 간의 대화 세션을 생성·관리하고, 메시지를 주고받는 핵심 도메인.

---

## DB 스키마 (Mr. Park)

### sessions

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 세션 고유 ID |
| user_id | varchar(256) | NOT NULL | 사용자 식별자 (Phase 1: 고정값 "local") |
| status | varchar(20) | NOT NULL | Active / Closed / Archived |
| created_at | timestamptz | NOT NULL | 생성 시각 |
| updated_at | timestamptz | NOT NULL | 마지막 수정 시각 |

### messages

| 컬럼 | 타입 | 제약 | 설명 |
|------|------|------|------|
| id | uuid | PK | 메시지 고유 ID |
| session_id | uuid | FK → sessions.id (CASCADE) | 소속 세션 |
| role | varchar(20) | NOT NULL | User / Assistant / System |
| content | text | NOT NULL | 메시지 내용 |
| created_at | timestamptz | NOT NULL | 생성 시각 |

---

## API 명세 (Mr. Park)

### POST /api/conversations
새 세션 생성.

**Request Body**
```json
{}
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "Active",
    "createdAt": "2026-05-11T00:00:00Z"
  }
}
```

---

### POST /api/conversations/{sessionId}/messages
메시지 전송 + LLM 응답 수신 (SSE 스트리밍).

**Request Body**
```json
{
  "content": "안녕하세요",
  "useVoice": false
}
```

**Response** — `Content-Type: text/event-stream`
```
data: {"delta": "안녕"}
data: {"delta": "하세요!"}
data: {"delta": " 무엇을"}
data: [DONE]
```

**완료 후 메시지가 DB에 저장됨 (User + Assistant 각 1건)**

---

### GET /api/conversations/{sessionId}
세션 + 전체 메시지 히스토리 조회.

**Response 200**
```json
{
  "success": true,
  "data": {
    "sessionId": "uuid",
    "status": "Active",
    "createdAt": "2026-05-11T00:00:00Z",
    "messages": [
      { "id": "uuid", "role": "User", "content": "안녕", "createdAt": "..." },
      { "id": "uuid", "role": "Assistant", "content": "안녕하세요!", "createdAt": "..." }
    ]
  }
}
```

---

### DELETE /api/conversations/{sessionId}
세션 + 하위 메시지 전체 삭제.

**Response 200**
```json
{ "success": true }
```

---

### GET /health
서버 상태 확인.

**Response 200**
```json
{ "status": "ok", "timestamp": "2026-05-11T00:00:00Z" }
```

---

## UX 설계 (Ms. Kang)

### 사용자 흐름

```
앱 실행
  └─ 새 대화 버튼 클릭 → POST /api/conversations → sessionId 저장
       └─ 메시지 입력 후 전송
            └─ SSE 수신 → 화면에 토큰 단위로 실시간 출력
                 └─ [DONE] 수신 → 전송 버튼 다시 활성화
```

### 화면 구성

```
┌─────────────────────────────────────┐
│ [사이드바]       │ [채팅 영역]        │
│                  │                   │
│ + 새 대화        │  [메시지 히스토리] │
│                  │                   │
│ • 오늘 대화      │  ┌─────────────┐  │
│ • 어제 대화      │  │ 사용자 메시지│  │
│                  │  └─────────────┘  │
│                  │  ┌──────────────┐ │
│                  │  │AI 응답 (실시 │ │
│                  │  │간 스트리밍)  │ │
│                  │  └──────────────┘ │
│                  │                   │
│                  │ [입력창] [전송]    │
└─────────────────────────────────────┘
```

### 상태 정의

| 상태 | 입력창 | 전송 버튼 | 표시 |
|------|--------|-----------|------|
| 대기 | 활성 | 활성 | - |
| 전송 중 | 비활성 | 비활성 | AI 말풍선에 `...` |
| 스트리밍 | 비활성 | 비활성 | 토큰 실시간 출력 |
| 완료 | 활성 | 활성 | - |

### 완료 기준 (Ms. Kang)
- 메시지 전송 후 AI 응답이 실시간으로 나타남
- 이전 대화를 사이드바에서 선택해서 불러올 수 있음
- 전송 중에는 중복 전송 방지
