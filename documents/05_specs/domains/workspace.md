# Workspace 도메인 명세

## 개요
사용자의 로컬 파일 시스템에 대화 로그와 데이터를 저장·관리하는 도메인.
Phase 1에서는 대화 로그 MD 저장만 구현.

---

## 파일 시스템 구조 (Mr. Park)

```
~/AIVIS/
├── conversations/     ← 대화 로그 MD 파일 (Phase 1)
├── second_brain/      ← 개인 지식 저장 (Phase 2)
├── memory/            ← AI 장기 기억 (Phase 2)
└── workspace/         ← 작업 공간 (Phase 3)
```

앱 최초 실행 시 위 폴더 구조를 자동 생성.
경로는 설정 화면에서 변경 가능.

---

## DB 스키마 (Mr. Park)

**별도 테이블 없음.**
파일 시스템 기반으로 관리. 설정값(workspace 경로)은 Phase 2에서 Settings 테이블 추가 예정.

Phase 1은 기본 경로 `~/AIVIS/` 고정.

---

## 대화 로그 저장 포맷 (Mr. Park)

**파일명**: `{yyyy-MM-dd}-{sessionId-앞8자리}.md`
**저장 시점**: 세션 종료 시 (창 닫기 또는 새 대화 시작 시)

```markdown
# AIVIS 대화 로그

**날짜**: 2026-05-11
**세션 ID**: a1b2c3d4

---

**사용자**: 안녕하세요

**AI**: 안녕하세요! 무엇을 도와드릴까요?

---

**사용자**: 오늘 날씨 어때요?

**AI**: 저는 인터넷에 접근할 수 없어서 실시간 날씨는 알 수 없지만...

---
```

---

## API 명세 (Mr. Park)

**외부 API 없음.** 백엔드 내부 서비스(`WorkspaceService`)로만 동작.

### WorkspaceService (내부)

```csharp
public interface IWorkspaceService
{
    Task InitializeWorkspaceFoldersAsync();
    Task SaveConversationLogAsync(Session session, CancellationToken ct = default);
}
```

호출 시점:
- `InitializeWorkspaceFoldersAsync` → 앱 시작 시 (Program.cs)
- `SaveConversationLogAsync` → 세션 종료 시 (ConversationController)

---

## UX 설계 (Ms. Kang)

### 사용자 흐름

```
앱 최초 실행
  └─ ~/AIVIS/ 폴더 자동 생성 (사용자에게 알림 없음, 조용하게 처리)

대화 종료 (새 대화 시작 또는 앱 종료)
  └─ 대화 로그 ~/AIVIS/conversations/ 에 자동 저장
       └─ 저장 완료 (사용자에게 알림 없음)
```

### 설정 화면 (Step 5 이후 추가)

```
┌─────────────────────────────────────┐
│ 설정                                 │
│                                     │
│ 워크스페이스 경로                    │
│ ┌───────────────────────┐ [변경...] │
│ │ ~/AIVIS/              │           │
│ └───────────────────────┘           │
│                                     │
│ [저장]                              │
└─────────────────────────────────────┘
```

### 완료 기준 (Ms. Kang)
- 앱 실행 후 `~/AIVIS/` 폴더가 자동 생성되어 있음
- 대화 종료 시 `conversations/` 폴더에 MD 파일 생성됨
- MD 파일을 열면 대화 내용이 가독성 있게 정리되어 있음
