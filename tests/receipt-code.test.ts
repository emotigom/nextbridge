import { describe, expect, it } from "vitest";
import { randomReceiptCode } from "../supabase/functions/_shared/crypto";
import { statusLookupSchema } from "../supabase/functions/_shared/question-schema";

describe("event-specific receipt codes", () => {
  it("uses the configured event prefix without weakening receipt entropy", () => {
    const receipt = randomReceiptCode("NEXT26");
    expect(receipt).toMatch(/^NEXT26-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
    expect(() => randomReceiptCode("invalid-prefix")).toThrow("INVALID_RECEIPT_PREFIX");
  });

  it("accepts a reusable prefix while keeping the event slug in the lookup", () => {
    expect(
      statusLookupSchema.safeParse({
        eventSlug: "future-event",
        receiptCode: "NEXT26-ABCD-EFGH-JKLM"
      }).success
    ).toBe(true);
  });
});
