/// <reference types="vite/client" />

export {};

declare global {
  // eslint-disable-next-line ts/consistent-type-definitions
  interface ParamsType<T = any> {
    [key: string]: T;
  }
}
