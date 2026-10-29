import { describe, expect, it } from "vitest";
import {
  formatDate,
  formatDateTime,
  formatMoney,
  formatOrderNumber,
  formatPurchaseNumber,
  percentOf,
  slugify,
} from "../src/format";

describe("formatMoney", () => {
  it("renders cents as a currency amount", () => {
    expect(formatMoney(1250)).toBe("€12.50");
  });

  it("renders zero", () => {
    expect(formatMoney(0)).toBe("€0.00");
  });
});

describe("formatDate", () => {
  it("returns a dash for a missing date", () => {
    expect(formatDate(null)).toBe("—");
  });

  it("formats an ISO date", () => {
    expect(formatDate("2026-03-04T10:00:00.000Z")).toContain("2026");
  });
});

describe("formatDateTime", () => {
  it("returns a dash for a missing date", () => {
    expect(formatDateTime(undefined)).toBe("—");
  });
});

describe("slugify", () => {
  it("lowercases and joins words with hyphens", () => {
    expect(slugify("Wooden Train Set")).toBe("wooden-train-set");
  });

  it("drops punctuation", () => {
    expect(slugify("Plush Bear (Large)!")).toBe("plush-bear-large");
  });

  it("keeps accented letters readable", () => {
    expect(slugify("Café Toy")).toBe("cafe-toy");
  });
});

describe("order and purchase numbers", () => {
  it("formats an order number with a padded sequence", () => {
    expect(formatOrderNumber(2026, 7)).toBe("KT-2026-0007");
  });

  it("formats a purchase number with a padded sequence", () => {
    expect(formatPurchaseNumber(2026, 3)).toBe("PO-2026-0003");
  });
});

describe("percentOf", () => {
  it("rounds to the nearest whole percent", () => {
    expect(percentOf(1, 3)).toBe(33);
  });

  it("returns zero when the whole is zero", () => {
    expect(percentOf(5, 0)).toBe(0);
  });
});
