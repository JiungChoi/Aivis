# AIVIS 시스템 모듈 정의

## 백엔드 폴더 구조

```
AIVIS.Domain/
├── Models/
│   ├── Entities/     ← DB 엔티티
│   ├── Requests/     ← 요청 모델
│   ├── Responses/    ← 응답 모델 (~Resp)
│   └── Common/       ← ApiResponse<T> 공통 래퍼
├── Enums/            ← 전체 Enum 정의
└── Utilities/        ← 공통 유틸, 확장 메서드

AIVIS.Infrastructure/
├── InfraServices/
│   ├── Claude/       ← LLM (ILlmService → OllamaService / ClaudeService)
│   │   ├── Handlers/
│   │   └── Implementations/
│   ├── Whisper/      ← STT (로컬)
│   │   ├── Handlers/
│   │   └── Implementations/
│   ├── Tts/          ← TTS (Edge TTS)
│   │   └── Implementations/
│   ├── ChromaDb/     ← 벡터 검색 (Phase 2~)
│   │   └── Implementations/
│   └── Obsidian/     ← Vault 파일 읽기/쓰기 (Phase 2~)
│       ├── Handlers/
│       └── Implementations/
├── Repositories/     ← EF Core 리포지토리
├── Persistence/      ← DbContext, Fluent API 설정
├── Migrations/       ← EF Core 마이그레이션
├── Configuration/
│   ├── Database/     ← DatabaseConfig
│   ├── LlmModels/    ← OllamaConfig, AnthropicConfig
│   ├── Voice/        ← WhisperConfig, TtsConfig
│   ├── ExternalServices/ ← ChromaDbConfig, ObsidianConfig
│   └── App/          ← AppConfig
├── Environments/
│   ├── Phase1/       ← .env (Ollama + Whisper + PostgreSQL)
│   ├── Phase2/       ← .env (Phase1 + ChromaDB + Obsidian)
│   └── Phase3/       ← .env (Phase2 + Claude API 전환 옵션)
└── Extensions/
    ├── InfrastructureExtensions.cs
    └── EnvConfigurationExtensions.cs

AIVIS.Application/
├── Controllers/      ← 비즈니스 로직
├── Mappers/          ← Entity ↔ Response (AutoMapper)
└── Extensions/
    └── ApplicationExtensions.cs

AIVIS.API/
├── Routers/          ← Minimal API 엔드포인트 정의
├── BackgroundServices/ ← IHostedService
├── Middleware/       ← 예외처리, 로깅, 인증, Rate limit
└── Extensions/
    ├── MiddlewareExtensions.cs
    ├── RouterExtensions.cs
    └── CorsExtensions.cs
```

---

## 요청 흐름

```
Electron Frontend
      ↓ HTTP
  Middleware        (예외처리 → 로깅 → 인증 → Rate limit)
      ↓
  Router            (경로 정의)
      ↓
  Controller        (비즈니스 로직)
      ↓
  InfraService      (Ollama / Whisper / ChromaDb / Obsidian)
      ↓
  Repository        (PostgreSQL / EF Core)
```

---

## 공통 응답 형식

```json
{ "success": true,  "data": { ... } }
{ "success": false, "errorCode": "NOT_FOUND", "message": "..." }
```

---

## 핵심 모듈 (논리 레이어)

| 모듈 | Phase | 역할 |
|------|-------|------|
| ConversationEngine | 1 | 대화 루프, 세션 관리, MD 저장 |
| VoiceAdapter | 1 | STT/TTS provider 추상화 |
| WorkspaceManager | 1 | 로컬 폴더 구조 자동 생성 |
| AgentOrchestrator | 2 | Intent 분류, Tool routing |
| MemoryEngine | 2 | 단기/장기 기억, 승인 플로우 |
| SecondBrainEngine | 2 | 노트 저장, 태그, 링크, 검색 |
| ObsidianSync | 2 | Vault 동기화 |
| ProductivityAgent | 3 | 할 일, 일정, 리마인더 |
