import postgres from "postgres";

/**
 * 将 PostgreSQL 数据库错误映射为结构化的错误对象
 * @param err - 捕获的异常对象
 * @returns 结构化的错误信息，如果不是 PostgreSQL 错误则返回 null
 */
export function mapDbError(err: unknown) {
  // 尝试获取原始的 PostgreSQL 错误
  // Drizzle ORM 会将 PostgresError 包装在 Error 的 cause 属性中
  let postgresError: postgres.PostgresError | undefined;

  if (err instanceof postgres.PostgresError) {
    postgresError = err;
  }
  else if (err instanceof Error && err.cause instanceof postgres.PostgresError) {
    postgresError = err.cause;
  }

  // 如果不是 PostgreSQL 错误则返回 null
  if (!postgresError)
    return null;

  switch (postgresError.code) {
    // ============ 数据完整性约束违反 (Class 23) ============

    // 唯一约束违反：插入或更新的数据违反了唯一约束
    case "23505":
      return {
        type: "UniqueViolation",
        constraint: postgresError.constraint_name,
        detail: postgresError.detail,
      } as const;

    // 非空约束违反：必填字段为 null
    case "23502":
      return {
        type: "NotNullViolation",
        column: postgresError.column_name,
        table: postgresError.table_name,
      } as const;

    // 外键约束违反：引用的记录不存在或被引用的记录正在被删除
    case "23503":
      return {
        type: "ForeignKeyViolation",
        constraint: postgresError.constraint_name,
        table: postgresError.table_name,
        detail: postgresError.detail,
      } as const;

    // 检查约束违反：数据不满足 CHECK 约束条件
    case "23514":
      return {
        type: "CheckViolation",
        constraint: postgresError.constraint_name,
        detail: postgresError.detail,
      } as const;

    // 排他约束违反：数据违反了 EXCLUDE 约束
    case "23P01":
      return {
        type: "ExclusionViolation",
        constraint: postgresError.constraint_name,
        detail: postgresError.detail,
      } as const;

      // ============ 数据格式错误 (Class 22) ============

    // 无效的文本表示：例如将非数字字符串转换为数字类型
    case "22P02":
      return {
        type: "InvalidTextRepresentation",
        column: postgresError.column_name,
        detail: postgresError.detail,
      } as const;

    // 无效的日期时间格式：日期时间字符串格式不正确
    case "22007":
      return {
        type: "InvalidDatetimeFormat",
        detail: postgresError.detail,
      } as const;

    // 日期时间字段溢出：日期时间值超出有效范围
    case "22008":
      return {
        type: "DatetimeFieldOverflow",
        detail: postgresError.detail,
      } as const;

    // 数值超出范围：数值超出字段类型的允许范围
    case "22003":
      return {
        type: "NumericValueOutOfRange",
        column: postgresError.column_name,
        detail: postgresError.detail,
      } as const;

      // ============ 事务错误 (Class 40) ============

    // 序列化失败：并发事务冲突，需要重试
    case "40001":
      return {
        type: "SerializationFailure",
        detail: postgresError.detail,
      } as const;

    // 检测到死锁：两个或多个事务相互等待
    case "40P01":
      return {
        type: "DeadlockDetected",
        detail: postgresError.detail,
      } as const;

      // ============ 权限与对象错误 (Class 42) ============

    // 权限不足：当前用户没有执行操作的权限
    case "42501":
      return {
        type: "InsufficientPrivilege",
        table: postgresError.table_name,
      } as const;

    // 未定义的函数：调用了不存在的函数
    case "42883":
      return {
        type: "UndefinedFunction",
        detail: postgresError.detail,
      } as const;

    // 未定义的列：引用了不存在的列
    case "42703":
      return {
        type: "UndefinedColumn",
        column: postgresError.column_name,
      } as const;

    // 未定义的表：引用了不存在的表
    case "42P01":
      return {
        type: "UndefinedTable",
        table: postgresError.table_name,
      } as const;

    // ============ 其他未知错误 ============
    default:
      return {
        type: "Unknown",
        code: postgresError.code,
        message: postgresError.message,
        detail: postgresError.detail,
      } as const;
  }
}
