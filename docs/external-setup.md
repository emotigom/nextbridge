# 외부 연결 체크리스트

Supabase 기반은 실제 프로젝트에 배포했고, 참가자에게 노출되는 연결은 안전 게이트를 통과할 때까지 잠가 두었습니다. Cloudflare 고정 주소와 QR 실기기 검증은 완료했으며, 알림은 운영자 Discord와 참가자 이메일만 사용합니다.

## 현재 상태

- Supabase 조직: `emotigom's Org` (Free)
- 프로젝트: `nextbridge-prod`, 서울(`ap-northeast-2`), 정상 상태
- 적용 완료: 업무 테이블 6개, 전체 RLS 강제, 브라우저 역할 직접 권한 철회, Edge Function 3개
- 준비 완료와 안전 잠금: `2026-sk` 행사 `is_active = false`, 프런트 설정 `status: ready`, QR 상태 `verified`
- 운영진: 승인된 owner 이메일 확인, 활성 `owner` 멤버십, 12자리 비밀번호 설정과 첫 정상 로그인 완료
- Auth 반환 주소: `https://emotigom.github.io/nextbridge/admin/`
- Turnstile: widget, 허용 출처, Edge Function secrets 4개, Pages 공개 빌드 값 연결 완료
- 검증: 허용 출처 preflight `204`, 없는 질문 조회 `404`, 가짜 Turnstile 토큰 `TURNSTILE_REJECTED`; 실제 휴대전화에서 정상 접수·비공개 조회·운영진 처리 종단 시험 완료 후 시험 질문 삭제·접수 재잠금
- Cloudflare: `gomdory.com` zone, proxied `go` DNS, `302` Single Redirect 활성; HTTPS·양쪽 경로·쿼리 제거·최종 `200` 확인
- QR: SVG/PNG 생성·해독 검증과 운영자 휴대전화 카메라 스캔 완료
- 알림: Edge Function 코드는 기본값 `none`으로 배포하며, Discord webhook과 Resend 발신 도메인·비밀값을 넣기 전에는 어떤 알림도 전송하지 않음

## 남은 결정과 작업

1. **운영 백업 권장**: 현재 활성 owner 1명으로 운영할 수 있으나 계정·기기 장애에 대비해 두 번째 운영자를 최소 권한으로 추가하는 것을 권장. 추가하지 못하면 행사 중 owner 로그인 기기와 복구 수단을 확보.
2. **최종 인쇄 승인**: 필요한 iOS/Android와 Wi-Fi/모바일 데이터 교차 확인 후 QR을 `active`로 승격.
3. **알림 연결**: 아래 Discord와 Resend 설정을 완료한 뒤, 행사 개방 전 휴대전화로 새 질문·답변 완료 알림을 한 번씩 확인.

고정 주소는 `https://go.gomdory.com/2026-sk`입니다. QR에는 이 주소만 인코딩하고, 실제 목적지는 Cloudflare 리디렉션 규칙으로 관리합니다. QR 상태는 `verified`이며 최종 인쇄 승인 전까지 `active`로 올리지 않습니다.

카카오 일반 메시지는 사용하지 않습니다. 과거 데이터 호환을 위한 공식 알림톡 relay 경계만 남아 있으며, 이번 행사에서는 활성화하지 않습니다. 질문 본문·답변·참가자 연락처를 Discord에 보내지 않고, 참가자 이메일에는 답변 완료 사실·접수번호·상태 확인 주소만 담습니다.

## 알림 설정 (상균님 계정에서 1회)

비밀값은 GitHub, 소스 코드, 채팅에 붙여 넣지 말고 Supabase Dashboard의 **Edge Functions → Secrets**에만 입력합니다.

1. Discord에서 비공개 `Nextbridge 알림` 채널을 만들고, 채널 설정 → 연동 → Webhooks에서 Incoming Webhook을 생성합니다.
2. Resend에 가입해 발신 도메인을 추가합니다. 권장 발신 주소는 `questions@notify.gomdory.com`이며, Resend가 안내하는 DNS 레코드를 Cloudflare에 추가해 도메인을 인증합니다.
3. Resend에서 API key를 만들고, Supabase Secrets에 아래 값을 설정합니다.

| Secret                              | 값                                          |
| ----------------------------------- | ------------------------------------------- |
| `OPERATOR_NOTIFICATION_PROVIDER`    | `discord`                                   |
| `DISCORD_WEBHOOK_URL`               | Discord Incoming Webhook URL                |
| `PARTICIPANT_NOTIFICATION_PROVIDER` | `email`                                     |
| `RESEND_API_KEY`                    | Resend API key                              |
| `RESEND_FROM_EMAIL`                 | `Nextbridge <questions@notify.gomdory.com>` |

4. Secret 저장 뒤, 접수 개방 전 시험 질문 한 건으로 Discord 수신과 답변 완료 이메일을 모두 확인합니다.

## 연결 순서

1. Supabase 프로젝트·migration·Edge Function 배포 — 완료
2. 운영진 Auth 이메일 확인, `owner` 멤버십, 비밀번호 설정과 첫 로그인 — 완료
3. Turnstile widget 생성 후 Edge Function secrets와 허용 origin 연결 — 완료
4. GitHub Pages 체크포인트에 publishable 값만 설정하고 서버 부정 시험·실기기 정상 접수 종단 시험 — 완료
5. 동적 QR SVG/PNG 생성, 해독 검증, Cloudflare `go` DNS·302 Single Redirect 구성 — 완료
6. HTTPS·양쪽 경로·쿼리 제거·최종 응답과 운영자 휴대전화 카메라 스캔 — 완료, QR `verified`
7. 기술 검증 후 프런트를 `ready`로 승격 — 완료. 필요한 교차 기기 검수와 최종 인쇄 승인 후 QR을 `active`로 승격
8. 행사 당일 운영자 로그인 확인 후 `2026-sk.is_active=true`로 백엔드를 준비하고, 이어서 프런트 `published` 배포로 질문 접수 개방
9. Discord·Resend Secrets를 넣고, 새 질문과 답변 완료 알림을 실제 휴대전화로 각각 한 번 검증

## 플랫폼별 비밀값 위치

| 값                                                         | 저장 위치                                         |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`, publishable key, Turnstile site key | GitHub Actions variables 또는 빌드 환경의 공개 값 |
| Supabase secret/service key                                | Supabase Edge Function secrets                    |
| Turnstile secret                                           | Supabase Edge Function secrets                    |
| Discord webhook, Resend API key·발신 주소                  | Supabase Edge Function secrets                    |
| Cloudflare API token                                       | 로컬/배포 자동화 secret, 프런트 번들 금지         |

연결 직전에는 [보안 검토](security.md)의 부정 테스트와 [행사 전 체크리스트](operations.md)를 함께 수행합니다.
