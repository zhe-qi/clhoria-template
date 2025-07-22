export interface AppConfig {
  name: string;
  title: string;
  token?: string;
}

export interface ScalarSource {
  title: string;
  slug: string;
  url: string;
  default: boolean;
}

export interface ScalarAuthentication {
  securitySchemes: Record<string, { token: string }>;
}
