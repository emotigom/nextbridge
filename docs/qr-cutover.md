# QR·도메인 전환 계획

## 주소 원칙

인쇄 QR은 GitHub Pages의 실제 호스팅 주소에 고정하지 않습니다. Cloudflare가 관리하는 짧은 주소를 영구 진입점으로 두고, 현재 배포 위치로 임시 리디렉션합니다. GitHub Pages에서 다른 호스팅으로 옮겨도 QR 이미지를 다시 인쇄하지 않는 구조입니다.

고정 진입점은 다음 주소입니다.

```text
https://go.gomdory.com/2026-sk
```

QR 이미지에는 위 주소만 들어갑니다. 실제 목적지는 Cloudflare 리디렉션 규칙에서 바꾸므로 QR 파일을 다시 만들 필요가 없습니다.

## 현재 상태 (2026-08-28)

- `gomdory.com`은 Cloudflare 네임서버를 사용 중입니다.
- `go.gomdory.com`의 proxied DNS와 `nextbridge-2026-sk` Single Redirect가 활성 상태입니다.
- `/2026-sk`와 `/2026-sk/`는 유효한 HTTPS로 목표 주소에 `302` 이동하고, 쿼리 문자열은 보존하지 않으며, 최종 페이지가 `200`으로 응답함을 확인했습니다.
- QR의 SVG/PNG 원본과 256px 축소본을 다시 해독했고, 운영자 휴대전화 카메라 스캔도 통과했습니다.
- 행사 설정의 QR 상태는 `verified`입니다. 최종 인쇄 승인 전이므로 아직 `active`는 아닙니다.
- 행사 프런트는 질문 접수를 종료한 `archived` 상태입니다. QR 목적지와 정적 안내, 기존 질문의 답변 조회는 유지합니다.

## Cloudflare 연결값

Cloudflare 대시보드의 **Rules → Redirect Rules → Single Redirects**에 다음 규칙이 배포되어 있습니다.

| 항목              | 값                                                                                                                  |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| DNS               | `A go.gomdory.com → 192.0.2.1`, Proxied                                                                             |
| 규칙 이름         | `nextbridge-2026-sk`                                                                                                |
| 일치 방식         | Custom filter expression                                                                                            |
| 표현식            | `(http.host eq "go.gomdory.com" and (http.request.uri.path eq "/2026-sk" or http.request.uri.path eq "/2026-sk/"))` |
| 대상 URL          | `https://emotigom.github.io/nextbridge/`                                                                            |
| 상태 코드         | `302`                                                                                                               |
| Query string 보존 | 끔                                                                                                                  |

`302`를 쓰면 운영 중 목적지를 바꿀 때 브라우저의 영구 리디렉션 캐시 영향을 줄일 수 있습니다. 설정 화면에서 유료 플랜 또는 실제 비용 안내가 나타나면 결제·생성 직전에 중단하고 조건을 확인합니다.

Single Redirect는 대상 상태를 확인하지 않는 고정 리디렉션입니다. 현재 자동 fallback은 구성하지 않았으며, `nextbridge-classroom-kit`의 기존 경로도 같은 GitHub Pages를 사용하므로 제공자 전체 장애를 피하는 가용성 fallback으로 보지 않습니다. Notion으로 이어지는 추가 fallback도 두지 않습니다.

Cloudflare 공식 문서:

- [대시보드에서 Single Redirect 만들기](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/create-dashboard/)
- [Single Redirects 개요와 플랜별 한도](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/)

## 새 QR 승인 게이트

QR은 `verified`까지 승격했습니다. 다음 조건을 모두 마치고 최종 인쇄 승인을 받기 전에는 `active`로 올리거나 인쇄하지 않습니다.

- GitHub Pages 체크포인트가 CI를 통과하고 모든 자산을 `/nextbridge` 아래에서 불러옴
- 일정·서명·협의실 정보 담당자 교차 확인
- Supabase/Turnstile/알림 연결과 권한 우회·스팸 방어 시험
- `go.gomdory.com/2026-sk`가 HTTPS로 정상 응답하고 목표 주소로 이동
- iOS/Android 실제 휴대전화, Wi-Fi/모바일 데이터, 카메라 앱에서 QR 검증
- 360px 화면에서 가로 넘침, 읽기 어려운 글자, 하단 메뉴 겹침이 없음
- 독립 비상 페이지를 별도로 승인한 경우에만 장애 시 리디렉션 목표를 수동 변경할 운영 권한과 절차가 있음

HTTPS 리디렉션과 운영자 실기기 카메라 시험을 통과해 `verified`로 전환했습니다. 남은 교차 기기·질문 정상 접수 점검과 최종 인쇄 승인 후 `active`로 전환합니다.

## 기존 QR 보존 전환

새 사이트가 위 게이트를 통과한 뒤에만 `nextbridge-classroom-kit`에 별도 PR을 만듭니다. 이 경로는 가용성 fallback이 아니라 이미 배포·인쇄된 링크의 호환 경로이며, 한 번에 삭제하지 않습니다.

1. README와 검색·메뉴·`programs/program-03/manifest.json`에서 기존 상세 페이지 노출을 제거합니다.
2. `programs/program-03/guide/`의 상세 콘텐츠 제공을 종료합니다.
3. `go/workshop/index.html`과 기존 guide 진입 주소에는 새 고정 주소로 이동하는 최소 리디렉션만 남깁니다.
4. 이미 인쇄된 구형 QR을 여러 기기로 스캔해 404가 아닌 새 주소로 연결되는지 확인합니다.
5. 접근 현황을 보며 리디렉션을 충분한 기간 유지하고, 새 QR 검증 후 README·운영 문서를 정리합니다.

리디렉션 페이지는 `meta refresh`, 명시적 링크, canonical/noindex를 포함해 JavaScript가 꺼져 있어도 이동 경로를 제공합니다. 구형 QR 경로의 제거 시점은 접근 로그와 행사 운영자가 합의한 뒤 별도 결정합니다.

## 롤백

개별 배포가 실패하면 마지막 정상 GitHub Pages 배포를 유지하고 Pages workflow를 재실행합니다. GitHub Pages 전체 장애에는 자동 전환하지 않습니다. 별도 제공자에 둔 읽기 전용 비상 페이지가 사전에 승인되고 공개·모바일 시험까지 통과한 경우에만 고정 주소의 목적지를 수동 변경하며, 그런 페이지가 없으면 현장 안내를 사용합니다. 구형 QR 경로는 링크 호환을 위해 유지하지만 같은 제공자 장애의 복구 경로로 간주하지 않습니다.
