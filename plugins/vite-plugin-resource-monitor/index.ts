/**
 * Vite resource monitor plugin
 * Vite 资源监控插件
 *
 * Uses process.getActiveResourcesInfo() to monitor system resource changes before and after HMR
 * Detects potential resource leaks (TCP connections, timers, etc.)
 * 使用 process.getActiveResourcesInfo() 监控 HMR 前后的系统资源变化
 * 检测潜在的资源泄漏（TCP 连接、定时器等）
 *
 * Improvements:
 * - Wait for server to stabilize before recording baseline (avoid false positives during initial connection setup)
 * - Use sliding window to detect continuous growth trends (instead of single comparison)
 * - Smart threshold: alert only when cumulative growth reaches threshold
 * 改进点：
 * - 等待服务器稳定后才记录基线（避免首次连接建立时误报）
 * - 使用滑动窗口检测连续增长趋势（而非单次比较）
 * - 智能阈值：累计增长达到阈值才报警
 */
import type { Plugin, ViteDevServer } from "vite";

import { getActiveResourcesInfo } from "node:process";

// ANSI color codes / ANSI 颜色码
const colors = {
  green: (str: string) => `\x1B[32m${str}\x1B[39m`,
  yellow: (str: string) => `\x1B[33m${str}\x1B[39m`,
  red: (str: string) => `\x1B[31m${str}\x1B[39m`,
  cyan: (str: string) => `\x1B[36m${str}\x1B[39m`,
  dim: (str: string) => `\x1B[2m${str}\x1B[22m`,
  bold: (str: string) => `\x1B[1m${str}\x1B[22m`,
};

type ResourceSnapshot = Record<string, number>;

type SnapshotRecord = {
  snapshot: ResourceSnapshot;
  file: string;
  timestamp: number;
};

type ResourceMonitorOptions = {
  /**
   * Cumulative growth threshold, warn only when exceeded
   * 累计增长阈值，超过此值才警告
   * @default 2
   */
  threshold?: number;
  /**
   * Wait time after HMR (ms), ensure module loading is complete
   * HMR 后等待时间(ms)，确保模块加载完成
   * @default 500
   */
  delay?: number;
  /**
   * Resource types to monitor
   * 需要监控的资源类型
   */
  watchTypes?: string[];
  /**
   * File patterns to ignore
   * 忽略的文件模式
   */
  exclude?: RegExp[];
  /**
   * Stabilization period: record baseline after N consecutive HMR events with unchanged resource count
   * 稳定期：连续 N 次 HMR 资源数不变后才记录基线
   * @default 2
   */
  stabilizeCount?: number;
  /**
   * Sliding window size: detect trends from the last N HMR events
   * 滑动窗口大小：检测最近 N 次 HMR 的趋势
   * @default 3
   */
  windowSize?: number;
  /**
   * Consecutive growth count threshold: alert after N consecutive growths
   * 连续增长次数阈值：连续增长 N 次才报警
   * @default 2
   */
  consecutiveGrowthThreshold?: number;
};

const DEFAULT_WATCH_TYPES = [
  "TCPSocketWrap", // TCP connections (PostgreSQL, Redis) - actual type used by Node.js / TCP 连接 (PostgreSQL, Redis) - Node.js 实际使用的类型
  "TCPWrap", // TCP connections (some Node versions) / TCP 连接（某些 Node 版本）
  "TCPWRAP", // Same as above / 同上
  "TLSWRAP", // TLS connections / TLS 连接
  "TLSSocketWrap", // TLS connections (some Node versions) / TLS 连接（某些 Node 版本）
  // Note: Timeout is not monitored because Redis reconnection mechanism and Vite HMR both create timers / 注意：不监控 Timeout，因为 Redis 重连机制和 Vite HMR 都会创建定时器
];

export default function resourceMonitorPlugin(options?: ResourceMonitorOptions): Plugin {
  const threshold = options?.threshold ?? 2;
  const delay = options?.delay ?? 500;
  const watchTypes = options?.watchTypes ?? DEFAULT_WATCH_TYPES;
  const exclude = options?.exclude ?? [/node_modules/, /\.test\.ts$/, /\.spec\.ts$/];
  const stabilizeCount = options?.stabilizeCount ?? 2;
  const windowSize = options?.windowSize ?? 3;
  const consecutiveGrowthThreshold = options?.consecutiveGrowthThreshold ?? 2;

  // State / 状态
  let baselineSnapshot: ResourceSnapshot | null = null;
  let hmrCount = 0;
  let stabilizeCounter = 0;
  let lastStableSnapshot: ResourceSnapshot | null = null;

  // Sliding window: record the last N snapshots / 滑动窗口：记录最近 N 次快照
  const snapshotHistory: SnapshotRecord[] = [];

  /** Capture current resource snapshot / 获取当前资源快照 */
  function captureSnapshot(): ResourceSnapshot {
    const resources = getActiveResourcesInfo();
    const snapshot: ResourceSnapshot = {};

    for (const type of resources) {
      if (watchTypes.includes(type)) {
        snapshot[type] = (snapshot[type] || 0) + 1;
      }
    }

    return snapshot;
  }

  /** Calculate total resource count of a snapshot / 计算快照的总资源数 */
  function getTotalCount(snapshot: ResourceSnapshot): number {
    return Object.values(snapshot).reduce((sum, count) => sum + count, 0);
  }

  /** Compare whether two snapshots are equal / 比较两个快照是否相等 */
  function snapshotsEqual(a: ResourceSnapshot, b: ResourceSnapshot): boolean {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);

    if (keysA.length !== keysB.length)
      return false;

    for (const key of keysA) {
      if (a[key] !== b[key])
        return false;
    }

    return true;
  }

  /** Detect continuous growth trend within the sliding window / 检测滑动窗口内是否存在连续增长趋势 */
  function detectGrowthTrend(): {
    isGrowing: boolean;
    consecutiveGrowths: number;
    details: Array<{ type: string; baseline: number; current: number; diff: number }>;
  } {
    if (snapshotHistory.length < 2 || !baselineSnapshot) {
      return { isGrowing: false, consecutiveGrowths: 0, details: [] };
    }

    // Calculate change of each snapshot relative to the previous one / 计算每次快照相对于前一次的变化
    let consecutiveGrowths = 0;

    for (let i = 1; i < snapshotHistory.length; i++) {
      const prev = snapshotHistory[i - 1].snapshot;
      const curr = snapshotHistory[i].snapshot;
      const prevTotal = getTotalCount(prev);
      const currTotal = getTotalCount(curr);

      if (currTotal > prevTotal) {
        consecutiveGrowths++;
      }
      else {
        consecutiveGrowths = 0; // Reset counter / 重置计数
      }
    }

    // Calculate detailed changes relative to baseline / 计算相对于基线的详细变化
    const currentSnapshot = snapshotHistory[snapshotHistory.length - 1].snapshot;
    const details: Array<{ type: string; baseline: number; current: number; diff: number }> = [];

    for (const type of watchTypes) {
      const baselineCount = baselineSnapshot[type] || 0;
      const currentCount = currentSnapshot[type] || 0;
      const diff = currentCount - baselineCount;

      if (diff > 0) {
        details.push({ type, baseline: baselineCount, current: currentCount, diff });
      }
    }

    // Determine whether to alert: consecutive growth count reaches threshold AND cumulative growth reaches threshold / 判断是否需要报警：连续增长次数达到阈值 且 累计增长达到阈值
    const totalGrowth = details.reduce((sum, d) => sum + d.diff, 0);
    const isGrowing = consecutiveGrowths >= consecutiveGrowthThreshold && totalGrowth >= threshold;

    return { isGrowing, consecutiveGrowths, details };
  }

  /** Format snapshot as string / 格式化快照为字符串 */
  function formatSnapshot(snapshot: ResourceSnapshot): string {
    const parts = Object.entries(snapshot)
      .filter(([_, count]) => count > 0)
      .map(([type, count]) => `${type}: ${count}`);

    return parts.length > 0 ? parts.join(", ") : "无活跃连接";
  }

  let server: ViteDevServer;

  return {
    name: "vite-plugin-resource-monitor",
    apply: "serve",

    configureServer(_server) {
      server = _server;

      // Watch file changes / 监听文件变化
      server.watcher.on("change", async (file) => {
        // Check file extension / 检查文件扩展名
        if (!file.endsWith(".ts") && !file.endsWith(".tsx"))
          return;

        // Check exclusion rules / 检查排除规则
        if (exclude.some(pattern => pattern.test(file)))
          return;

        hmrCount++;
        const relativePath = file.replace(`${process.cwd()}/`, "");

        // Wait for module reload to complete / 等待模块重新加载完成
        await new Promise(resolve => setTimeout(resolve, delay));

        // Capture current snapshot / 捕获当前快照
        const currentSnapshot = captureSnapshot();
        const currentRecord: SnapshotRecord = {
          snapshot: currentSnapshot,
          file: relativePath,
          timestamp: Date.now(),
        };

        // Phase 1: Wait for stabilization period / 阶段1：等待稳定期
        if (!baselineSnapshot) {
          if (lastStableSnapshot === null) {
            // First record / 首次记录
            lastStableSnapshot = currentSnapshot;
            stabilizeCounter = 1;
            return;
          }

          // Check if same as last time / 检查是否与上次相同
          if (snapshotsEqual(currentSnapshot, lastStableSnapshot)) {
            stabilizeCounter++;
            server.config.logger.info(
              colors.dim(`[资源监控] 等待稳定中... (${stabilizeCounter}/${stabilizeCount})`),
            );

            if (stabilizeCounter >= stabilizeCount) {
              // Stabilization period ended, record baseline / 稳定期结束，记录基线
              baselineSnapshot = currentSnapshot;
              snapshotHistory.push(currentRecord);
              server.config.logger.info(
                `${colors.green("[资源监控]")} 基线已记录: ${colors.cyan(formatSnapshot(baselineSnapshot))}`,
              );
            }
          }
          else {
            // Resource changed, reset counter / 资源变化，重置计数
            lastStableSnapshot = currentSnapshot;
            stabilizeCounter = 1;
            server.config.logger.info(
              colors.dim(`[资源监控] 资源变化，重新等待稳定... (${stabilizeCounter}/${stabilizeCount})`),
            );
          }
          return;
        }

        // Phase 2: Normal monitoring / 阶段2：正常监控
        // Add to sliding window / 添加到滑动窗口
        snapshotHistory.push(currentRecord);
        if (snapshotHistory.length > windowSize) {
          snapshotHistory.shift();
        }

        // Detect growth trend / 检测增长趋势
        const { isGrowing, consecutiveGrowths, details } = detectGrowthTrend();

        if (isGrowing && details.length > 0) {
          const totalGrowth = details.reduce((sum, d) => sum + d.diff, 0);

          server.config.logger.warn(
            `\n${colors.yellow("[资源监控]")} ${colors.bold("检测到资源持续增长")}`,
          );
          server.config.logger.warn(
            `  ${colors.dim("触发文件:")} ${colors.cyan(relativePath)}`,
          );
          server.config.logger.warn(
            `  ${colors.dim("HMR 次数:")} ${hmrCount}`,
          );
          server.config.logger.warn(
            `  ${colors.dim("连续增长:")} ${colors.red(`${consecutiveGrowths} 次`)}`,
          );
          server.config.logger.warn(
            `  ${colors.dim("累计增长:")} ${colors.red(`+${totalGrowth} 个连接`)}`,
          );

          server.config.logger.warn(
            colors.dim("  详情:"),
          );
          for (const { type, baseline, current, diff } of details) {
            server.config.logger.warn(
              `    ${colors.dim(`${type}:`)} ${baseline} → ${current} ${colors.red(`(+${diff})`)}`,
            );
          }

          server.config.logger.warn(
            colors.dim("\n  提示: 连接数持续增长可能存在泄漏，建议:"),
          );
          server.config.logger.warn(
            colors.dim("    1. 使用 createSingleton 包裹数据库/Redis 客户端"),
          );
          server.config.logger.warn(
            colors.dim("    2. 检查是否有未清理的连接或监听器"),
          );
          server.config.logger.warn(
            colors.dim("  参考: src/lib/internal/singleton.ts\n"),
          );
        }
      });
    },
  };
}

export { DEFAULT_WATCH_TYPES };
