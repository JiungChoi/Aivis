# AIVIS 프론트엔드 아키텍처

## 기술 스택

| 역할 | 기술 |
|------|------|
| 데스크탑 런타임 | Electron 33 |
| UI 프레임워크 | React 18 + TypeScript |
| 빌드 도구 | Vite 6 |
| 상태 관리 | Zustand 5 |
| 스타일링 | Tailwind CSS 3 |
| 배포 | electron-builder |

---

## 폴더 구조

```
src/frontend/
├── electron/
│   ├── main.ts          # 메인 프로세스: 윈도우 생성, OS 레벨 IPC 처리
│   └── preload.ts       # contextBridge: 렌더러-메인 보안 채널
├── src/
│   ├── main.tsx         # React 진입점 (ReactDOM.createRoot)
│   ├── App.tsx          # 페이지 라우팅
│   ├── pages/           # 화면 단위 컴포넌트 (라우트 1개 = 파일 1개)
│   │   ├── ChatPage.tsx
│   │   └── SettingsPage.tsx
│   ├── components/      # 재사용 UI 컴포넌트
│   │   ├── chat/
│   │   │   ├── MessageList.tsx
│   │   │   ├── MessageBubble.tsx
│   │   │   └── MessageInput.tsx
│   │   └── layout/
│   │       └── Sidebar.tsx
│   ├── stores/          # Zustand 전역 상태
│   │   ├── conversationStore.ts
│   │   └── settingsStore.ts
│   ├── services/        # .NET 백엔드 API 통신
│   │   └── conversationService.ts
│   └── types/           # 공유 TypeScript 타입
│       └── index.ts
├── vite.config.ts
└── tsconfig.json
```

---

## 데이터 흐름

```
사용자 입력
    │
    ▼
MessageInput (component)
    │ store action 호출
    ▼
conversationStore (zustand)
    │ HTTP fetch
    ▼
conversationService
    │ POST /api/conversations
    ▼
.NET 백엔드 API (localhost:5050)
    │ 응답
    ▼
conversationStore (messages 업데이트)
    │ state 변경 → re-render
    ▼
MessageList (component)
```

### 핵심 원칙
- **React ↔ 백엔드**: 직접 HTTP (fetch). Electron IPC를 경유하지 않음
- **Electron IPC 용도**: OS 기능 전용 (시스템 트레이, 알림, 파일 다이얼로그)
- **단방향 데이터 흐름**: store에서 내려오는 state만 컴포넌트가 읽음

---

## 상태 관리 (Zustand)

### conversationStore
```ts
interface ConversationState {
  sessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  sendMessage: (text: string) => Promise<void>;
  clearSession: () => void;
}
```

### settingsStore
```ts
interface SettingsState {
  apiBaseUrl: string;
  // Phase 2: 개인화 설정
}
```

---

## Electron IPC 채널

| 채널 | 방향 | 용도 |
|------|------|------|
| `open-file-dialog` | Renderer → Main | 파일 선택 다이얼로그 |
| `show-notification` | Renderer → Main | OS 알림 |

> AI 메시지 처리는 IPC 없이 React → HTTP fetch → .NET API로 직접 처리

---

## 컴포넌트 설계 원칙

- **pages**: 데이터 fetching, store 연결 담당. UI 없음
- **components**: store를 모름. props만 받아서 렌더링
- **stores**: 비즈니스 로직 + API 호출 담당

```
pages (connected)
  └── components (dumb, props-only)
       └── stores (logic + state)
            └── services (HTTP)
```
