/**
 * Normalize upstream input that may contain port/brackets/IPv4-mapped IPv6 into a "pure IP string".
 *
 * Examples:
 * - `1.2.3.4:3000` -> `1.2.3.4`
 * - `[::1]:3000` -> `::1`
 * - `::ffff:192.168.0.1` -> `192.168.0.1`
 * - `unknown` (case-insensitive) is normalized to `"unknown"` as-is
 *
 * 将上游可能带有端口/括号/IPv4-mapped IPv6 的输入，归一化为"纯 IP 字符串"。
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

  // 1.2.3.4:3000 (only truncate when matching "IPv4 + single port" pattern) / 1.2.3.4:3000（仅当符合"IPv4 + 单端口"的形态时才截断）
  if (t.includes(".") && t.includes(":") && t.split(":").length === 2)
    return t.split(":")[0] ?? t;

  return t;
}

/**
 * Check if the address is private/local/link-local.
 *
 * - IPv4:
 *   - 127.0.0.0/8 loopback
 *   - 10.0.0.0/8
 *   - 172.16.0.0/12
 *   - 192.168.0.0/16
 *   - 169.254.0.0/16 link-local
 * - IPv6:
 *   - ::1 loopback
 *   - fc00::/7 (fcxx/fdxx) ULA
 *   - fe80::/10 link-local (prefix approximation used here for fe80:)
 *
 * 判断是否为内网/本机/链路本地地址。
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

  // ipVersion === 4: should be a valid IPv4 at this point / ipVersion === 4：此时应当是合法 IPv4
  const [aS, bS] = ip.split(".", 3);
  const a = Number(aS);
  const b = Number(bS);
  return a === 127
    || a === 10
    || (a === 192 && b === 168)
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31);
}
