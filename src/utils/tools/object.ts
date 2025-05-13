/**
 * 从对象中选择指定的属性
 * @param obj 对象
 * @param keys 属性名数组
 * @returns 新对象
 */
export function pick<T extends ParamsType>(obj: T, keys: string[]) {
  return keys.reduce((acc, key) => {
    if (obj[key] !== undefined) {
      acc[key] = obj[key];
    }
    return acc;
  }, {} as ParamsType);
}
