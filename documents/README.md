# AIVIS 프로젝트 문서

**음성/텍스트 기반 개인 AI 비서 — 기억·문서·지식을 로컬에 축적**

---

## 문서 구조

### [01_product/](01_product/)
| 파일 | 내용 |
|------|------|
| [service-overview.md](01_product/service-overview.md) | 서비스 개요, 핵심 방향성, 주요 화면 |
| [competitive-analysis.md](01_product/competitive-analysis.md) | 경쟁사 분석, AIVIS vs OpenClaw |

### [02_roadmap/](02_roadmap/)
| 파일 | 내용 |
|------|------|
| [overview.md](02_roadmap/overview.md) | 전체 로드맵 개요 + 단계별 요약 |
| [phase-1.md](02_roadmap/phase-1.md) | Phase 1 — Foundation |
| [phase-2.md](02_roadmap/phase-2.md) | Phase 2 — Core Product |
| [phase-3.md](02_roadmap/phase-3.md) | Phase 3 — Scale |
| [phase-4.md](02_roadmap/phase-4.md) | Phase 4 — 데스크탑 앱 패키징 |

### [03_architecture/](03_architecture/)
| 파일 | 내용 |
|------|------|
| [system-modules.md](03_architecture/system-modules.md) | 전체 모듈 정의 + 의존 관계 |
| [tech-stack.md](03_architecture/tech-stack.md) | 기술 스택 결정 + 로컬 우선 원칙 |
| [frontend.md](03_architecture/frontend.md) | 프론트엔드 구조 |
| [local-workspace.md](03_architecture/local-workspace.md) | 로컬 워크스페이스 설계 |
| [refactoring-plan.md](03_architecture/refactoring-plan.md) | 리팩토링 계획 |

### [04_ux/](04_ux/)
| 파일 | 내용 |
|------|------|
| [ui-screens.md](04_ux/ui-screens.md) | 화면 목록 + UX 원칙 |
| [ui-refinement-plan.md](04_ux/ui-refinement-plan.md) | UI 구체화 계획 (다크 프리미엄) |

---

## 3-Phase 요약

| Phase | 기간 | 핵심 목표 |
|-------|------|----------|
| **Phase 1** Foundation | 2~3개월 | 대화 + 저장 기본 루프 |
| **Phase 2** Core Product | 3~4개월 | 기억 + Second Brain + Obsidian |
| **Phase 3** Scale | 2~3개월 | 실행형 기능 + 유료화 + 비전 |

## 핵심 모듈 요약

```
ConversationEngine → AgentOrchestrator → MemoryEngine
                                       → SecondBrainEngine → ObsidianSync
VoiceAdapter                           → ProductivityAgent
WorkspaceManager + StorageEngine + MetadataDB
```

---

## 이미지 자산

모든 이미지: [assets/images/](../assets/images/)

| 파일 | 내용 |
|------|------|
| aivis-landing-main.png | 메인 랜딩 화면 |
| aivis-second-brain.png | Second Brain UI |
| aivis-dashboard-schedule.png | 대시보드/일정 화면 |
| aivis-user-learning-report.png | 사용자 학습 리포트 |
| aivis-dev-roadmap.png | 개발 로드맵 전체 |
| aivis-vs-openclaw.png | 경쟁사 비교 |
| aivis-ecosystem.png | AI 협력 생태계 |
