import { z } from "zod";

/**
 * 将上游可能带有端口/括号/IPv4-mapped IPv6 的输入，归一化为“纯 IP 字符串”。
 *
 * 支持示例：
 * - `1.2.3.4:3000` -> `1.2.3.4`
 * - `[::1]:3000` -> `::1`
 * - `::ffff:192.168.0.1` -> `192.168.0.1`
 * - `unknown`（大小写不敏感）会原样归一化为 `"unknown"`
 */
export function normalizeIp(raw: string, unknownValue = "unknown"): string {
  const s = raw.trim();
  if (!s)
    return "";

  if (s.toLowerCase() === unknownValue)
    return unknownValue;

  // [::1]:3000
  if (s.startsWith("[")) {
    const i = s.indexOf("]");
    if (i > 0)
      return s.slice(1, i);
  }

  // ::ffff:192.168.0.1 (IPv4-mapped IPv6)
  const t = s.replace(/^::ffff:/i, "");

  // 1.2.3.4:3000（仅当符合“IPv4 + 单端口”的形态时才截断）
  if (t.includes(".") && t.includes(":") && t.split(":").length === 2)
    return t.split(":")[0] ?? t;

  return t;
}

const Ipv4Schema = z.ipv4();
const Ipv6Schema = z.ipv6();

/**
 * 获取 IP 版本（4/6），非法则返回 0。
 * 说明：这里不依赖 Node.js 的 `net.isIP()`，使用 Zod v4 内置 `z.ipv4()/z.ipv6()`，
 * 可兼容 Bun 等运行时。
 */
export function getIpVersion(ip: string): 0 | 4 | 6 {
  if (Ipv4Schema.safeParse(ip).success)
    return 4;
  if (Ipv6Schema.safeParse(ip).success)
    return 6;
  return 0;
}

/**
 * 判断是否为内网/本机/链路本地地址。
 *
 * - IPv4：
 *   - 127.0.0.0/8 loopback
 *   - 10.0.0.0/8
 *   - 172.16.0.0/12
 *   - 192.168.0.0/16
 *   - 169.254.0.0/16 link-local
 * - IPv6：
 *   - ::1 loopback
 *   - fc00::/7 (fcxx/fdxx) ULA
 *   - fe80::/10 link-local（这里用前缀近似判断 fe80:）
 */
export function isPrivateIp(ip: string, ipVersion: 4 | 6): boolean {
  if (ipVersion === 6) {
    const l = ip.toLowerCase();
    return l === "::1"
      || l === "0:0:0:0:0:0:0:1"
      || l.startsWith("fc")
      || l.startsWith("fd")
      || l.startsWith("fe80:");
  }

  // ipVersion === 4：此时应当是合法 IPv4
  const [aS, bS] = ip.split(".", 3);
  const a = Number(aS);
  const b = Number(bS);
  return a === 127
    || a === 10
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31);
}
