import type { EventConfig } from "@/config/event-schema";

type EventContent = Pick<
  EventConfig,
  | "announcements"
  | "signatureDays"
  | "schedule"
  | "rooms"
  | "preparation"
  | "faqs"
  | "questionCategories"
>;

export const eventContent2026Sk: EventContent = {
  announcements: [
    {
      id: "room-change-priority",
      publishedAt: "2026-08-12",
      title: { ko: "협의실 변경 시 현장 안내를 따라 주세요." },
      body: {
        ko: "현장 운영진이 안내한 장소를 우선해 주세요."
      },
      important: true
    }
  ],
  signatureDays: [
    {
      date: "2026-08-28",
      label: { ko: "8.28.(금)" },
      windows: [{ label: { ko: "서명 가능" }, time: "16:00-22:00" }],
      requiredCount: 1
    },
    {
      date: "2026-08-29",
      label: { ko: "8.29.(토)" },
      windows: [
        { label: { ko: "오전" }, time: "09:00-12:00" },
        { label: { ko: "오후" }, time: "13:00-22:00" }
      ],
      requiredCount: 2
    },
    {
      date: "2026-08-30",
      label: { ko: "8.30.(일)" },
      windows: [
        { label: { ko: "오전" }, time: "09:00-12:00" },
        { label: { ko: "오후" }, time: "13:00-17:00" }
      ],
      requiredCount: 2
    }
  ],
  schedule: [
    {
      date: "2026-08-28",
      label: { ko: "8.28.(금) · 1일차" },
      dayNumber: 1,
      items: [
        {
          time: "15:30-16:00",
          title: { ko: "등록 및 자료 배부" },
          location: { ko: "교육관 2층 대강의실" },
          tone: "key"
        },
        {
          time: "16:00-16:40",
          title: { ko: "인사 말씀 · 워크숍 일정 안내" },
          location: { ko: "교육관 2층 대강의실" },
          tone: "default"
        },
        {
          time: "16:40-17:30",
          title: { ko: "성취평가 표준화 평가도구 안내" },
          detail: { ko: "‘표준화’ 의미 공유 및 검토 유의사항 · 안산강서고 교사 정은식" },
          location: { ko: "교육관 2층 대강의실" },
          tone: "default"
        },
        {
          time: "17:30-18:00",
          title: { ko: "숙소 확인 및 방 배정" },
          location: { ko: "교육관 2층 대강의실" },
          tone: "default"
        },
        {
          time: "18:00-19:00",
          title: { ko: "저녁 식사" },
          location: { ko: "식당" },
          tone: "meal"
        },
        {
          time: "19:00-21:00",
          title: { ko: "과목별 작업" },
          detail: { ko: "출제·선제·검토 및 삽화·그래픽 작업 논의" },
          location: { ko: "과목별 협의실" },
          tone: "key"
        },
        {
          time: "21:00-",
          title: { ko: "개인별 작업 및 정리" },
          tone: "default"
        }
      ]
    },
    {
      date: "2026-08-29",
      label: { ko: "8.29.(토) · 2일차" },
      dayNumber: 2,
      items: [
        {
          time: "08:00-09:00",
          title: { ko: "아침 식사" },
          location: { ko: "식당" },
          tone: "meal"
        },
        {
          time: "09:00-12:00",
          title: { ko: "과목별 협의" },
          detail: { ko: "10:00-10:30 교과 팀장 및 대표 교사 협의" },
          location: { ko: "과목별 협의실 / 교육관 2층 대강의실" },
          tone: "key"
        },
        {
          time: "12:00-13:00",
          title: { ko: "점심 식사" },
          location: { ko: "식당" },
          tone: "meal"
        },
        {
          time: "13:00-15:40",
          title: { ko: "과목별 작업" },
          detail: { ko: "출제·선제·검토 및 삽화·그래픽 작업" },
          location: { ko: "과목별 협의실" },
          tone: "default"
        },
        {
          time: "15:40-16:00",
          title: { ko: "휴식" },
          tone: "break"
        },
        {
          time: "16:00-18:00",
          title: { ko: "과목별 개별 작업" },
          location: { ko: "과목별 협의실" },
          tone: "default"
        },
        {
          time: "18:00-19:00",
          title: { ko: "저녁 식사" },
          location: { ko: "식당" },
          tone: "meal"
        },
        {
          time: "19:00-20:00",
          title: { ko: "과목별 작업" },
          detail: { ko: "19:00-19:30 교과 팀장 협의 · 삽화 및 그래픽 작업" },
          location: { ko: "과목별 협의실 / 교육관 2층 대강의실" },
          tone: "key"
        },
        {
          time: "20:00-",
          title: { ko: "개인별 작업 및 정리" },
          tone: "default"
        }
      ]
    },
    {
      date: "2026-08-30",
      label: { ko: "8.30.(일) · 3일차" },
      dayNumber: 3,
      items: [
        {
          time: "08:00-09:00",
          title: { ko: "아침 식사" },
          location: { ko: "식당" },
          tone: "meal"
        },
        {
          time: "09:00-12:00",
          title: { ko: "과목별 작업" },
          detail: { ko: "출제·선제·검토 및 삽화·그래픽 작업" },
          location: { ko: "과목별 협의실" },
          tone: "default"
        },
        {
          time: "12:00-13:00",
          title: { ko: "점심 식사" },
          location: { ko: "식당" },
          tone: "meal"
        },
        {
          time: "13:00-16:30",
          title: { ko: "과목별 작업 · 최종 문항 제출" },
          detail: { ko: "삽화 및 그래픽 작업 포함" },
          location: { ko: "과목별 협의실" },
          tone: "key"
        },
        {
          time: "16:30-17:00",
          title: { ko: "정리 및 퇴소" },
          tone: "default"
        }
      ]
    }
  ],
  rooms: [
    {
      subject: { ko: "총론" },
      course: { ko: "-" },
      room: { ko: "1강의실" },
      floor: { ko: "2층" },
      keywords: ["총론", "overview"]
    },
    {
      subject: { ko: "국어" },
      course: { ko: "문학" },
      room: { ko: "2강의실" },
      floor: { ko: "3층" },
      keywords: ["국어", "문학", "korean"]
    },
    {
      subject: { ko: "수학" },
      course: { ko: "대수" },
      room: { ko: "3강의실" },
      floor: { ko: "3층" },
      keywords: ["수학", "대수", "math"]
    },
    {
      subject: { ko: "영어" },
      course: { ko: "영어Ⅰ" },
      room: { ko: "6세미나실" },
      floor: { ko: "3층" },
      keywords: ["영어", "영어1", "english"]
    },
    {
      subject: { ko: "사회" },
      course: { ko: "윤리문제 탐구 외 2과목" },
      room: { ko: "2세미나실" },
      floor: { ko: "2층" },
      keywords: ["사회", "윤리", "금융", "경제", "기후변화", "social"]
    },
    {
      subject: { ko: "역사" },
      course: { ko: "역사로 탐구하는 현대 세계" },
      room: { ko: "2세미나실 진행실" },
      floor: { ko: "2층" },
      keywords: ["역사", "현대 세계", "history"]
    },
    {
      subject: { ko: "과학" },
      course: { ko: "과학의 역사와 문화 외 2과목" },
      room: { ko: "1세미나실" },
      floor: { ko: "1층" },
      keywords: ["과학", "기후변화", "환경생태", "융합과학", "science"]
    },
    {
      subject: { ko: "체육" },
      course: { ko: "스포츠 생활 1·2" },
      room: { ko: "1세미나실 진행실" },
      floor: { ko: "1층" },
      keywords: ["체육", "스포츠", "physical education"]
    },
    {
      subject: { ko: "음악" },
      course: { ko: "음악과 미디어" },
      room: { ko: "5세미나실" },
      floor: { ko: "3층" },
      keywords: ["음악", "미디어", "music"]
    },
    {
      subject: { ko: "미술" },
      course: { ko: "미술과 매체" },
      room: { ko: "5세미나실" },
      floor: { ko: "3층" },
      keywords: ["미술", "매체", "art"]
    },
    {
      subject: { ko: "기술·가정" },
      course: { ko: "창의공학 설계 외 1과목" },
      room: { ko: "3세미나실" },
      floor: { ko: "2층" },
      keywords: ["기술", "가정", "창의공학", "아동발달"]
    },
    {
      subject: { ko: "정보" },
      course: { ko: "소프트웨어와 생활" },
      room: { ko: "3세미나실" },
      floor: { ko: "2층" },
      keywords: ["정보", "소프트웨어", "information"]
    },
    {
      subject: { ko: "중국어" },
      course: { ko: "중국 문화" },
      room: { ko: "4세미나실" },
      floor: { ko: "2층" },
      keywords: ["중국어", "중국 문화", "chinese"]
    },
    {
      subject: { ko: "일본어" },
      course: { ko: "일본 문화" },
      room: { ko: "4세미나실" },
      floor: { ko: "2층" },
      keywords: ["일본어", "일본 문화", "japanese"]
    },
    {
      subject: { ko: "한문" },
      course: { ko: "언어생활과 한자" },
      room: { ko: "3강의실 진행실" },
      floor: { ko: "3층" },
      keywords: ["한문", "한자", "언어생활"]
    },
    {
      subject: { ko: "그래픽·삽화" },
      course: { ko: "-" },
      room: { ko: "대강의실" },
      floor: { ko: "2층" },
      keywords: ["그래픽", "삽화", "illustration"]
    }
  ],
  preparation: [
    { ko: "명찰을 행사 기간 동안 착용해 주세요." },
    { ko: "노트북·충전기와 작업 자료를 준비해 주세요." },
    { ko: "8월 29일과 30일은 오전·오후 서명을 각각 확인해 주세요." },
    { ko: "방문 전 내 교과 협의실 위치를 확인해 주세요." },
    { ko: "8월 30일 최종 문항 제출 전 파일을 점검해 주세요." }
  ],
  faqs: [
    {
      question: { ko: "등록부에는 하루에 몇 번 서명하나요?" },
      answer: {
        ko: "8월 28일은 1회, 8월 29일과 30일은 오전·오후 각각 1회씩 하루 2회입니다. 본인이 참석한 시간대에 직접 서명해 주세요."
      }
    },
    {
      question: { ko: "협의실이 페이지와 다르면 어떻게 하나요?" },
      answer: {
        ko: "현장 운영진이 안내한 최신 장소를 우선해 주세요."
      }
    },
    {
      question: { ko: "숙소와 방 배정은 언제 확인하나요?" },
      answer: {
        ko: "8월 28일 17:30부터 교육관 2층 대강의실에서 숙소 확인과 방 배정을 진행합니다."
      }
    },
    {
      question: { ko: "무엇을 준비해야 하나요?" },
      answer: {
        ko: "명찰, 노트북, 충전기와 개인 작업 자료를 준비해 주세요. 최종 제출에 필요한 파일도 미리 확인해 주세요."
      }
    },
    {
      question: { ko: "질문에 개인정보를 적어도 되나요?" },
      answer: {
        ko: "학생·학교·강사의 민감정보는 입력하지 마세요. 회신이 필요한 경우 최소한의 연락 방법만 선택적으로 남겨 주세요."
      }
    }
  ],
  questionCategories: [
    { value: "schedule", label: { ko: "일정" } },
    { value: "signature", label: { ko: "등록부·서명" } },
    { value: "room", label: { ko: "협의실" } },
    { value: "lodging_meal", label: { ko: "숙소·식사" } },
    { value: "transport_parking", label: { ko: "이동·주차" } },
    { value: "submission", label: { ko: "자료 제출" } },
    { value: "other", label: { ko: "기타" } }
  ]
};
