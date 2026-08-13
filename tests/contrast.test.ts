import { describe, expect, it } from "vitest";

function channel(value: number): number {
  const normalized = value / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : Math.pow((normalized + 0.055) / 1.055, 2.4);
}

function luminance(hex: string): number {
  const value = hex.replace("#", "");
  const [red, green, blue] = [0, 2, 4].map((offset) =>
    Number.parseInt(value.slice(offset, offset + 2), 16)
  );
  return 0.2126 * channel(red ?? 0) + 0.7152 * channel(green ?? 0) + 0.0722 * channel(blue ?? 0);
}

function contrast(foreground: string, background: string): number {
  const first = luminance(foreground);
  const second = luminance(background);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

describe("event artwork-derived design tokens", () => {
  it.each([
    ["#0C1212", "#FDFEFE"],
    ["#415C5A", "#FDFEFE"],
    ["#0C4B96", "#FDFEFE"],
    ["#0B817A", "#FDFEFE"],
    ["#FDFEFE", "#064F4B"],
    ["#C8E5DF", "#064F4B"],
    ["#415C5A", "#E7F4F1"],
    ["#FDFEFE", "#0B817A"]
  ])("keeps %s on %s at WCAG AA contrast", (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5);
  });
});
