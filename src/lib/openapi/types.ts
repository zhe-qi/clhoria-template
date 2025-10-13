/**
 * 应用OpenAPI配置
 */
export interface AppConfig {
  /**
   * 应用名称
   */
  name: string;
  /**
   * 应用标题
   */
  title: string;
  /**
   * 应用令牌
   */
  token?: string;
}

/**
 * Scalar源配置
 */
export interface ScalarSource {
  /**
   * 应用标题
   */
  title: string;
  /**
   * 应用slug
   */
  slug: string;
  /**
   * 应用URL
   */
  url: string;
  /**
   * 是否默认
   */
  default: boolean;
}

/**
 * Scalar认证配置
 */
export interface ScalarAuthentication {
  /**
   * 应用安全方案
   */
  securitySchemes: Record<string, { token: string }>;
}
