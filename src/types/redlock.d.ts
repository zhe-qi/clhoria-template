declare module "redlock" {
  import type { Cluster, Redis } from "ioredis";

  export type Settings = {
    driftFactor?: number;
    retryCount?: number;
    retryDelay?: number;
    retryJitter?: number;
    automaticExtensionThreshold?: number;
  };

  export type Lock = {
    readonly resources: string[];
    readonly value: string;
    readonly attempts: number;
    expiration: number;
    release: () => Promise<ExecutionResult>;
    extend: (duration: number) => Promise<Lock>;
  };

  export type ExecutionResult = {
    attempts: number;
  };

  export type Client = Redis | Cluster;

  export default class Redlock {
    constructor(clients: Client[], settings?: Settings);

    acquire(
      resources: string[],
      duration: number,
      settings?: Partial<Settings>,
    ): Promise<Lock>;

    release(lock: Lock, settings?: Partial<Settings>): Promise<ExecutionResult>;

    extend(
      existing: Lock,
      duration: number,
      settings?: Partial<Settings>,
    ): Promise<Lock>;

    using<T>(
      resources: string[],
      duration: number,
      routine: (signal: AbortSignal) => Promise<T>,
    ): Promise<T>;

    using<T>(
      resources: string[],
      duration: number,
      settings: Partial<Settings>,
      routine: (signal: AbortSignal) => Promise<T>,
    ): Promise<T>;

    quit(): Promise<void>;
  }
}
