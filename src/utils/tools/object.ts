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

/**
 * 从对象中排除指定的属性
 * @param obj 对象
 * @param keys 要排除的属性名数组
 * @returns 新对象
 */
export function omit<T extends ParamsType, K extends keyof T>(obj: T, keys: K[]) {
  const keysSet = new Set(keys);
  return Object.keys(obj).reduce((acc, key) => {
    if (!keysSet.has(key as K) && obj[key] !== undefined) {
      (acc as any)[key] = obj[key];
    }
    return acc;
  }, {} as Omit<T, K>);
}

/** 工具函数：将字段数组转换为查询所需的格式 */
export function toColumns<T extends string>(fields: readonly T[]) {
  return Object.fromEntries(
    fields.map(key => [key, true]),
  ) as Record<T, true>;
}
