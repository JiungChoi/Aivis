# Phase 2 — Core Product (핵심 제품)

**기간:** 3~4개월  
**목표:** 기억하고 연결하는 Second Brain 완성

---

## 완료 현황 (2026-05-25 기준)

### Sprint 2-A — 음성 파이프라인 ✅ 완료
| 항목 | 상태 | 비고 |
|------|------|------|
| Whisper ASR 사이드카 연동 | ✅ 완료 | `onerahmet/openai-whisper-asr-webservice` Docker |
| PTT 스페이스바 단축키 | ✅ 완료 | useVoiceInput hook |
| 실시간 음성 텍스트 오버레이 | ✅ 완료 | 붉은 회오리 애니메이션 |
| TTS 자동 재생 | ✅ 완료 | SpeechSynthesis API (ko-KR) |

### Sprint 2-B — 대시보드 실연동 ✅ 완료
| 항목 | 상태 | 비고 |
|------|------|------|
| 일정 API 연동 | ✅ 완료 | `GET/POST/PUT/DELETE /api/schedules`, EF Core, DB 시드 |
| 일정 추가 폼 | ✅ 완료 | 인라인 폼, 시간/제목/태그 입력 |
| 뉴스 RSS 연동 | ✅ 완료 | `GET /api/news?category=`, 15분 캐시, 4개 피드 |
| Memory Engine 기반 | ✅ 완료 | `GET/POST/DELETE /api/memory`, ConversationQuality 통합 |
| 날씨 실연동 | ✅ 완료 | Open-Meteo API (무료, 키 불필요), 서울 실시간 기온 |

---

## 비용 계획 (Ms. Kang)

| 항목 | 초기 (무료) | 이후 교체 가능 |
|------|------------|---------------|
| 임베딩 | nomic-embed-text (Ollama 로컬) | OpenAI Embedding API |
| 벡터 검색 | ChromaDB (로컬) | Pinecone |
| Obsidian 연동 | 파일시스템 직접 접근 (무료) | — |
| 날씨 | Open-Meteo (무료) | — |

---

## 구현 계획 (Mr. Park)

### M1 — Agent 오케스트레이션
- [ ] Intent 분류 (질문 / 저장 / 검색 / 실행)
- [ ] Tool routing — 의도에 따라 적절한 서비스 호출
- [ ] Write 작업 제한 정책 + Audit log

### M2 — Memory Engine ✅ 기반 완료
- [x] Memory 엔티티 + `IMemoryRepository` / `MemoryRepository`
- [x] `GET/POST/DELETE /api/memory`
- [x] ConversationQuality 시스템 프롬프트에 기억 자동 포함
- [ ] 단기 기억 (세션 컨텍스트)
- [ ] 기억 저장 승인 플로우

### M3 — Second Brain 저장 구조
- [ ] Markdown 노트 저장 (메모 / 회의록 / 아이디어)
- [ ] 태그 자동 부여
- [ ] 노트 간 링크 생성
- [ ] 벡터 검색 (ChromaDB + nomic-embed-text)

### M4 — Obsidian 연동
- [ ] Vault 경로 설정
- [ ] MD 파일 생성 / 수정
- [ ] `[[wikilink]]` 자동 생성
- [ ] Daily Note 자동 추가

---

## Phase 2 완료 기준

- [x] 대시보드 실시간 데이터 연동 (일정/뉴스/날씨)
- [x] AI 기억 기반 설계 완료 (CRUD API + 시스템 프롬프트 통합)
- [ ] AI가 사용자 특성을 반영한 응답 가능 (장기 기억 학습)
- [ ] 저장된 노트를 자연어로 검색 가능
- [ ] Obsidian에서 AIVIS 저장 내용이 자연스럽게 표시
- [ ] 사용자가 AI 기억 직접 확인 / 수정 가능
