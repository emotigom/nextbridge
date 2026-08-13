# Nextbridge 행사 현장지원

교사가 휴대전화에서 일정, 등록부 서명 시간, 교과별 협의실, 오시는 길과 현장 질문을 빠르게 확인하는 행사별 정적 웹앱입니다. 프런트는 Astro로 GitHub Pages에 배포하고, 질문·답변은 Supabase Edge Functions를 유일한 공개 API 경계로 사용하도록 설계했습니다.

현재 저장소에는 1단계 프런트와 2단계 서버 인터페이스·마이그레이션이 구현되어 있습니다. 전용 Supabase `nextbridge-prod` 프로젝트에는 스키마와 세 Edge Function을 배포했지만 행사 활성화, 운영진 계정, 허용 출처, Turnstile, 공개 빌드 변수는 아직 연결하지 않았습니다. 따라서 핵심 행사 정보는 동작하지만 질문 폼은 입력 내용을 외부로 보내지 않고 “연결 준비 중”이라고 명확히 안내합니다. Cloudflare DNS·리디렉션과 카카오 알림 리소스도 아직 만들지 않았습니다.

## 현재 구현 범위

- 명찰 v0.3에서 추출한 색상·테두리·라운드·간격·서체 토큰과 반응형 레이아웃
- 3일 일정, 날짜별 등록부 서명 시간, 교과별 협의실 검색, 오시는 길·준비물, 공지·FAQ
- JavaScript가 없어도 읽을 수 있는 핵심 일정과 GitHub Pages `/nextbridge` 하위 경로 대응
- PWA manifest와 같은 출처의 정적 파일만 캐시하는 서비스 워커
- 익명 질문 폼, 접수번호/비공개 링크 조회 화면, 운영진 화면의 정보 구조
- Supabase 스키마·RLS·권한 철회 migration과 제출/조회/운영진 Edge Function 초안
- Turnstile 서버 검증, 원자적 속도 제한, 교체 가능한 카카오·Slack·Discord·이메일 알림 제공자 경계
- CI, Pages 배포, 타입·테스트·빌드·대비·보안 문자열 검사

## 로컬 실행

Node.js 24가 필요합니다.

```bash
npm ci
npm run dev
```

GitHub Pages와 같은 하위 경로 빌드를 검증하려면 다음을 실행합니다.

```bash
ASTRO_TELEMETRY_DISABLED=1 \
ASTRO_BASE_PATH=/nextbridge \
ASTRO_SITE_URL=https://emotigom.github.io \
npm run verify
```

환경 변수 이름은 [.env.example](.env.example)과 [supabase/functions/.env.example](supabase/functions/.env.example)에만 정의되어 있습니다. 실제 비밀값은 커밋하지 않습니다.

## 행사 추가·변경

행사별 정적 정보는 코드와 화면 컴포넌트에서 분리되어 있습니다.

1. `src/content/events/<행사>.ts`에 일정·서명·협의실·FAQ 콘텐츠를 작성합니다.
2. `src/config/events/<행사>.ts`에서 행사명·기간·장소·접수번호 접두사·후보 QR 주소를 스키마로 검증합니다.
3. `src/config/events/active.ts`에서 현재 행사를 선택합니다.
4. 백엔드를 연결할 때 migration의 `events` 행과 같은 `slug`를 사용합니다.

한국어를 기본값으로 두되 모든 행사 표시는 `{ ko, en? }` 구조를 사용해 영문 전환을 확장할 수 있습니다.

## 배포와 QR 상태

- `main`에 병합되면 Pages workflow가 검증 후 `dist`를 배포합니다.
- GitHub Pages 빌드는 `/nextbridge`, 최종 짧은 도메인 빌드는 `/`를 기준으로 합니다.
- Supabase `nextbridge-prod`는 서울 리전에 생성되어 있으며 업무 테이블 6개와 Edge Function 3개가 배포되었습니다. `2026-sk` 행사는 아직 비활성 상태입니다.
- 고정 주소는 `https://go.gomdory.com/2026-sk`로 선택했으며 DNS 연결·활성화·QR 생성은 아직 하지 않았습니다.
- 기존 `nextbridge-classroom-kit`의 `program-03`와 이미 인쇄된 QR 경로는 새 사이트 배포·실기기 검증 전까지 유지합니다.

자세한 순서는 [QR 전환 계획](docs/qr-cutover.md)을 따릅니다.

## 문서

- [아키텍처](docs/architecture.md)
- [명찰 기반 디자인 토큰](docs/design-tokens.md)
- [보안 모델](docs/security.md)
- [현장 운영 가이드](docs/operations.md)
- [QR·도메인 전환](docs/qr-cutover.md)
- [외부 연결 체크리스트](docs/external-setup.md)

## 라이선스

코드는 [MIT License](LICENSE)로 제공합니다. 로고와 행사 콘텐츠의 사용 권한은 원 권리자의 정책을 따릅니다.
