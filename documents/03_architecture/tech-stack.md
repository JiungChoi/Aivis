# AIVIS 기술 스택

## 프론트엔드
| 항목 | 기술 |
|------|------|
| 프레임워크 | Electron + React + TypeScript |
| UI | Tailwind CSS + shadcn/ui |
| 상태관리 | Zustand |
| 음성 UI | Web Audio API (push-to-talk) |
| 빌드 | Vite |

## 백엔드
| 항목 | 기술 |
|------|------|
| 런타임 | .NET 9 (C#) |
| API | ASP.NET Core (Minimal API) |
| ORM | EF Core + Npgsql |
| DB | PostgreSQL (Docker) |
| 벡터 검색 | ChromaDB (로컬, Phase 2~) |

## LLM / AI (어댑터 구조 — 교체 가능)
| 항목 | Phase 1 (무료) | Phase 3~ (유료 전환 가능) |
|------|---------------|--------------------------|
| LLM | Ollama (llama3.2, 로컬) | Claude API (claude-opus-4-7) |
| STT | Whisper.net (로컬) | OpenAI Whisper API |
| TTS | Edge TTS (무료) | Azure TTS, ElevenLabs |
| Embedding | nomic-embed-text via Ollama | OpenAI Embedding API |

**원칙:** `ILlmService`, `ISttService`, `ITtsService` 인터페이스로 추상화. 구현체 파일 하나만 교체하면 서비스 전환 완료.

## 인프라
| 항목 | 기술 |
|------|------|
| DB 컨테이너 | Docker (postgres:16-alpine) |
| 벡터 DB | ChromaDB 로컬 |
| 파일 저장 | 로컬 파일시스템 (Markdown) |
| Obsidian 연동 | 파일시스템 직접 읽기/쓰기 |

---

## 백엔드 레이어 구조

```
AIVIS.API           → Routers, Middleware, BackgroundServices
AIVIS.Application   → Controllers, Mappers
AIVIS.Infrastructure→ InfraServices, Repositories, Persistence, Configuration
AIVIS.Domain        → Models, Enums, Utilities
```

의존성: API → Application → Infrastructure → Domain (단방향)

---

## 로컬 우선 원칙

```
음성/텍스트 입력
      ↓
로컬 처리 (Whisper STT / Edge TTS)
      ↓
Ollama LLM (로컬) — Phase 3에서 Claude API 교체 가능
      ↓
로컬 저장 (PostgreSQL / MD 파일 / ChromaDB)
      ↓
Obsidian vault 동기화
```

음성 원본, 개인 파일은 로컬에만 저장. LLM에는 텍스트 컨텍스트만 전달.

---

## 개발 환경

```bash
# 필수
.NET 9 SDK
Node.js 20+
Docker Desktop

# DB 시작
docker-compose up -d   # AIVIS.Infrastructure/docker-compose.yml
```
