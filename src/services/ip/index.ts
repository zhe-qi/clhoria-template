import { Buffer } from "node:buffer";
import iconv from "iconv-lite";
import { z } from "zod";

import { CACHE_TTL, NULL_CACHE_TTL, NULL_CACHE_VALUE } from "@/lib/constants";
import redisClient from "@/lib/redis";
import { isPrivateIp, normalizeIp, tryit } from "@/utils";

const Ipv4Schema = z.ipv4();
const Ipv6Schema = z.ipv6();

/**
 * 获取 IP 版本（4/6），非法则返回 0。
 * 使用 Zod v4 内置 `z.ipv4()/z.ipv6()`，可兼容 Bun 等运行时。
 */
function getIpVersion(ip: string): 0 | 4 | 6 {
  if (Ipv4Schema.safeParse(ip).success)
    return 4;
  if (Ipv6Schema.safeParse(ip).success)
    return 6;
  return 0;
}

const UNKNOWN = "unknown" as const;
const LOCAL = "本地" as const;
const TIMEOUT_MS = 2000 as const;
const S = z.object({ addr: z.string().optional(), pro: z.string().optional(), city: z.string().optional(), err: z.string().optional() });
const keyOf = (ip: string) => `ip:location:${ip}`;
const timeoutSignal = (ms: number) => {
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), ms);
  // 不阻止进程退出（Node/Bun 都支持）
  (timer as unknown as { unref?: () => void }).unref?.();
  return { signal: ac.signal, clear: () => clearTimeout(timer) };
};
const fetchLoc = async (ip: string) => {
  const url = `https://whois.pconline.com.cn/ipJson.jsp?ip=${encodeURIComponent(ip)}&json=true`;
  const { signal, clear } = timeoutSignal(TIMEOUT_MS);
  const [e1, r] = await tryit(fetch)(url, { signal, headers: { Accept: "application/json,text/plain,*/*" } });
  clear();
  if (e1 || !r.ok)
    return UNKNOWN;
  const [e2, ab] = await tryit(() => r.arrayBuffer())();
  if (e2)
    return UNKNOWN;
  const [e3, p] = await tryit(JSON.parse)(iconv.decode(Buffer.from(ab), "gbk"));
  if (e3 || !p || typeof p !== "object")
    return UNKNOWN;
  const v = S.safeParse(p);
  if (!v.success || v.data.err)
    return UNKNOWN;
  return v.data.addr?.trim() || [v.data.pro?.trim(), v.data.city?.trim()].filter(Boolean).join("") || UNKNOWN;
};
const getOrFetch = async (ip: string) => {
  const key = keyOf(ip);
  const [e, c] = await tryit(() => redisClient.get(key))();
  if (!e && c)
    return c === NULL_CACHE_VALUE ? UNKNOWN : c;
  const val = await fetchLoc(ip);
  const ttl = val === UNKNOWN ? NULL_CACHE_TTL : CACHE_TTL;
  void tryit(() => redisClient.set(key, val === UNKNOWN ? NULL_CACHE_VALUE : val, "EX", ttl))();
  return val;
};

/** 根据IP地址获取城市地址信息 */
export async function getIPAddress(ip: string): Promise<string> {
  const n = normalizeIp(ip, UNKNOWN);
  if (n === UNKNOWN)
    return LOCAL; // 保持你当前行为：unknown 也按“本地”处理
  const v = getIpVersion(n);
  if (!n || v === 0)
    return UNKNOWN;
  if (isPrivateIp(n, v))
    return LOCAL;
  return await getOrFetch(n);
}
