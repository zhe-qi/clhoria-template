/**
 * Convert a function to an error-first function
 * Supports both sync and async functions
 *
 * @param fn Function to wrap / 要包装的函数
 * @returns Returns a function whose result is a discriminated union type, supporting type narrowing / 返回一个函数,执行结果为判别联合类型,支持类型收窄
 *
 * 将函数转换为错误优先的函数
 * 支持同步和异步函数
 *
 * @example
 * ```typescript
 * // Call with arguments / 带参数调用
 * const [err, res] = await tryit(fetch)("https://api.example.com");
 *
 * // Call without arguments / 无参数调用
 * const [err, res] = await tryit(someFunc)();
 *
 * if (err) {
 *   // err is Error, res is null / err 是 Error, res 是 null
 *   return;
 * }
 * // err is null, res is Result (type already narrowed) / err 是 null, res 是 Result (已自动收窄类型)
 * console.log(res.data);
 * ```
 */
export function tryit<TFunction extends (...args: any[]) => any>(
  fn: TFunction,
) {
  return async (
    ...args: Partial<Parameters<TFunction>>
  ): Promise<
    | [Error, null]
    | [null, Awaited<ReturnType<TFunction>>]
  > => {
    try {
      const result = await fn(...(args as Parameters<TFunction>));
      return [null, result];
    }
    catch (error) {
      return [error as Error, null];
    }
  };
}
