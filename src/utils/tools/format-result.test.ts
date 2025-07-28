import { describe, expect, it } from "vitest";

import { formatJoinRecord, formatJoinResults } from "./format-result";

describe("format-result Utils", () => {
  describe("formatJoinRecord", () => {
    it("should format join record with main table data", () => {
      const record = {
        users: { id: 1, name: "John" },
        user_profiles: { bio: "Developer" },
        roles: { name: "Admin" },
      };

      const result = formatJoinRecord(record, "users");

      expect(result).toEqual({
        id: 1,
        name: "John",
        userProfiles: { bio: "Developer" },
        roles: { name: "Admin" },
      });
    });

    it("should use table aliases when provided", () => {
      const record = {
        users: { id: 1, name: "John" },
        user_profiles: { bio: "Developer" },
        roles: { name: "Admin" },
      };
      const aliases = { user_profiles: "profile", roles: "role" };

      const result = formatJoinRecord(record, "users", aliases);

      expect(result).toEqual({
        id: 1,
        name: "John",
        profile: { bio: "Developer" },
        role: { name: "Admin" },
      });
    });

    it("should handle null table data", () => {
      const record = {
        users: { id: 1, name: "John" },
        user_profiles: null,
        roles: { name: "Admin" },
      };

      const result = formatJoinRecord(record, "users");

      expect(result).toEqual({
        id: 1,
        name: "John",
        roles: { name: "Admin" },
      });
    });

    it("should handle empty record", () => {
      const result = formatJoinRecord({}, "users");
      expect(result).toEqual({});
    });

    it("should handle non-object input", () => {
      const result1 = formatJoinRecord(null as any, "users");
      const result2 = formatJoinRecord(undefined as any, "users");
      const result3 = formatJoinRecord("invalid" as any, "users");

      expect(result1).toEqual({});
      expect(result2).toEqual({});
      expect(result3).toEqual({});
    });

    it("should handle missing main table", () => {
      const record = {
        user_profiles: { bio: "Developer" },
        roles: { name: "Admin" },
      };

      const result = formatJoinRecord(record, "users");

      expect(result).toEqual({
        userProfiles: { bio: "Developer" },
        roles: { name: "Admin" },
      });
    });
  });

  describe("formatJoinResults", () => {
    it("should format array of join records", () => {
      const data = [
        {
          users: { id: 1, name: "John" },
          roles: { name: "Admin" },
        },
        {
          users: { id: 2, name: "Jane" },
          roles: { name: "User" },
        },
      ];

      const result = formatJoinResults(data, "users");

      expect(result).toEqual([
        { id: 1, name: "John", roles: { name: "Admin" } },
        { id: 2, name: "Jane", roles: { name: "User" } },
      ]);
    });

    it("should handle empty array", () => {
      const result = formatJoinResults([], "users");
      expect(result).toEqual([]);
    });

    it("should handle non-array input", () => {
      const result1 = formatJoinResults(null as any, "users");
      const result2 = formatJoinResults(undefined as any, "users");
      const result3 = formatJoinResults("invalid" as any, "users");

      expect(result1).toEqual([]);
      expect(result2).toEqual([]);
      expect(result3).toEqual([]);
    });

    it("should use table aliases for all records", () => {
      const data = [
        {
          users: { id: 1, name: "John" },
          user_profiles: { bio: "Developer" },
        },
        {
          users: { id: 2, name: "Jane" },
          user_profiles: { bio: "Designer" },
        },
      ];
      const aliases = { user_profiles: "profile" };

      const result = formatJoinResults(data, "users", aliases);

      expect(result).toEqual([
        { id: 1, name: "John", profile: { bio: "Developer" } },
        { id: 2, name: "Jane", profile: { bio: "Designer" } },
      ]);
    });
  });
});
