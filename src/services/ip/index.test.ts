/* eslint-disable node/prefer-global/buffer */
/* eslint-disable no-restricted-globals */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { getIPAddress } from "./index";

// Mock Redis 客户端
vi.mock("@/lib/redis", () => ({
  default: {
    get: vi.fn(),
    set: vi.fn(),
  },
}));

// Mock iconv-lite
vi.mock("iconv-lite", () => ({
  default: {
    decode: vi.fn((buffer: Buffer) => buffer.toString("utf8")),
  },
}));

describe("IP Service", () => {
  const mockFetch = vi.fn();
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = mockFetch;
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe("getIPAddress", () => {
    describe("本地/私有IP处理", () => {
      it("空字符串应返回unknown（无效IP）", async () => {
        const result = await getIPAddress("");

        expect(result).toBe("unknown");
      });

      it("unknown（大小写不敏感）应返回本地", async () => {
        expect(await getIPAddress("unknown")).toBe("本地");
        expect(await getIPAddress("UNKNOWN")).toBe("本地");
        expect(await getIPAddress("Unknown")).toBe("本地");
      });

      it("IPv4 回环地址应返回本地", async () => {
        expect(await getIPAddress("127.0.0.1")).toBe("本地");
        expect(await getIPAddress("127.255.255.255")).toBe("本地");
      });

      it("IPv4 私有地址应返回本地", async () => {
        // 10.0.0.0/8
        expect(await getIPAddress("10.0.0.1")).toBe("本地");
        expect(await getIPAddress("10.255.255.255")).toBe("本地");

        // 172.16.0.0/12
        expect(await getIPAddress("172.16.0.1")).toBe("本地");
        expect(await getIPAddress("172.31.255.255")).toBe("本地");

        // 192.168.0.0/16
        expect(await getIPAddress("192.168.0.1")).toBe("本地");
        expect(await getIPAddress("192.168.255.255")).toBe("本地");

        // 169.254.0.0/16 link-local
        expect(await getIPAddress("169.254.0.1")).toBe("本地");
      });

      it("IPv6 回环地址应返回本地", async () => {
        expect(await getIPAddress("::1")).toBe("本地");
        expect(await getIPAddress("0:0:0:0:0:0:0:1")).toBe("本地");
      });

      it("IPv6 私有地址应返回本地", async () => {
        // ULA fc00::/7
        expect(await getIPAddress("fc00::1")).toBe("本地");
        expect(await getIPAddress("fd00::1")).toBe("本地");

        // link-local fe80::/10
        expect(await getIPAddress("fe80::1")).toBe("本地");
      });

      it("带端口的私有IP应返回本地", async () => {
        expect(await getIPAddress("127.0.0.1:3000")).toBe("本地");
        expect(await getIPAddress("192.168.1.1:8080")).toBe("本地");
        expect(await getIPAddress("[::1]:3000")).toBe("本地");
      });

      it("IPv4-mapped IPv6 私有地址应返回本地", async () => {
        expect(await getIPAddress("::ffff:127.0.0.1")).toBe("本地");
        expect(await getIPAddress("::ffff:192.168.0.1")).toBe("本地");
      });
    });

    describe("无效IP处理", () => {
      it("无效格式应返回unknown", async () => {
        expect(await getIPAddress("not-an-ip")).toBe("unknown");
        expect(await getIPAddress("256.256.256.256")).toBe("unknown");
        expect(await getIPAddress("abc.def.ghi.jkl")).toBe("unknown");
      });
    });

    describe("公网IP处理（带Redis缓存）", () => {
      it("缓存命中时应返回缓存值", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue("北京市");

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("北京市");
        expect(redisClient.get).toHaveBeenCalledWith("ip:location:8.8.8.8");
      });

      it("缓存为空值标记时应返回unknown", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue("__NULL__");

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("unknown");
      });

      it("缓存未命中时应调用API并缓存结果", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue(null);
        vi.mocked(redisClient.set).mockResolvedValue("OK");

        const mockResponse = {
          ok: true,
          arrayBuffer: vi.fn().mockResolvedValue(
            Buffer.from(JSON.stringify({ addr: "广东省深圳市" })),
          ),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getIPAddress("114.114.114.114");

        expect(result).toBe("广东省深圳市");
        expect(mockFetch).toHaveBeenCalled();
      });

      it("API返回pro和city时应拼接", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue(null);

        const mockResponse = {
          ok: true,
          arrayBuffer: vi.fn().mockResolvedValue(
            Buffer.from(JSON.stringify({ pro: "广东省", city: "深圳市" })),
          ),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getIPAddress("114.114.114.114");

        expect(result).toBe("广东省深圳市");
      });

      it("API请求失败应返回unknown", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue(null);

        mockFetch.mockRejectedValue(new Error("Network error"));

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("unknown");
      });

      it("API返回非200应返回unknown", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue(null);

        mockFetch.mockResolvedValue({ ok: false, status: 500 });

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("unknown");
      });

      it("API返回无效JSON应返回unknown", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue(null);

        const mockResponse = {
          ok: true,
          arrayBuffer: vi.fn().mockResolvedValue(Buffer.from("invalid json")),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("unknown");
      });

      it("API返回err字段应返回unknown", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue(null);

        const mockResponse = {
          ok: true,
          arrayBuffer: vi.fn().mockResolvedValue(
            Buffer.from(JSON.stringify({ err: "IP not found" })),
          ),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("unknown");
      });

      it("Redis读取失败时应继续调用API", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockRejectedValue(new Error("Redis error"));

        const mockResponse = {
          ok: true,
          arrayBuffer: vi.fn().mockResolvedValue(
            Buffer.from(JSON.stringify({ addr: "上海市" })),
          ),
        };
        mockFetch.mockResolvedValue(mockResponse);

        const result = await getIPAddress("8.8.8.8");

        expect(result).toBe("上海市");
      });
    });

    describe("IPv6公网地址", () => {
      it("应正确处理公网IPv6地址", async () => {
        const { default: redisClient } = await import("@/lib/redis");
        vi.mocked(redisClient.get).mockResolvedValue("美国");

        const result = await getIPAddress("2001:4860:4860::8888");

        expect(result).toBe("美国");
      });
    });
  });
});
