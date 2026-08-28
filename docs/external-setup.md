# 외부 연결 체크리스트

Supabase 기반은 실제 프로젝트에 배포했고, Cloudflare 고정 주소와 QR 실기기 검증을 완료했습니다. 운영 기간에는 운영자 Discord와 참가자 이메일 알림을 사용했으며, 현재는 새 질문 접수를 종료하고 기존 답변 조회만 유지합니다.

## 현재 상태

- Supabase 조직: `emotigom's Org` (Free)
- 프로젝트: `nextbridge-prod`, 서울(`ap-northeast-2`), 정상 상태
- 적용 완료: 업무 테이블 6개, 전체 RLS 강제, 브라우저 역할 직접 권한 철회, Edge Function 3개
- 종료 상태: `2026-sk` 행사 `is_active = false`, 프런트 설정 `status: archived`, QR 상태 `verified`
- 운영진: 승인된 owner 이메일 확인, 활성 `owner` 멤버십, 12자리 비밀번호 설정과 첫 정상 로그인 완료
- Auth 반환 주소: `https://emotigom.github.io/nextbridge/admin/`
- Turnstile: widget, 허용 출처, Edge Function secrets 4개, Pages 공개 빌드 값 연결 완료
- 검증: 허용 출처 preflight `204`, 없는 질문 조회 `404`, 가짜 Turnstile 토큰 `TURNSTILE_REJECTED`; 실제 휴대전화 접수·비공개 조회·운영진 처리·참가자 이메일 종단 시험 완료, 종료 후 기존 기록 보존과 답변 조회 확인
- Cloudflare: `gomdory.com` zone, proxied `go` DNS, `302` Single Redirect 활성; HTTPS·양쪽 경로·쿼리 제거·최종 `200` 확인
- QR: SVG/PNG 생성·해독 검증과 운영자 휴대전화 카메라 스캔 완료
- 알림: 운영자 Discord와 참가자 Resend 이메일 연결 및 실제 발송 확인 완료

## 종료 후 유지 사항

1. 기존 접수번호와 비공개 링크의 답변 조회는 보존 기간을 결정할 때까지 유지합니다.
2. 보존 기간이 끝나면 질문·연락처 내보내기 또는 삭제 범위를 별도로 검토합니다.
3. 새 질문 접수를 다시 열 때만 데이터베이스와 프런트의 두 안전 게이트를 함께 활성화합니다.

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
7. 기술 검증 후 프런트를 `ready`로 승격 — 완료
8. 운영자 로그인 확인 후 백엔드와 프런트의 두 안전 게이트로 질문 접수 개방 — 완료
9. Discord·Resend 알림 실기기 검증 — 완료
10. 질문 접수 종료, 프런트 `archived`·데이터베이스 `is_active=false` 전환과 기존 답변 조회 확인 — 완료

## 플랫폼별 비밀값 위치

| 값                                                         | 저장 위치                                         |
| ---------------------------------------------------------- | ------------------------------------------------- |
| `PUBLIC_SUPABASE_URL`, publishable key, Turnstile site key | GitHub Actions variables 또는 빌드 환경의 공개 값 |
| Supabase secret/service key                                | Supabase Edge Function secrets                    |
| Turnstile secret                                           | Supabase Edge Function secrets                    |
| Discord webhook, Resend API key·발신 주소                  | Supabase Edge Function secrets                    |
| Cloudflare API token                                       | 로컬/배포 자동화 secret, 프런트 번들 금지         |

연결 직전에는 [보안 검토](security.md)의 부정 테스트와 [행사 전 체크리스트](operations.md)를 함께 수행합니다.
