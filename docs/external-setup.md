# 외부 연결 체크리스트

Supabase 기반은 실제 프로젝트에 배포했고, 참가자에게 노출되는 연결은 안전 게이트를 통과할 때까지 잠가 두었습니다. Cloudflare 고정 주소는 후보 QR까지 준비했으며, 카카오 리소스는 아직 만들지 않았습니다.

## 현재 상태

- Supabase 조직: `emotigom's Org` (Free)
- 프로젝트: `nextbridge-prod`, 서울(`ap-northeast-2`), 정상 상태
- 적용 완료: 업무 테이블 6개, 전체 RLS 강제, 브라우저 역할 직접 권한 철회, Edge Function 3개
- 안전 잠금: `2026-sk` 행사 `is_active = false`, 프런트 설정 `status: draft`, QR 상태 `candidate`
- 운영진: 승인된 owner 이메일 확인, 활성 `owner` 멤버십, 12자리 비밀번호 설정과 첫 정상 로그인 완료
- Auth 반환 주소: `https://emotigom.github.io/nextbridge/admin/`
- Turnstile: widget, 허용 출처, Edge Function secrets 4개, Pages 공개 빌드 값 연결 완료
- 검증: 허용 출처 preflight `204`, 없는 질문 조회 `404`, 가짜 Turnstile 토큰 `TURNSTILE_REJECTED`; 클라우드 브라우저 정상 접수 시험은 Turnstile 오류 `600010`으로 보류
- Cloudflare: `gomdory.com` zone 활성 확인, `go` DNS/redirect는 미구성, 후보 QR SVG/PNG 생성·해독 검증 완료
- 카카오: 공식 알림톡 공급자·relay·수신자 모두 미정

## 남은 결정과 작업

1. **Cloudflare**: `go.gomdory.com` proxied DNS와 `https://go.gomdory.com/2026-sk`의 302 Single Redirect 구성.
2. **실기기 검증**: iOS/Android 카메라에서 Wi-Fi와 모바일 데이터로 QR·질문 접수 흐름 확인.
3. **카카오 경로**: 추후 공식 알림톡 공급자 또는 기존 보안 relay, 발신 프로필, 승인 템플릿, 운영진 수신자와 참가자 완료 알림 허용 여부 결정.

고정 주소는 `https://go.gomdory.com/2026-sk`입니다. QR에는 이 주소만 인코딩하고, 실제 목적지는 Cloudflare 리디렉션 규칙으로 관리합니다. DNS·리디렉션·실기기 검증 전에는 후보 QR을 인쇄하지 않습니다.

카카오톡 우선 요구는 `kakao_alimtalk` 제공자 인터페이스로 반영했습니다. 브라우저나 공개 함수 코드에 카카오 자격증명을 넣지 않으며, 실제 공급자/relay가 확정되면 `_shared/notifications.ts`의 계약에 연결합니다. 공급자 승인 지연에 대비해 이메일 또는 Slack/Discord를 운영진 전용 보조 채널로 둘 수 있습니다.

## 연결 순서

1. Supabase 프로젝트·migration·Edge Function 배포 — 완료
2. 운영진 Auth 이메일 확인, `owner` 멤버십, 비밀번호 설정과 첫 로그인 — 완료
3. Turnstile widget 생성 후 Edge Function secrets와 허용 origin 연결 — 완료
4. GitHub Pages 체크포인트에 publishable 값만 설정하고 서버 부정 시험 — 완료, 실기기 정상 접수 시험 대기
5. 후보 동적 QR SVG/PNG 생성 및 해독 검증 — 완료
6. Cloudflare `go` DNS·302 Single Redirect 구성
7. 실제 휴대전화·QR·정상 접수 검수 후 행사와 QR 상태를 production 값으로 승격
8. 카카오 공식 알림톡 공급자 준비 후 relay/템플릿 연결 및 민감정보 미포함 확인

## 플랫폼별 비밀값 위치

| 값 | 저장 위치 |
| --- | --- |
| `PUBLIC_SUPABASE_URL`, publishable key, Turnstile site key | GitHub Actions variables 또는 빌드 환경의 공개 값 |
| Supabase secret/service key | Supabase Edge Function secrets |
| Turnstile secret | Supabase Edge Function secrets |
| 카카오 relay token·수신자 | Supabase Edge Function secrets |
| Slack/Discord webhook | Supabase Edge Function secrets |
| Cloudflare API token | 로컬/배포 자동화 secret, 프런트 번들 금지 |

연결 직전에는 [보안 검토](security.md)의 부정 테스트와 [행사 전 체크리스트](operations.md)를 함께 수행합니다.
