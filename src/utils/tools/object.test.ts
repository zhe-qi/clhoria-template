import { describe, expect, it } from "vitest";

import { compareObjects, createComparer, omit, pick } from "./object";

describe("object Utils", () => {
  describe("pick", () => {
    it("should pick specified properties", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = pick(obj, ["a", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should handle missing properties", () => {
      const obj = { a: 1, b: 2 };
      const result = pick(obj, ["a", "c"] as any);

      expect(result).toEqual({ a: 1 });
    });

    it("should handle undefined values", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = pick(obj, ["a", "b", "c"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should handle empty keys array", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = pick(obj, []);

      expect(result).toEqual({});
    });

    it("should handle empty object", () => {
      const obj = {};
      const result = pick(obj, ["a"] as any);

      expect(result).toEqual({});
    });
  });

  describe("omit", () => {
    it("should omit specified properties", () => {
      const obj = { a: 1, b: 2, c: 3, d: 4 };
      const result = omit(obj, ["b", "d"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should handle missing properties", () => {
      const obj = { a: 1, b: 2 };
      const result = omit(obj, ["c"] as any);

      expect(result).toEqual({ a: 1, b: 2 });
    });

    it("should handle undefined values", () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const result = omit(obj, ["b"]);

      expect(result).toEqual({ a: 1, c: 3 });
    });

    it("should handle empty keys array", () => {
      const obj = { a: 1, b: 2, c: 3 };
      const result = omit(obj, []);

      expect(result).toEqual({ a: 1, b: 2, c: 3 });
    });

    it("should handle empty object", () => {
      const obj = {};
      const result = omit(obj, ["a"] as any);

      expect(result).toEqual({});
    });
  });

  describe("createComparer", () => {
    it("should create a comparer instance", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 3 };
      const comparer = createComparer(obj1, obj2);

      expect(comparer).toBeDefined();
      expect(typeof comparer.addKey).toBe("function");
      expect(typeof comparer.compare).toBe("function");
    });

    it("should add keys and compare successfully", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 2, c: 4 };
      const comparer = createComparer(obj1, obj2);

      comparer.addKey("a").addKey("b");
      expect(comparer.compare()).toBe(true);

      comparer.addKey("c");
      expect(comparer.compare()).toBe(false);
    });

    it("should throw error when adding duplicate keys", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };
      const comparer = createComparer(obj1, obj2);

      comparer.addKey("a");
      expect(() => comparer.addKey("a")).toThrow("Key 'a' already added");
    });

    it("should return true for empty keys", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 3, b: 4 };
      const comparer = createComparer(obj1, obj2);

      expect(comparer.compare()).toBe(true);
    });
  });

  describe("compareObjects", () => {
    it("should compare objects with specified keys", () => {
      const obj1 = { a: 1, b: 2, c: 3 };
      const obj2 = { a: 1, b: 2, c: 4 };

      expect(compareObjects(obj1, obj2, ["a", "b"])).toBe(true);
      expect(compareObjects(obj1, obj2, ["a", "c"])).toBe(false);
    });

    it("should compare all common keys when no keys provided", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2, c: 3 };

      expect(compareObjects(obj1, obj2)).toBe(true);
    });

    it("should handle different object structures", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, c: 3 };

      expect(compareObjects(obj1, obj2)).toBe(true);
      expect(compareObjects(obj1, obj2, ["a"])).toBe(true);
    });

    it("should throw error for duplicate keys", () => {
      const obj1 = { a: 1, b: 2 };
      const obj2 = { a: 1, b: 2 };

      expect(() => compareObjects(obj1, obj2, ["a", "a"])).toThrow("Keys array contains duplicates");
    });

    it("should handle special values correctly", () => {
      const obj1 = { a: null, b: undefined, c: 0, d: "" };
      const obj2 = { a: null, b: undefined, c: 0, d: "" };

      expect(compareObjects(obj1, obj2)).toBe(true);
    });

    it("should distinguish between null and undefined", () => {
      const obj1 = { a: null };
      const obj2 = { a: undefined };

      expect(compareObjects(obj1, obj2, ["a"])).toBe(false);
    });

    it("should handle NaN values", () => {
      const obj1 = { a: Number.NaN };
      const obj2 = { a: Number.NaN };

      expect(compareObjects(obj1, obj2, ["a"])).toBe(true);
    });

    it("should handle -0 and +0", () => {
      const obj1 = { a: -0 };
      const obj2 = { a: +0 };

      expect(compareObjects(obj1, obj2, ["a"])).toBe(false);
    });

    it("should handle empty objects", () => {
      const obj1 = {};
      const obj2 = {};

      expect(compareObjects(obj1, obj2)).toBe(true);
    });
  });
});
