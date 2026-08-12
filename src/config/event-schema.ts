import { z } from "zod";

export const localizedTextSchema = z.object({
  ko: z.string().min(1),
  en: z.string().min(1).optional()
});

export const scheduleItemSchema = z.object({
  time: z.string().min(1),
  title: localizedTextSchema,
  detail: localizedTextSchema.optional(),
  location: localizedTextSchema.optional(),
  tone: z.enum(["default", "key", "meal", "break"]).default("default")
});

export const eventConfigSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  status: z.enum(["draft", "published", "archived"]),
  year: z.number().int().min(2026),
  title: localizedTextSchema,
  shortTitle: localizedTextSchema,
  description: localizedTextSchema,
  organizer: localizedTextSchema,
  operator: localizedTextSchema,
  dates: z.object({
    start: z.iso.date(),
    end: z.iso.date(),
    display: localizedTextSchema
  }),
  venue: z.object({
    name: localizedTextSchema,
    address: localizedTextSchema,
    phone: z.string().min(1),
    website: z.url(),
    registrationLocation: localizedTextSchema,
    transportNote: localizedTextSchema
  }),
  qr: z.object({
    candidateShortUrl: z.url(),
    status: z.enum(["candidate", "verified", "active"])
  }),
  announcements: z.array(
    z.object({
      id: z.string().min(1),
      publishedAt: z.iso.date(),
      title: localizedTextSchema,
      body: localizedTextSchema,
      important: z.boolean().default(false)
    })
  ),
  signatureDays: z.array(
    z.object({
      date: z.iso.date(),
      label: localizedTextSchema,
      windows: z.array(
        z.object({
          label: localizedTextSchema,
          time: z.string().min(1)
        })
      ),
      requiredCount: z.number().int().positive()
    })
  ),
  schedule: z.array(
    z.object({
      date: z.iso.date(),
      label: localizedTextSchema,
      dayNumber: z.number().int().positive(),
      items: z.array(scheduleItemSchema).min(1)
    })
  ),
  rooms: z.array(
    z.object({
      subject: localizedTextSchema,
      course: localizedTextSchema,
      room: localizedTextSchema,
      floor: localizedTextSchema,
      keywords: z.array(z.string())
    })
  ),
  preparation: z.array(localizedTextSchema),
  faqs: z.array(
    z.object({
      question: localizedTextSchema,
      answer: localizedTextSchema
    })
  ),
  questionCategories: z.array(
    z.object({
      value: z.enum([
        "schedule",
        "signature",
        "room",
        "lodging_meal",
        "transport_parking",
        "submission",
        "other"
      ]),
      label: localizedTextSchema
    })
  )
});

export type LocalizedText = z.infer<typeof localizedTextSchema>;
export type ScheduleItem = z.infer<typeof scheduleItemSchema>;
export type EventConfig = z.infer<typeof eventConfigSchema>;
