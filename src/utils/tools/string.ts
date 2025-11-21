/**
 * 去除字符串前缀
 * @param path 字符串
 * @param prefix 前缀
 * @returns 去除前缀后的字符串
 */
export function stripPrefix(path: string, prefix: string): string {
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
