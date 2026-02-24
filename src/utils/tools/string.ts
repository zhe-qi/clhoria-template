/**
 * Strip prefix from string
 * @param path String / 字符串
 * @param prefix Prefix / 前缀
 * @returns String with prefix removed / 去除前缀后的字符串
 * 去除字符串前缀
 */
export function stripPrefix(path: string, prefix: string): string {
  return path.startsWith(prefix) ? path.slice(prefix.length) : path;
}
