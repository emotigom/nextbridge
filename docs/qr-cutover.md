# QR·도메인 전환 계획

## 주소 원칙

인쇄 QR은 GitHub Pages의 실제 호스팅 주소에 고정하지 않습니다. Cloudflare가 관리하는 짧은 주소를 영구 진입점으로 두고, 현재 배포 위치로 301/302 리디렉션합니다. GitHub Pages에서 Cloudflare Pages 등으로 옮겨도 인쇄 QR을 바꾸지 않는 구조입니다.

사용자가 보유한 두 도메인은 `gomdory.com`, `gkrry.com`입니다. 브랜드 연상과 구두 전달성이 더 높은 1차 후보는 다음 주소입니다.

```text
https://go.gomdory.com/2026-sk
```

이 주소를 고정 진입점으로 선택했지만 아직 행사 설정은 `candidate`입니다. DNS 레코드, redirect rule, 인증서, QR 이미지는 만들지 않았습니다. 종단 간 검증이 끝날 때까지 `verified` 또는 `active`로 올리지 않습니다.

## 새 QR 승인 게이트

다음 조건이 모두 충족되기 전에는 QR을 생성·인쇄하지 않습니다.

- GitHub Pages 체크포인트가 CI를 통과하고 모든 자산을 `/nextbridge` 아래에서 불러옴
- 일정·서명·협의실 정보 담당자 교차 확인
- Supabase/Turnstile/알림 연결과 권한 우회·스팸 방어 시험
- `go.gomdory.com/2026-sk`가 HTTPS로 정상 응답하고 목표 주소를 유지
- iOS/Android 실제 휴대전화, Wi-Fi/모바일 데이터, 카메라 앱에서 QR 검증
- 360px 화면에서 가로 넘침, 읽기 어려운 글자, 하단 메뉴 겹침이 없음
- 장애 시 redirect 목표를 예비 주소로 바꿀 운영 권한과 절차가 있음

## 기존 QR 보존 전환

새 사이트가 배포되고 위 게이트를 통과한 뒤 `nextbridge-classroom-kit`에 별도 PR을 만듭니다. 한 번에 기존 경로를 삭제하지 않습니다.

1. README와 검색·메뉴·`programs/program-03/manifest.json`에서 기존 상세 페이지 노출을 제거합니다.
2. `programs/program-03/guide/`의 상세 콘텐츠 제공을 종료합니다.
3. `go/workshop/index.html`과 기존 guide 진입 주소에는 새 고정 주소로 이동하는 최소 리디렉션만 남깁니다.
4. 이미 인쇄된 구형 QR을 여러 기기로 스캔해 404가 아닌 새 주소로 연결되는지 확인합니다.
5. 접근 현황을 보며 리디렉션을 충분한 기간 유지하고, 새 QR 검증 후 README·운영 문서를 정리합니다.

리디렉션 페이지는 `meta refresh`, 명시적 링크, canonical/noindex를 포함해 JavaScript가 꺼져 있어도 이동 경로를 제공합니다. 구형 QR 경로의 제거 시점은 접근 로그와 행사 운영자가 합의한 뒤 별도 결정합니다.

## 롤백

새 서비스에 문제가 생기면 고정 주소의 redirect 목표만 이전의 검증된 안내 페이지나 읽기 전용 비상 페이지로 바꿉니다. 구형 경로를 미리 삭제하지 않으므로 인쇄된 구형 QR도 복구 경로를 유지합니다.
