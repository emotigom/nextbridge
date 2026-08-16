export type NavigationIconName =
  | "house"
  | "calendar-days"
  | "users-round"
  | "map-pin"
  | "message-circle-question-mark";

export const siteNavigation = [
  {
    href: "/",
    label: "홈",
    desktopLabel: "홈",
    icon: "house"
  },
  {
    href: "/schedule/",
    label: "일정",
    desktopLabel: "전체 일정",
    icon: "calendar-days"
  },
  {
    href: "/rooms/",
    label: "협의실",
    desktopLabel: "협의실",
    icon: "users-round"
  },
  {
    href: "/visit/",
    label: "오시는 길",
    desktopLabel: "오시는 길",
    icon: "map-pin"
  },
  {
    href: "/questions/",
    label: "질문",
    desktopLabel: "질문하기",
    icon: "message-circle-question-mark"
  }
] as const satisfies ReadonlyArray<{
  href: string;
  label: string;
  desktopLabel: string;
  icon: NavigationIconName;
}>;
