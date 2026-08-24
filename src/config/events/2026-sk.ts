import { eventConfigSchema } from "@/config/event-schema";
import { eventContent2026Sk } from "@/content/events/2026-sk";

export const event2026Sk = eventConfigSchema.parse({
  slug: "2026-sk",
  status: "ready",
  year: 2026,
  receiptPrefix: "SK26",
  title: { ko: "경기 성취평가 표준화 평가도구 개발 합숙 워크숍" },
  shortTitle: { ko: "2026 경기 성취평가" },
  description: {
    ko: "2026 경기 성취평가 표준화 평가도구 개발 합숙 워크숍"
  },
  organizer: { ko: "경기도교육청 중등교육과" },
  operator: { ko: "Nextbridge" },
  dates: {
    start: "2026-08-28",
    end: "2026-08-30",
    display: { ko: "2026. 8. 28.(금) 16:00~8. 30.(일) 17:00" }
  },
  venue: {
    name: { ko: "KG써닝리더십센터" },
    navigationName: { ko: "써닝리더십센터" },
    address: { ko: "경기도 용인시 처인구 백암면 고안로51번길 205" },
    phone: "031-329-0705",
    website: "https://www.sunningleader.co.kr/",
    registrationLocation: { ko: "교육관 2층 대강의실" },
    transportNote: {
      ko: "대중교통 배차 간격 및 센터 내 타 행사 운영으로 과목별 카풀 이용 권장"
    }
  },
  qr: {
    candidateShortUrl: "https://go.gomdory.com/2026-sk",
    status: "verified"
  },
  ...eventContent2026Sk
});
