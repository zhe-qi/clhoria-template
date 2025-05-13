/**
 * 从对象中选择指定的属性
 * @param obj 对象
 * @param keys 属性名数组
 * @returns 新对象
 */
export function pick<T extends ParamsType, K extends keyof T>(obj: T, keys: K[]) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as Pick<T, K>);
}
