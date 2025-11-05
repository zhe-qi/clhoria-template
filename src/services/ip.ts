import iconv from "iconv-lite";
import { Buffer } from "node:buffer";

import logger from "@/lib/logger";

interface IPLocationResponse {
  addr: string;
  pro: string;
  city: string;
  err?: string;
}

/** 根据IP地址获取城市地址信息 */
export async function getIPAddress(ip: string): Promise<string> {
  try {
    // 如果是内网IP或localhost，直接返回本地
    if (ip === "unknown" || ip.startsWith("127.") || ip.startsWith("192.168.") || ip.startsWith("10.") || ip.startsWith("172.")) {
      return "本地";
    }

    const response = await fetch(`https://whois.pconline.com.cn/ipJson.jsp?ip=${ip}&json=true`);

    if (!response.ok) {
      return "unknown";
    }

    const buffer = await response.arrayBuffer();
    // 使用iconv-lite解码GBK编码的响应
    const str = iconv.decode(Buffer.from(buffer), "gbk");
    const data: IPLocationResponse = JSON.parse(str);

    if (data.err) {
      return "unknown";
    }

    return data.addr || "unknown";
  }
  catch (error) {
    logger.warn({ error, ip }, "IP地址解析失败");
    return "unknown";
  }
}
