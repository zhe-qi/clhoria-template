import { describe, expect, it } from "vitest";

import { tryit } from "./tryit";

describe("tryit Utils", () => {
  describe("tryit", () => {
    it("should return successful result for sync function", async () => {
      const syncFn = (a: number, b: number) => a + b;
      const wrappedFn = tryit(syncFn);

      const [error, result] = await wrappedFn(2, 3);

      expect(error).toBeNull();
      expect(result).toBe(5);
    });

    it("should return successful result for async function", async () => {
      const asyncFn = async (value: string) => {
        return `Hello, ${value}!`;
      };
      const wrappedFn = tryit(asyncFn);

      const [error, result] = await wrappedFn("World");

      expect(error).toBeNull();
      expect(result).toBe("Hello, World!");
    });

    it("should catch sync function errors", async () => {
      const errorFn = () => {
        throw new Error("Sync error");
      };
      const wrappedFn = tryit(errorFn);

      const [error, result] = await wrappedFn();

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Sync error");
      expect(result).toBeNull();
    });

    it("should catch async function errors", async () => {
      const asyncErrorFn = async () => {
        throw new Error("Async error");
      };
      const wrappedFn = tryit(asyncErrorFn);

      const [error, result] = await wrappedFn();

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Async error");
      expect(result).toBeNull();
    });

    it("should handle function with multiple parameters", async () => {
      const multiParamFn = (name: string, age: number, active: boolean) => {
        return { name, age, active };
      };
      const wrappedFn = tryit(multiParamFn);

      const [error, result] = await wrappedFn("John", 30, true);

      expect(error).toBeNull();
      expect(result).toEqual({ name: "John", age: 30, active: true });
    });

    it("should handle function that returns promise", async () => {
      const promiseFn = (delay: number) => {
        return new Promise<string>((resolve) => {
          setTimeout(() => resolve(`Resolved after ${delay}ms`), delay);
        });
      };
      const wrappedFn = tryit(promiseFn);

      const [error, result] = await wrappedFn(10);

      expect(error).toBeNull();
      expect(result).toBe("Resolved after 10ms");
    });

    it("should handle function that returns rejected promise", async () => {
      const rejectedPromiseFn = () => {
        return Promise.reject(new Error("Promise rejected"));
      };
      const wrappedFn = tryit(rejectedPromiseFn);

      const [error, result] = await wrappedFn();

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("Promise rejected");
      expect(result).toBeNull();
    });

    it("should handle function that throws non-Error values", async () => {
      const stringThrowFn = () => {
        throw new Error("String error");
      };
      const wrappedFn = tryit(stringThrowFn);

      const [error, result] = await wrappedFn();

      expect(error).toBeInstanceOf(Error);
      expect(error?.message).toBe("String error");
      expect(result).toBeNull();
    });

    it("should handle function that returns undefined", async () => {
      const undefinedFn = () => {
        return undefined;
      };
      const wrappedFn = tryit(undefinedFn);

      const [error, result] = await wrappedFn();

      expect(error).toBeNull();
      expect(result).toBeUndefined();
    });

    it("should handle function that returns null", async () => {
      const nullFn = () => {
        return null;
      };
      const wrappedFn = tryit(nullFn);

      const [error, result] = await wrappedFn();

      expect(error).toBeNull();
      expect(result).toBeNull();
    });

    it("should preserve function parameter types", async () => {
      const typedFn = (id: string, count: number, options: { flag: boolean }) => {
        return { id, count, flag: options.flag };
      };
      const wrappedFn = tryit(typedFn);

      const [error, result] = await wrappedFn("test-id", 42, { flag: true });

      expect(error).toBeNull();
      expect(result).toEqual({ id: "test-id", count: 42, flag: true });
    });
  });
});
