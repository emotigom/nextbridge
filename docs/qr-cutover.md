# QR·도메인 전환 계획

## 주소 원칙

인쇄 QR은 GitHub Pages의 실제 호스팅 주소에 고정하지 않습니다. Cloudflare가 관리하는 짧은 주소를 영구 진입점으로 두고, 현재 배포 위치로 임시 리디렉션합니다. GitHub Pages에서 다른 호스팅으로 옮겨도 QR 이미지를 다시 인쇄하지 않는 구조입니다.

고정 진입점은 다음 주소입니다.

```text
https://go.gomdory.com/2026-sk
```

QR 이미지에는 위 주소만 들어갑니다. 실제 목적지는 Cloudflare 리디렉션 규칙에서 바꾸므로 QR 파일을 다시 만들 필요가 없습니다.

## 현재 상태 (2026-08-13)

- `gomdory.com`은 Cloudflare 네임서버를 사용 중입니다.
- `go.gomdory.com` DNS와 리디렉션 규칙은 아직 구성하지 않았습니다.
- 후보 QR의 SVG/PNG를 생성했고 원본과 256px 축소본을 다시 해독해 주소가 일치함을 확인했습니다.
- 행사 설정의 QR 상태는 `candidate`로 유지합니다. 후보 파일은 검수용이며 아직 인쇄 승인본이 아닙니다.

## Cloudflare 연결값

Cloudflare 대시보드의 **Rules → Redirect Rules → Single Redirects**에서 다음 규칙을 만듭니다. 규칙 생성 중 `go` 호스트의 proxied DNS 레코드 생성 안내가 나오면 승인합니다.

| 항목              | 값                                                                                      |
| ----------------- | --------------------------------------------------------------------------------------- |
| 규칙 이름         | `nextbridge-2026-sk`                                                                    |
| 일치 방식         | Custom filter expression                                                                |
| 표현식            | `(http.host eq "go.gomdory.com" and http.request.uri.path in {"/2026-sk" "/2026-sk/"})` |
| 대상 URL          | `https://emotigom.github.io/nextbridge/`                                                |
| 상태 코드         | `302`                                                                                   |
| Query string 보존 | 끔                                                                                      |

`302`를 쓰면 운영 중 목적지를 바꿀 때 브라우저의 영구 리디렉션 캐시 영향을 줄일 수 있습니다. 설정 화면에서 유료 플랜 또는 실제 비용 안내가 나타나면 결제·생성 직전에 중단하고 조건을 확인합니다.

Cloudflare 공식 문서:

- [대시보드에서 Single Redirect 만들기](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/)
- [Single Redirects 개요와 플랜별 한도](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/)

## 새 QR 승인 게이트

후보 QR 파일은 만들 수 있지만, 다음 조건이 모두 충족되기 전에는 인쇄하거나 행사 설정을 `verified`/`active`로 올리지 않습니다.

- GitHub Pages 체크포인트가 CI를 통과하고 모든 자산을 `/nextbridge` 아래에서 불러옴
- 일정·서명·협의실 정보 담당자 교차 확인
- Supabase/Turnstile/알림 연결과 권한 우회·스팸 방어 시험
- `go.gomdory.com/2026-sk`가 HTTPS로 정상 응답하고 목표 주소로 이동
- iOS/Android 실제 휴대전화, Wi-Fi/모바일 데이터, 카메라 앱에서 QR 검증
- 360px 화면에서 가로 넘침, 읽기 어려운 글자, 하단 메뉴 겹침이 없음
- 장애 시 리디렉션 목표를 예비 주소로 바꿀 운영 권한과 절차가 있음

HTTPS 리디렉션과 실기기 시험을 통과하면 `verified`, 최종 인쇄 승인 후 `active`로 전환합니다.

## 기존 QR 보존 전환

새 사이트가 위 게이트를 통과한 뒤에만 `nextbridge-classroom-kit`에 별도 PR을 만듭니다. 한 번에 기존 경로를 삭제하지 않습니다.

1. README와 검색·메뉴·`programs/program-03/manifest.json`에서 기존 상세 페이지 노출을 제거합니다.
2. `programs/program-03/guide/`의 상세 콘텐츠 제공을 종료합니다.
3. `go/workshop/index.html`과 기존 guide 진입 주소에는 새 고정 주소로 이동하는 최소 리디렉션만 남깁니다.
4. 이미 인쇄된 구형 QR을 여러 기기로 스캔해 404가 아닌 새 주소로 연결되는지 확인합니다.
5. 접근 현황을 보며 리디렉션을 충분한 기간 유지하고, 새 QR 검증 후 README·운영 문서를 정리합니다.

리디렉션 페이지는 `meta refresh`, 명시적 링크, canonical/noindex를 포함해 JavaScript가 꺼져 있어도 이동 경로를 제공합니다. 구형 QR 경로의 제거 시점은 접근 로그와 행사 운영자가 합의한 뒤 별도 결정합니다.

## 롤백

새 서비스에 문제가 생기면 고정 주소의 리디렉션 목표만 이전의 검증된 안내 페이지나 읽기 전용 비상 페이지로 바꿉니다. 구형 경로를 미리 삭제하지 않으므로 인쇄된 구형 QR도 복구 경로를 유지합니다.
