# Phase 4 — Distribution (배포 및 설치)

**기간:** 1~2개월  
**목표:** 비개발자도 설치해서 바로 쓸 수 있는 배포 패키지 완성

---

## 배포 전략 (Ms. Kang)

| 항목 | 내용 |
|------|------|
| 대상 OS | macOS (우선), Windows (차후) |
| 배포 방식 | 직접 다운로드 (초기) → Mac App Store (차후) |
| 설치 경험 | 설치파일 실행 → 초기 설정 마법사 → 바로 사용 |
| 업데이트 | 자동 업데이트 (백그라운드) |

**핵심 원칙:** 설치 과정에서 터미널 한 줄도 입력하지 않아야 함

---

## 구현 계획 (Mr. Park)

### 번들링 대상
사용자가 별도 설치 없이 동작해야 하는 것들:
- Ollama 런타임
- llama3.2 모델
- PostgreSQL (Docker 없이 내장 또는 embedded DB 전환 검토)
- Whisper 모델
- .NET 런타임

### M1 — Electron 인스톨러
- [ ] `electron-builder` 설정 (dmg / pkg for macOS)
- [ ] 코드 사이닝 (Mac Gatekeeper 통과)
- [ ] 앱 아이콘, 스플래시 스크린
- [ ] 자동 업데이트 (`electron-updater`)

### M2 — 의존성 내장
- [ ] Ollama 바이너리 앱 번들에 포함
- [ ] 첫 실행 시 모델 자동 다운로드 (진행률 표시)
- [ ] PostgreSQL → 내장 DB 전환 검토 (SQLite 또는 embedded Postgres)

### M3 — 초기 설정 마법사 (Onboarding)
- [ ] 환영 화면
- [ ] Obsidian vault 경로 설정 (선택)
- [ ] 워크스페이스 경로 설정
- [ ] 모델 다운로드 진행률 화면
- [ ] 설정 완료 후 메인 화면 진입

### M4 — 자동 업데이트
- [ ] 백그라운드 업데이트 체크
- [ ] 업데이트 알림 및 설치

---

## Phase 4 완료 기준

- [ ] `.dmg` 파일 하나로 설치 완료
- [ ] 설치 후 터미널 없이 바로 사용 가능
- [ ] 자동 업데이트 동작
- [ ] Mac Gatekeeper 경고 없이 실행
