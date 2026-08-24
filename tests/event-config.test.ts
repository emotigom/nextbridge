import { describe, expect, it } from "vitest";
import { eventConfigSchema } from "../src/config/event-schema";
import { event2026Sk } from "../src/config/events/2026-sk";

describe("2026-sk event configuration", () => {
  it("matches the reusable event schema", () => {
    expect(eventConfigSchema.safeParse(event2026Sk).success).toBe(true);
    expect(event2026Sk.receiptPrefix).toBe("SK26");
  });

  it("keeps the official venue name separate from the map search name", () => {
    expect(event2026Sk.venue.name.ko).toBe("KG써닝리더십센터");
    expect(event2026Sk.venue.navigationName?.ko).toBe("써닝리더십센터");
  });

  it("contains all three days and the confirmed signature windows", () => {
    expect(event2026Sk.schedule).toHaveLength(3);
    expect(event2026Sk.signatureDays.map((day) => day.requiredCount)).toEqual([1, 2, 2]);
    expect(event2026Sk.signatureDays[1]?.windows.map((window) => window.time)).toEqual([
      "09:00~12:00",
      "13:00~22:00"
    ]);
    expect(event2026Sk.signatureDays[2]?.windows.map((window) => window.time)).toEqual([
      "09:00~12:00",
      "13:00~17:00"
    ]);
  });

  it("keeps subject labels unique while allowing shared rooms", () => {
    const subjects = event2026Sk.rooms.map((room) => room.subject.ko);
    expect(new Set(subjects).size).toBe(subjects.length);
    expect(subjects).toContain("그래픽·삽화");
    expect(subjects).toContain("정보");
  });

  it("marks the event ready while keeping the short-domain QR at its verified gate", () => {
    expect(event2026Sk.status).toBe("ready");
    expect(event2026Sk.qr.candidateShortUrl).toBe("https://go.gomdory.com/2026-sk");
    expect(event2026Sk.qr.status).toBe("verified");
  });
});
