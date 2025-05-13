export {};

declare global {
  interface ParamsType<T = any> {
    [key: string]: T;
  }
}
