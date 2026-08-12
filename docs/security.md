# 보안 모델

## 핵심 원칙

- 공개 저장소와 브라우저에는 Supabase publishable key만 허용합니다.
- `service_role`/secret key, Turnstile secret, Webhook, 카카오 relay token과 수신 대상은 Edge Function 또는 플랫폼 Secrets에만 둡니다.
- 공개 스키마의 모든 업무 테이블은 RLS를 활성화·강제하고 `anon`, `authenticated`의 직접 테이블 권한을 철회합니다.
- 참가자와 운영진 모두 Edge Function을 통해서만 질문 데이터에 접근합니다.
- 학생·학교·강사의 불필요한 개인정보를 수집하지 않으며 자유 텍스트에 민감정보를 적지 말라는 확인을 필수로 받습니다.

## 데이터 접근 경계

`events`, `event_operator_memberships`, `event_questions`, `question_status_events`, `question_notification_deliveries`, `question_rate_limits`에 RLS와 `FORCE ROW LEVEL SECURITY`를 적용합니다. 공개 정책은 만들지 않았고 service role에 필요한 권한만 명시적으로 부여했습니다.

운영진 역할은 사용자가 편집할 수 있는 metadata가 아니라 `event_operator_memberships` 테이블에 저장합니다. `admin-questions`는 전달된 Supabase Auth access token으로 사용자를 다시 확인하고 활성 멤버십의 `owner`, `operator`, `viewer` 역할을 검사합니다. `viewer`는 상태나 답변을 수정할 수 없습니다.

질문 원문·연락처·비공개 토큰은 공개 Realtime publication에 넣지 않습니다. 상태 조회 응답은 접수번호, 유형, 상태, 답변, 타임스탬프만 반환하고 질문 원문과 연락처는 반환하지 않습니다.

## 익명 질문 방어

| 방어      | 구현                                                                                    |
| --------- | --------------------------------------------------------------------------------------- |
| 본문 크기 | JSON body 최대 16 KiB                                                                   |
| 형식·길이 | 공유 Zod 스키마로 유형, 질문 10–1,000자, 선택 연락처를 서버 검증                        |
| 출처      | `ALLOWED_ORIGINS` allowlist와 제한된 CORS                                               |
| 자동화    | Turnstile Siteverify 서버 호출 필수                                                     |
| 토큰 검증 | `success`, `action=submit-question`, 예상 hostname, 단일 사용/만료를 공급자 검증에 위임 |
| 속도 제한 | IP 파생 키+비밀 salt로 제출 10분당 6회, 조회 10분당 24회                                |
| 원자성    | `check_question_rate_limit` 보안 정의 함수가 경합 없이 카운트 갱신                      |
| 열거 방지 | 고엔트로피 접수번호와 비공개 토큰, 동일한 실패 메시지                                   |
| 토큰 저장 | 비공개 토큰 원문 대신 SHA-256 해시 저장                                                 |

비공개 확인 링크는 토큰을 query string이 아닌 URL fragment에 넣습니다. 정적 호스트, 프록시, Referer 로그에 토큰이 자동 전송되지 않으며 상태 화면이 fragment를 메모리로 읽은 뒤 주소 표시줄에서 제거합니다.

## 알림 최소화

운영진 알림에는 행사 slug, 접수번호, 질문 유형, 접수 시각만 포함합니다. 질문 원문과 연락처는 Slack/Discord/카카오 메시지에 싣지 않고 인증된 운영진 화면에서만 봅니다. 참가자 완료 알림은 선택한 연락 방법이 있을 때만 최소 템플릿으로 보냅니다.

카카오 알림은 브라우저가 아닌 인증된 서버 relay 또는 알림톡 공급자를 통해 전송합니다. relay URL, token, 수신자 목록은 모두 Secret입니다.

## 비밀정보·로그·보존

- `.env.example`에는 빈 변수명만 커밋하고 실제 값은 Supabase/Cloudflare/GitHub Secrets에 저장합니다.
- CI 보안 스캔은 GitHub PAT, Supabase secret/service key, Webhook URL, private key 형태가 `src`, `public`, `supabase`, `docs`, workflow, `dist`에 섞였는지 검사합니다.
- 함수 로그에 request body, 연락처, Turnstile token, Auth token을 기록하지 않습니다.
- 운영 확정 시 질문·연락처 보존 기간과 삭제 작업을 정합니다. 권장 기본값은 행사 종료 후 30일 내 연락처 제거, 업무상 필요한 비식별 상태 기록만 별도 보존입니다.

## 연결 전 보안 검토

1. migration을 새 Supabase 프로젝트에 적용하고 RLS/권한 철회를 확인합니다.
2. anon/publishable key로 테이블 `select`, `insert`, `update`가 모두 실패하는지 확인합니다.
3. 운영진이 아닌 Auth 사용자가 `admin-questions`에서 403을 받는지 확인합니다.
4. 다른 질문의 접수번호/토큰 추측, 만료 Turnstile, 잘못된 action/hostname, 허용되지 않은 origin을 시험합니다.
5. 완료 알림과 운영진 알림에 원문·연락처가 노출되지 않는지 공급자 로그까지 확인합니다.
