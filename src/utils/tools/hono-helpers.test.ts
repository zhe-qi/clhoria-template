import { describe, expect, it, vi } from "vitest";

import { pickContext } from "./hono-helpers";

describe("hono-helpers Utils", () => {
  describe("pickContext", () => {
    it("should pick context values in correct order", () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key: string) => {
          const values: Record<string, any> = {
            userId: "user123",
            userDomain: "domain456",
            userRoles: ["admin"],
          };
          return values[key];
        }),
      };

      const result = pickContext(mockContext as any, ["userId", "userDomain"]);

      expect(result).toEqual(["user123", "domain456"]);
      expect(mockContext.get).toHaveBeenCalledTimes(2);
      expect(mockContext.get).toHaveBeenNthCalledWith(1, "userId");
      expect(mockContext.get).toHaveBeenNthCalledWith(2, "userDomain");
    });

    it("should handle single key", () => {
      const mockContext = {
        get: vi.fn().mockReturnValue("single-value"),
      };

      const result = pickContext(mockContext as any, ["userId"]);

      expect(result).toEqual(["single-value"]);
      expect(mockContext.get).toHaveBeenCalledWith("userId");
    });

    it("should handle multiple keys in specific order", () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key: string) => {
          const values: Record<string, any> = {
            userRoles: ["admin"],
            userId: "user123",
            userDomain: "domain456",
          };
          return values[key];
        }),
      };

      const result = pickContext(mockContext as any, ["userRoles", "userId", "userDomain"]);

      expect(result).toEqual([["admin"], "user123", "domain456"]);
      expect(mockContext.get).toHaveBeenCalledTimes(3);
    });

    it("should handle undefined values", () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key: string) => {
          return key === "userId" ? "user123" : undefined;
        }),
      };

      const result = pickContext(mockContext as any, ["userId", "logger"]);

      expect(result).toEqual(["user123", undefined]);
    });

    it("should handle empty keys array", () => {
      const mockContext = {
        get: vi.fn(),
      };

      const result = pickContext(mockContext as any, []);

      expect(result).toEqual([]);
      expect(mockContext.get).not.toHaveBeenCalled();
    });

    it("should maintain type safety", () => {
      const mockContext = {
        get: vi.fn().mockImplementation((key: string) => {
          const values: Record<string, any> = {
            userId: "user123",
            userDomain: "domain456",
          };
          return values[key];
        }),
      };

      const result = pickContext(mockContext as any, ["userId", "userDomain"] as const);

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(typeof result[0]).toBe("string");
      expect(typeof result[1]).toBe("string");
    });
  });
});
