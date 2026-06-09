# AIVIS Backend Architecture

## 레이어 구조

```
AIVIS.API
  └── AIVIS.Application
        └── AIVIS.Infrastructure
              └── AIVIS.Domain
```

의존성은 항상 아래 방향으로만 흐릅니다. 상위 레이어가 하위 레이어를 참조하고, 역방향 참조는 없습니다.

---

## 각 레이어 역할

### AIVIS.Domain
비즈니스의 핵심 개념만 담습니다. 외부 라이브러리 의존성이 없습니다.

```
AIVIS.Domain/
├── Models/
│   ├── Entities/     ← DB 엔티티
│   ├── Requests/     ← 요청 모델
│   ├── Responses/    ← 응답 모델 (~Resp)
│   └── Common/       ← ApiResponse<T> 공통 래퍼
├── Enums/            ← 전체 Enum 정의
└── Utilities/        ← 도메인 공통 유틸 (확장 메서드, 헬퍼 등)
```

---

### AIVIS.Infrastructure
외부 서비스 연결과 데이터 저장을 담당합니다.

```
AIVIS.Infrastructure/
├── InfraServices/
│   ├── Claude/       ← LLM (ILlmService → OllamaService / ClaudeService)
│   ├── Whisper/      ← STT (로컬, 음성 원본 외부 미전송)
│   ├── Tts/          ← TTS (Edge TTS)
│   ├── ChromaDb/     ← 벡터 검색
│   └── Obsidian/     ← Vault 파일 읽기/쓰기
├── Repositories/     ← EF Core 리포지토리 구현체
├── Persistence/      ← DbContext, 마이그레이션 설정
├── Migrations/       ← EF Core 마이그레이션 파일
├── Configuration/    ← 외부 서비스 설정 클래스
├── Environments/     ← .env / .env.example
└── Extensions/
    ├── InfrastructureExtensions.cs  ← DI 등록
    └── EnvConfigurationExtensions.cs ← .env 로딩
```

**어댑터 원칙:** 모든 외부 서비스는 인터페이스 뒤에 구현체가 위치합니다. 무료 구현체(Ollama, Whisper 로컬)로 시작하고, 이후 유료 서비스(Claude API 등)로 교체 시 구현체 파일만 변경합니다.

---

### AIVIS.Application
비즈니스 로직을 처리합니다. Controller가 직접 Infrastructure 서비스를 주입받아 처리합니다.

```
AIVIS.Application/
├── Controllers/   ← 비즈니스 로직 처리
├── Mappers/       ← Entity ↔ Response 변환 (AutoMapper)
└── Extensions/
    └── ApplicationExtensions.cs  ← DI 등록
```

---

### AIVIS.API
HTTP 진입점만 담당합니다. 비즈니스 로직 없음.

```
AIVIS.API/
├── Routers/            ← Minimal API 엔드포인트 정의
├── BackgroundServices/ ← IHostedService (주기적 백그라운드 작업)
├── Middleware/         ← 예외 처리, 로깅, 인증, Rate limit
└── Extensions/
    ├── MiddlewareExtensions.cs  ← 미들웨어 파이프라인
    ├── RouterExtensions.cs      ← 라우터 일괄 등록
    └── CorsExtensions.cs        ← Electron 프론트엔드 CORS 허용
```

---

## 요청 흐름

```
Electron Frontend
      ↓ HTTP
  Middleware         (예외 처리 → 로깅 → 인증 → Rate limit)
      ↓
  Router             (경로 정의만)
      ↓
  Controller         (비즈니스 로직)
      ↓
  InfraService       (Claude / Whisper / ChromaDb / Obsidian ...)
      ↓
  Repository         (SQLite / EF Core)
```

---

## 공통 응답 형식

모든 API 응답은 `ApiResponse<T>` 로 래핑합니다.

```json
{ "success": true,  "data": { ... } }
{ "success": false, "errorCode": "NOT_FOUND", "message": "..." }
```

---

## 환경 설정

### 최초 셋업 (클론 후 필수)
`.env` 파일은 비밀값을 담을 수 있어 **git 에 추적되지 않습니다**(`.gitignore`). 각 Phase 폴더의 `.env.example` 을 복사해 `.env` 를 만들고 값을 채우세요.

```bash
cd AIVIS.Infrastructure/Environments
cp Phase1/.env.example Phase1/.env   # 기본 실행에 필요 (Program.cs 가 Phase1/.env 로드)
# 필요 시 Phase2 / Phase3 도 동일하게
```

채워야 할 값: `DATABASE__CONNECTIONSTRING` 의 비밀번호, (Claude 사용 시) `ANTHROPIC__APIKEY`, `OBSIDIAN__VAULTPATH` 등.
⚠️ 실제 `.env` 에는 API 키/DB 비밀번호가 들어가므로 절대 커밋하지 마세요.

### 변수 규칙
`__` (더블 언더스코어)는 IConfiguration의 `:` 계층 구분자로 자동 변환됩니다.

```
ANTHROPIC__APIKEY  →  IConfiguration["Anthropic:ApiKey"]
OBSIDIAN__VAULTPATH  →  IConfiguration["Obsidian:VaultPath"]
```
