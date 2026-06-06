# Phase 1 구현 계획

각 Step 완료 후 Mr. Choi 검토 후 다음 Step 진행.

---

## Step 1 — 백엔드 API 기본 동작 ✅ 준비 완료

**담당**: Mr. Park
**도메인**: Conversation
**목표**: `curl`로 메시지 보내면 Ollama가 응답 반환

### 구현 목록
- [ ] `GET /health` 엔드포인트
- [ ] `POST /api/conversations` — 세션 생성
- [ ] `POST /api/conversations/{sessionId}/messages` — 메시지 전송 + Ollama 응답 (비스트리밍 먼저)
- [ ] `GET /api/conversations/{sessionId}` — 세션 조회
- [ ] `DELETE /api/conversations/{sessionId}` — 세션 삭제
- [ ] `OllamaService` 구현 (`ILlmService` 어댑터)
- [ ] ConversationController에 Repository 주입

### 관련 파일
```
AIVIS.Infrastructure/InfraServices/Ollama/
  ILlmService.cs
  Implementations/OllamaService.cs
AIVIS.Application/Controllers/ConversationController.cs
AIVIS.API/Routers/ConversationRouter.cs
```

### 완료 기준
```bash
curl -X POST http://localhost:5050/api/conversations
# → { "sessionId": "uuid" }

curl -X POST http://localhost:5050/api/conversations/{sessionId}/messages \
  -d '{ "content": "안녕?" }'
# → { "content": "안녕하세요!" }
```

---

## Step 2 — 프론트엔드 채팅 화면 연결

**담당**: Mr. Park (백엔드 연결) + Ms. Kang (UX 검토)
**도메인**: Conversation
**목표**: Electron 앱에서 타이핑 → AI 응답 텍스트로 표시

### 구현 목록 (Mr. Park)
- [ ] `conversationService.ts` Step 1 API 실제 연결
- [ ] 세션 자동 생성 (앱 시작 또는 "새 대화" 클릭 시)
- [ ] 메시지 전송 → 응답 표시

### UX 체크리스트 (Ms. Kang)
- [ ] 전송 중 입력창 비활성화
- [ ] AI 응답 중 `...` 로딩 표시
- [ ] 에러 발생 시 재시도 안내 메시지

### 완료 기준
Electron 앱을 켜고 메시지를 입력하면 AI 응답이 화면에 표시됨

---

## Step 3 — SSE 스트리밍

**담당**: Mr. Park (백엔드 + 프론트엔드)
**도메인**: Conversation
**목표**: 응답이 ChatGPT처럼 글자 단위로 실시간 출력

### 구현 목록 (Mr. Park)
- [ ] OllamaService 스트리밍 모드 (`IAsyncEnumerable`)
- [ ] ConversationController SSE 응답 (`text/event-stream`)
- [ ] 프론트엔드 SSE 수신 → 말풍선에 실시간 append

### 완료 기준
메시지 전송 후 AI 응답이 토큰 단위로 화면에 실시간으로 나타남

---

## Step 4 — 음성 입출력 (STT / TTS)

**담당**: Mr. Park (백엔드 + 프론트엔드) + Ms. Kang (UX 검토)
**도메인**: Voice
**목표**: 말하면 AI가 음성으로 대답

### 구현 목록 (Mr. Park)
- [ ] `POST /api/voice/transcribe` — Whisper.net 연동
- [ ] `GET /api/voice/synthesize` — Edge TTS 연동
- [ ] 프론트엔드 Push-to-talk 버튼 (MediaRecorder API)
- [ ] WAV 변환 → 백엔드 전송 → 텍스트 입력창 자동 채움
- [ ] AI 응답 완료 후 TTS 자동 재생

### UX 체크리스트 (Ms. Kang)
- [ ] 녹음 중 시각적 피드백 (버튼 색상 변경)
- [ ] STT 처리 중 로딩 표시
- [ ] 음소거 버튼으로 TTS 중단 가능

### 완료 기준
마이크 버튼을 누르고 말하면 STT → LLM → TTS 전체 루프가 동작함

---

## Step 5 — 대화 저장

**담당**: Mr. Park (백엔드) + Ms. Kang (UX 검토)
**도메인**: Workspace
**목표**: 대화 종료 시 `~/AIVIS/conversations/` 에 MD 파일 자동 저장

### 구현 목록 (Mr. Park)
- [ ] `WorkspaceService` 구현
  - 앱 시작 시 `~/AIVIS/` 폴더 구조 자동 생성
  - 세션 종료 시 MD 파일 저장
- [ ] ConversationController에서 세션 종료 시 `WorkspaceService.SaveConversationLogAsync` 호출

### 완료 기준
대화 후 `~/AIVIS/conversations/` 폴더에 MD 파일이 생성됨

---

## Phase 1 최종 완료 기준

| 항목 | 확인 |
|------|------|
| 텍스트로 메시지 보내면 LLM이 스트리밍으로 응답 | |
| 버튼 눌러서 말하면 STT → LLM → TTS 음성 응답 | |
| 대화 내용이 `~/AIVIS/conversations/` 에 MD로 저장 | |
| Ollama → Claude API 교체 시 구현체 파일 하나만 변경 | |
