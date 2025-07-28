import { describe, expect, it } from "vitest";

import { formatDate, formatSafeJson } from "./formatter";

describe("formatter Utils", () => {
  describe("formatDate", () => {
    it("should format date with default parameters", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDate(date);

      expect(result).toMatch(/2024-01-15 \d{2}:\d{2}:\d{2}/);
    });

    it("should format date with custom format string", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDate(date, "yyyy-MM-dd");

      expect(result).toBe("2024-01-15");
    });

    it("should format date with custom timezone", () => {
      const date = new Date("2024-01-15T10:30:00Z");
      const result = formatDate(date, "yyyy-MM-dd HH:mm:ss", "UTC");

      expect(result).toBe("2024-01-15 10:30:00");
    });

    it("should format date string input", () => {
      const dateString = "2024-01-15T10:30:00Z";
      const result = formatDate(dateString, "yyyy-MM-dd");

      expect(result).toBe("2024-01-15");
    });

    it("should handle different date formats", () => {
      const date = new Date("2024-12-25T15:45:30Z");
      const result = formatDate(date, "MM/dd/yyyy HH:mm", "UTC");

      expect(result).toBe("12/25/2024 15:45");
    });
  });

  describe("formatSafeJson", () => {
    it("should parse valid JSON string", () => {
      const jsonString = "{\"name\": \"John\", \"age\": 30}";
      const result = formatSafeJson(jsonString);

      expect(result).toEqual({ name: "John", age: 30 });
    });

    it("should parse valid JSON array", () => {
      const jsonString = "[{\"id\": 1}, {\"id\": 2}]";
      const result = formatSafeJson(jsonString);

      expect(result).toEqual([{ id: 1 }, { id: 2 }]);
    });

    it("should return original data for invalid JSON", () => {
      const invalidJson = "invalid json string";
      const result = formatSafeJson(invalidJson);

      expect(result).toBe(invalidJson);
    });

    it("should return original data for non-string input", () => {
      const objectInput = { name: "John" };
      const result = formatSafeJson(objectInput);

      expect(result).toBe(objectInput);
    });

    it("should return original data for null input", () => {
      const result = formatSafeJson(null);

      expect(result).toBe(null);
    });

    it("should return original data for undefined input", () => {
      const result = formatSafeJson(undefined);

      expect(result).toBe(undefined);
    });

    it("should handle empty string", () => {
      const result = formatSafeJson("");

      expect(result).toBe("");
    });

    it("should handle malformed JSON gracefully", () => {
      const malformedJson = "{\"name\": \"John\", \"age\":}";
      const result = formatSafeJson(malformedJson);

      expect(result).toBe(malformedJson);
    });

    it("should handle complex nested JSON", () => {
      const complexJson = "{\"user\": {\"name\": \"John\", \"roles\": [\"admin\", \"user\"]}, \"timestamp\": 1234567890}";
      const result = formatSafeJson(complexJson);

      expect(result).toEqual({
        user: { name: "John", roles: ["admin", "user"] },
        timestamp: 1234567890,
      });
    });
  });
});
