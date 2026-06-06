# Voice 도메인 명세

## 개요
음성 입력(STT)과 음성 출력(TTS)을 담당하는 도메인.
Conversation 도메인과 연계되어 동작하며, 독립 DB 테이블 없음 (처리 결과를 Conversation으로 전달).

---

## 기술 스택 (Mr. Park)

| 기능 | Phase 1 (무료) | 교체 가능 |
|------|---------------|-----------|
| STT | Whisper.net (로컬) | OpenAI Whisper API |
| TTS | Edge TTS (무료) | Azure TTS, ElevenLabs |

**어댑터 패턴 적용**: `IWhisperService`, `ITtsService` 인터페이스로 추상화.
구현체 파일 하나만 교체하면 유료 서비스로 전환 가능.

---

## DB 스키마 (Mr. Park)

**별도 테이블 없음.**
STT 결과는 Conversation 도메인의 `messages.content`에 저장됨.
TTS 응답은 스트림으로 직접 전달 (저장 안 함).

---

## API 명세 (Mr. Park)

### POST /api/voice/transcribe
오디오 파일 → 텍스트 변환 (Whisper.net).

**Request** — `multipart/form-data`
```
audio: <WAV 파일, 16kHz mono>
```

**Response 200**
```json
{
  "success": true,
  "data": {
    "text": "안녕하세요 오늘 날씨가 좋네요",
    "language": "ko",
    "durationSeconds": 3.2
  }
}
```

**처리 순서**
1. WAV 수신 → Whisper.net으로 전달
2. 텍스트 반환
3. 클라이언트가 이 텍스트를 `POST /api/conversations/{sessionId}/messages`로 전달

---

### GET /api/voice/synthesize?text={text}&voice={voice}
텍스트 → 음성 스트림 (Edge TTS).

**Query Params**
- `text`: 변환할 텍스트
- `voice`: 음성 ID (기본값: `ko-KR-SunHiNeural`)

**Response** — `Content-Type: audio/mpeg` (스트림)

---

## UX 설계 (Ms. Kang)

### 사용자 흐름

```
[마이크 버튼 누름 (Push-to-talk)]
  └─ 녹음 시작 → 마이크 버튼 빨갛게 변함
       └─ [버튼 떼면]
            └─ WAV 파일 생성 → POST /api/voice/transcribe
                 └─ 텍스트 입력창에 결과 표시 (편집 가능)
                      └─ 자동으로 전송 또는 사용자가 확인 후 전송
                           └─ AI 응답 수신 → TTS 자동 재생
```

### 화면 구성

```
┌────────────────────────────────────┐
│              채팅 영역              │
│                                    │
│  [메시지 목록]                     │
│                                    │
│  ┌──────────────────────┐  [🎤]   │
│  │ 입력창 (텍스트/STT)  │  [전송] │
│  └──────────────────────┘         │
└────────────────────────────────────┘

마이크 버튼 상태:
  🎤 회색   → 대기
  🔴 빨강   → 녹음 중
  ⏳ 스피너 → STT 처리 중
```

### 상태 정의

| 상태 | 마이크 버튼 | 입력창 | 설명 |
|------|------------|--------|------|
| 대기 | 🎤 활성 | 편집 가능 | - |
| 녹음 중 | 🔴 강조 | 비활성 | 버튼 떼면 전송 |
| STT 처리 중 | ⏳ | 비활성 | Whisper 처리 중 |
| STT 완료 | 🎤 활성 | 결과 텍스트 표시 | 사용자 확인 후 전송 |
| TTS 재생 중 | 🔇 (음소거 가능) | - | AI 응답 음성 재생 |

### 완료 기준 (Ms. Kang)
- 마이크 버튼 누르면 즉각 녹음 시작 (1초 이내 반응)
- STT 결과가 입력창에 표시되어 수정 가능
- AI 응답이 자동으로 음성 재생됨
- 음소거 버튼으로 TTS 재생 중단 가능
