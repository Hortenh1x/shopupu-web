import { describe, expect, it } from "vitest";
import { messages } from "./messages";
import { adminMessages } from "./messages/admin";
import { authMessages } from "./messages/auth";
import { catalogMessages } from "./messages/catalog";
import { commerceMessages } from "./messages/commerce";
import { commonMessages } from "./messages/common";

// Terms that are legitimately identical in both languages; anything else that matches is an untranslated entry.
const SHARED_TERMS = new Set([
  "common.optional", "gender.UNISEX", "role.ADMIN", "commerce.status", "commerce.promoExample", "admin.id", "admin.name",
  "admin.slug", "admin.status", "admin.sku", "admin.field.slug", "admin.field.material", "admin.code", "nav.shop", "review.neutral"
]);
const placeholders = (text: string) => [...text.matchAll(/\{([A-Za-z0-9_]+)\}/g)].map((match) => match[1]).sort().join(",");

describe("EN/DE dictionaries", () => {
  it("define every key in both languages with non-empty text", () => {
    for (const [key, entry] of Object.entries(messages)) {
      expect(entry.en.trim(), key).not.toBe("");
      expect(entry.de.trim(), key).not.toBe("");
    }
  });

  it("use the same placeholders in both languages", () => {
    for (const [key, entry] of Object.entries(messages)) {
      expect(placeholders(entry.de), key).toBe(placeholders(entry.en));
    }
  });

  it("do not leave German entries that merely repeat the English text", () => {
    const untranslated = Object.entries(messages)
      .filter(([key, entry]) => entry.en.trim() === entry.de.trim() && !SHARED_TERMS.has(key))
      .map(([key]) => key);
    expect(untranslated).toEqual([]);
  });

  it("do not silently override keys between modules", () => {
    const modules = [commonMessages, authMessages, commerceMessages, adminMessages, catalogMessages];
    const declared = modules.reduce((count, module) => count + Object.keys(module).length, 0);
    expect(Object.keys(messages)).toHaveLength(declared);
  });
});
