# 외부 연결 체크리스트

저장소 기반 작업은 외부 리소스를 만들지 않고 준비했습니다. 실제 연결을 시작할 때 아래 선택을 한 번에 확정하면 됩니다.

## 필요한 결정

1. **Supabase 프로젝트**: 연결된 `emotigom's Org`에 Nextbridge 전용 프로젝트를 만들지, 기존 `gom-clean-prod`를 재사용할지 선택. 전용 프로젝트 권장.
2. **운영진 계정**: Supabase Auth에 초대할 이메일과 각 사용자의 `owner`/`operator`/`viewer` 역할.
3. **카카오 경로**: 공식 알림톡 공급자 또는 기존 보안 relay, 발신 프로필, 승인 템플릿, 운영진 수신자와 참가자 완료 알림 허용 여부.
4. **Cloudflare**: `gomdory.com` zone을 관리하는 계정과 `go` DNS/redirect, Turnstile widget 생성 권한.

고정 주소는 `https://go.gomdory.com/2026-sk`로 선택했습니다. DNS·리디렉션·인증서·QR은 아직 만들지 않았으며 종단 간 검증 후 활성화합니다.

카카오톡 우선 요구는 `kakao_alimtalk` 제공자 인터페이스로 반영했습니다. 브라우저나 공개 함수 코드에 카카오 자격증명을 넣지 않으며, 실제 공급자/relay가 확정되면 `_shared/notifications.ts`의 계약에 연결합니다. 공급자 승인 지연에 대비해 이메일 또는 Slack/Discord를 운영진 전용 보조 채널로 둘 수 있습니다.

## 연결 순서

1. Supabase staging 프로젝트 생성과 migration 적용
2. Edge Function secrets, 허용 origin, 운영진 Auth/멤버십 설정
3. Turnstile staging widget과 서버 secret 연결
4. 카카오 relay/알림톡 템플릿 연결 및 민감정보 미포함 확인
5. GitHub Pages 체크포인트에 publishable 값만 설정해 종단 간 시험
6. Cloudflare `go` 주소와 redirect 구성
7. 실제 휴대전화·QR 검수 후 production 값으로 승격

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
