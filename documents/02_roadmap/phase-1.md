# Phase 1 — Foundation (기반 구축)

**기간:** 2~3개월  
**목표:** 말하면 응답하고, 대화가 저장되는 기본 루프 + 홈 대시보드 완성

---

## 완료 현황 (2026-05-25 기준)

| 항목 | 상태 | 비고 |
|------|------|------|
| 백엔드 .NET 9 솔루션 구성 | ✅ 완료 | Docker Compose 운영 중 |
| PostgreSQL + EF Core 마이그레이션 | ✅ 완료 | SQLite → PostgreSQL로 변경 |
| Ollama 연결 (llama3.2) | ✅ 완료 | 로컬 실행, 스트리밍 지원 |
| Health check 엔드포인트 | ✅ 완료 | `GET /health` |
| 텍스트 대화 API | ✅ 완료 | 세션 CRUD, 메시지 CRUD |
| SSE 스트리밍 | ✅ 완료 | 실시간 토큰 출력 |
| 프론트엔드 React + Vite + Tailwind | ✅ 완료 | Docker HMR 연동 |
| 채팅 UI (말풍선, 입력창, 세션 목록) | ✅ 완료 | |
| User DB + 자동 시드 | ✅ 완료 | `GET /api/users/{userId}` |
| ConversationQuality (시스템 프롬프트) | ✅ 완료 | 사용자별 언어/톤 설정 |
| 홈 대시보드 UI | ✅ 완료 | 4컬럼, 리사이즈 가능 |
| 음성 입력 (STT / Whisper) | ✅ 완료 | Whisper ASR Docker 사이드카 (port 9000) |
| 음성 출력 (TTS) | ✅ 완료 | 브라우저 SpeechSynthesis API (ko-KR) |
| 스페이스바 PTT | ✅ 완료 | 누르는 동안 녹음, 떼면 자동 전송 |
| 실시간 음성 텍스트 표시 | ✅ 완료 | SpeechRecognition + MediaRecorder 이중 구조 |
| 워크스페이스 파일 저장 | ❌ 미구현 | Phase 1 M4 |

---

## 비용 계획

| 항목 | 현재 (무료) | 이후 교체 가능 |
|------|------------|---------------|
| LLM | Ollama (로컬 llama3.2) | Claude API, GPT-4 |
| STT | Whisper.net (로컬) | OpenAI Whisper API |
| TTS | Edge TTS (무료) | Azure TTS, ElevenLabs |
| DB | PostgreSQL (Docker) | 유지 |
| 벡터 DB | ChromaDB (로컬) | Pinecone |

**원칙:** `ILlmService`, `ISttService`, `ITtsService` 인터페이스로 추상화 → 구현체만 교체

---

## 구현 계획

### M1 — 프로젝트 기반 세팅 ✅ 완료

- [x] .NET 9 솔루션 빌드 환경
- [x] PostgreSQL + EF Core 마이그레이션
- [x] `.env` 로딩 + Docker Compose
- [x] `ILlmService` → Ollama 구현체
- [x] Health check `GET /health`
- [x] React + Vite + Tailwind + TypeScript

### M2 — 텍스트 대화 루프 ✅ 완료

- [x] `Session`, `Message`, `User` 엔티티
- [x] `POST /api/conversations` — 세션 생성
- [x] `POST /api/conversations/{id}/messages` — 메시지 전송
- [x] `POST /api/conversations/{id}/messages/stream` — SSE 스트리밍
- [x] `GET /api/conversations/{id}` — 세션 조회
- [x] `DELETE /api/conversations/{id}` — 세션 삭제
- [x] `GET /api/users/{userId}` — 유저 조회
- [x] ConversationQuality — 사용자별 시스템 프롬프트
- [x] 채팅 UI + 세션 사이드바 + 홈 채팅 패널

### M3 — 음성 입력/출력 ✅ 완료

- [x] `IWhisperService` + Whisper ASR HTTP 구현체 (Docker sidecar, port 9000)
- [x] `POST /api/voice/transcribe`
- [x] `ITtsService` → 브라우저 SpeechSynthesis API로 구현 (Edge TTS 비공식 API 403 이슈로 대체)
- [x] 프론트 Push-to-talk (스페이스바 PTT) + 음성 오버레이 (붉은 회오리 애니메이션)
- [x] 실시간 음성 → 텍스트 표시 (SpeechRecognition 이중 구조)
- [x] TTS 자동 재생 (AI 응답 후 자동 읽기, 토글 가능)

### M4 — 개인 워크스페이스 ⬜ 미구현

- [ ] `WorkspaceManager` — 앱 시작 시 `~/AIVIS/` 폴더 자동 생성
- [ ] 대화 종료 시 MD 파일 자동 저장
- [ ] 로컬 파일 도메인 구조 초기화 (→ `local-workspace.md` 참고)

---

## Phase 1 완료 기준

- [x] 텍스트 메시지 → LLM 스트리밍 응답
- [x] 세션 생성/조회/삭제
- [x] 사용자 정보 DB 저장 + AI 프롬프트 반영
- [x] 버튼 눌러서 말하면 STT → LLM → TTS 음성 응답
- [ ] 대화 내용이 `~/AIVIS/conversations/`에 MD 저장
- [x] Ollama → Claude API 교체 시 구현체만 변경
