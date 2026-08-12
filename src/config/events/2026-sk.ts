import { eventConfigSchema } from "@/config/event-schema";
import { eventContent2026Sk } from "@/content/events/2026-sk";

export const event2026Sk = eventConfigSchema.parse({
  slug: "2026-sk",
  status: "draft",
  year: 2026,
  title: { ko: "경기 성취평가 표준화 평가도구 개발 합숙 워크숍" },
  shortTitle: { ko: "2026 합숙 워크숍" },
  description: {
    ko: "일정, 등록부 서명, 협의실, 이동 정보와 현장 질문을 한곳에서 확인하세요."
  },
  organizer: { ko: "경기도교육청" },
  operator: { ko: "Nextbridge" },
  dates: {
    start: "2026-08-28",
    end: "2026-08-30",
    display: { ko: "2026. 8. 28.(금)-8. 30.(일)" }
  },
  venue: {
    name: { ko: "KG써닝리더십센터" },
    address: { ko: "경기도 용인시 처인구 백암면 고안로51번길 205" },
    phone: "031-329-0705",
    website: "https://www.sunningleader.co.kr/",
    registrationLocation: { ko: "교육관 2층 대강의실" },
    transportNote: {
      ko: "대중교통 배차 간격을 고려해 과목별 카풀 이용을 권장합니다."
    }
  },
  qr: {
    candidateShortUrl: "https://go.gomdory.com/2026-sk",
    status: "candidate"
  },
  ...eventContent2026Sk
});
