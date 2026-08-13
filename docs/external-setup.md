# 외부 연결 체크리스트

Supabase 기반은 실제 프로젝트에 배포했고, 참가자에게 노출되는 연결은 안전 게이트를 통과할 때까지 잠가 두었습니다. Cloudflare와 카카오 리소스는 아직 만들지 않았습니다.

## 현재 상태

- Supabase 조직: `emotigom's Org` (Free)
- 프로젝트: `nextbridge-prod`, 서울(`ap-northeast-2`), 정상 상태
- 적용 완료: 업무 테이블 6개, 전체 RLS 강제, 브라우저 역할 직접 권한 철회, Edge Function 3개
- 안전 잠금: `2026-sk` 행사 `is_active = false`, 공개 빌드 변수 미연결, 허용 출처·Turnstile 미설정
- 운영진: 승인된 owner 이메일의 Auth 계정과 멤버십은 아직 생성하지 않음
- Cloudflare: `gomdory.com` zone, `go` DNS/redirect, Turnstile widget 모두 미생성
- 카카오: 공식 알림톡 공급자·relay·수신자 모두 미정

## 필요한 결정

1. **운영진 계정**: Supabase Auth에서 승인된 owner 이메일 초대를 완료한 뒤 생성된 사용자 ID에 `owner` 멤버십을 부여.
2. **Cloudflare**: `emotigom.github.io`용 Turnstile widget을 먼저 만들고, 이후 `gomdory.com` zone과 `go` DNS/redirect를 연결.
3. **카카오 경로**: 공식 알림톡 공급자 또는 기존 보안 relay, 발신 프로필, 승인 템플릿, 운영진 수신자와 참가자 완료 알림 허용 여부.

고정 주소는 `https://go.gomdory.com/2026-sk`로 선택했습니다. DNS·리디렉션·인증서·QR은 아직 만들지 않았으며 종단 간 검증 후 활성화합니다.

카카오톡 우선 요구는 `kakao_alimtalk` 제공자 인터페이스로 반영했습니다. 브라우저나 공개 함수 코드에 카카오 자격증명을 넣지 않으며, 실제 공급자/relay가 확정되면 `_shared/notifications.ts`의 계약에 연결합니다. 공급자 승인 지연에 대비해 이메일 또는 Slack/Discord를 운영진 전용 보조 채널로 둘 수 있습니다.

## 연결 순서

1. Supabase 프로젝트·migration·Edge Function 배포 — 완료
2. 운영진 Auth 초대와 `owner` 멤버십 설정
3. Turnstile widget 생성 후 Edge Function secrets와 허용 origin 연결
4. GitHub Pages 체크포인트에 publishable 값만 설정해 종단 간 시험
5. 카카오 relay/알림톡 템플릿 연결 및 민감정보 미포함 확인
6. Cloudflare에 `gomdory.com`을 등록하고 `go` DNS·redirect 구성
7. 실제 휴대전화·QR 검수 후 행사와 QR 상태를 production 값으로 승격

## 플랫폼별 비밀값 위치

| 값                                                         | 저장 위치                                         |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`, publishable key, Turnstile site key | GitHub Actions variables 또는 빌드 환경의 공개 값 |
| Supabase secret/service key                                | Supabase Edge Function secrets                    |
| Turnstile secret                                           | Supabase Edge Function secrets                    |
| 카카오 relay token·수신자                                  | Supabase Edge Function secrets                    |
| Slack/Discord webhook                                      | Supabase Edge Function secrets                    |
| Cloudflare API token                                       | 로컬/배포 자동화 secret, 프런트 번들 금지         |

연결 직전에는 [보안 검토](security.md)의 부정 테스트와 [행사 전 체크리스트](operations.md)를 함께 수행합니다.
