/**
 * 将函数转换为错误优先的函数
 * 支持同步和异步函数
 *
 * @param fn 要包装的函数
 * @returns 返回一个函数，执行结果为 [Error | null, Result | null] 的元组
 */
export function tryit<TFunction extends (...args: any[]) => any>(
  fn: TFunction,
) {
  return async (
    ...args: Parameters<TFunction>
  ): Promise<[Error | null, Awaited<ReturnType<TFunction>> | null]> => {
    try {
      const result = await fn(...args);
      return [null, result];
    }
    catch (error) {
      return [error as Error, null];
    }
  };
}
