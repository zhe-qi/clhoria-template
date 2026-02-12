import type { SagaDefinition } from "../types";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { sagaRegistry } from "../saga-registry";

// Mock logger
vi.mock("@/lib/services/logger", () => ({
  default: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

describe("SagaRegistry", () => {
  beforeEach(() => {
    sagaRegistry.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    sagaRegistry.clear();
  });

  const createMockSaga = (type: string): SagaDefinition => ({
    type,
    steps: [
      {
        name: "step-1",
        execute: async () => ({ success: true }),
      },
    ],
  });

  describe("register", () => {
    it("应成功注册 Saga 定义", () => {
      const saga = createMockSaga("test-saga");

      sagaRegistry.register(saga);

      expect(sagaRegistry.has("test-saga")).toBe(true);
      expect(sagaRegistry.get("test-saga")).toBeDefined();
      expect(sagaRegistry.get("test-saga")?.type).toBe("test-saga");
    });

    it("重复注册应覆盖旧定义", () => {
      const saga1 = createMockSaga("test-saga");
      const saga2: SagaDefinition = {
        type: "test-saga",
        steps: [
          { name: "step-1", execute: async () => ({ success: true }) },
          { name: "step-2", execute: async () => ({ success: true }) },
        ],
      };

      sagaRegistry.register(saga1);

      expect(sagaRegistry.get("test-saga")?.steps.length).toBe(1);

      sagaRegistry.register(saga2);
      const registered = sagaRegistry.get("test-saga");

      expect(registered?.steps.length).toBe(2);
    });

    it("应支持注册多个不同类型的 Saga", () => {
      sagaRegistry.register(createMockSaga("saga-a"));
      sagaRegistry.register(createMockSaga("saga-b"));
      sagaRegistry.register(createMockSaga("saga-c"));

      expect(sagaRegistry.getTypes()).toEqual(["saga-a", "saga-b", "saga-c"]);
    });
  });

  describe("get", () => {
    it("已注册类型应返回定义", () => {
      const saga = createMockSaga("test-saga");
      sagaRegistry.register(saga);

      const result = sagaRegistry.get("test-saga");

      expect(result).toBeDefined();
      expect(result?.type).toBe("test-saga");
    });

    it("未注册类型应返回 undefined", () => {
      const result = sagaRegistry.get("non-existent");

      expect(result).toBeUndefined();
    });
  });

  describe("has", () => {
    it("已注册类型应返回 true", () => {
      sagaRegistry.register(createMockSaga("test-saga"));

      expect(sagaRegistry.has("test-saga")).toBe(true);
    });

    it("未注册类型应返回 false", () => {
      expect(sagaRegistry.has("non-existent")).toBe(false);
    });
  });

  describe("getTypes", () => {
    it("无注册时应返回空数组", () => {
      expect(sagaRegistry.getTypes()).toEqual([]);
    });

    it("应返回所有已注册类型", () => {
      sagaRegistry.register(createMockSaga("order-create"));
      sagaRegistry.register(createMockSaga("payment-process"));
      sagaRegistry.register(createMockSaga("inventory-reserve"));

      const types = sagaRegistry.getTypes();

      expect(types).toHaveLength(3);
      expect(types).toContain("order-create");
      expect(types).toContain("payment-process");
      expect(types).toContain("inventory-reserve");
    });
  });

  describe("clear", () => {
    it("应清空所有注册的 Saga", () => {
      sagaRegistry.register(createMockSaga("saga-a"));
      sagaRegistry.register(createMockSaga("saga-b"));

      expect(sagaRegistry.getTypes()).toHaveLength(2);

      sagaRegistry.clear();

      expect(sagaRegistry.getTypes()).toHaveLength(0);
      expect(sagaRegistry.has("saga-a")).toBe(false);
    });
  });
});
