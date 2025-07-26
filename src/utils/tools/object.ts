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

class ObjectComparer<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, unknown>,
> {
  private keys: Set<keyof T & keyof U> = new Set();

  constructor(private obj1: T, private obj2: U) {}

  addKey<K extends keyof T & keyof U>(key: K): this {
    if (this.keys.has(key)) {
      throw new Error(`Key '${String(key)}' already added`);
    }
    this.keys.add(key);
    return this;
  }

  compare(): boolean {
    const keysArray = Array.from(this.keys);
    return keysArray.every((key) => {
      return Object.is(this.obj1[key], this.obj2[key]);
    });
  }
}

export function createComparer<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, unknown>,
>(obj1: T, obj2: U) {
  return new ObjectComparer(obj1, obj2);
}

export function compareObjects<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, unknown>,
>(obj1: T, obj2: U): boolean;

export function compareObjects<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, unknown>,
  const K extends readonly (keyof T & keyof U)[],
>(obj1: T, obj2: U, keys: K): boolean;

/**
 * 比较两个对象的指定属性是否相等
 */
export function compareObjects<
  T extends Record<PropertyKey, unknown>,
  U extends Record<PropertyKey, unknown>,
  const K extends readonly (keyof T & keyof U)[],
>(obj1: T, obj2: U, keys?: K): boolean {
  if (keys && new Set(keys).size !== keys.length) {
    throw new Error("Keys array contains duplicates");
  }

  const compareKeys = Array.isArray(keys)
    ? keys
    : (Object.keys(obj1).filter(key =>
        key in obj2,
      ) as (keyof T & keyof U)[]);

  return compareKeys.every((key) => {
    return Object.is(obj1[key], obj2[key]);
  });
}
