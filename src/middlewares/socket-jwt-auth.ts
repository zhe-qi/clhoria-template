import type { Socket } from "socket.io";

import { verify } from "hono/jwt";

import env from "@/env";

/**
 * 扩展 Socket 接口以包含用户信息
 */
declare module "socket.io" {
  interface Socket {
    userId?: string;
    userDomain?: string;
    tokenType?: "client" | "admin";
    authenticated?: boolean;
  }
}

/**
 * Socket.IO JWT 认证中间件
 * 支持多种 token 传递方式，兼容现有的 JWT 认证体系
 */
export function createSocketJwtAuth() {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      // 从多个来源获取 token
      let token: string | undefined;

      // 1. 优先从 auth 对象获取（推荐方式）
      if (socket.handshake.auth?.token) {
        token = socket.handshake.auth.token;
      }
      // 2. 从 query 参数获取
      else if (socket.handshake.query?.token) {
        token = Array.isArray(socket.handshake.query.token)
          ? socket.handshake.query.token[0]
          : socket.handshake.query.token;
      }
      // 3. 从 Authorization header 获取
      else if (socket.handshake.headers.authorization) {
        const authHeader = socket.handshake.headers.authorization;
        if (authHeader.startsWith("Bearer ")) {
          token = authHeader.slice(7);
        }
      }

      if (!token) {
        return next(new Error("认证令牌缺失"));
      }

      // 尝试使用客户端 JWT 密钥验证
      let payload: any;
      let tokenType: "client" | "admin";

      try {
        payload = await verify(token, env.CLIENT_JWT_SECRET, "HS256");
        tokenType = "client";
      }
      catch {
        try {
          // 如果客户端验证失败，尝试管理员密钥
          payload = await verify(token, env.ADMIN_JWT_SECRET, "HS256");
          tokenType = "admin";
        }
        catch {
          return next(new Error("认证令牌无效"));
        }
      }

      // 验证必要的 payload 字段
      if (!payload.uid || !payload.domain) {
        return next(new Error("认证令牌格式无效"));
      }

      // 将用户信息附加到 socket
      socket.userId = payload.uid;
      socket.userDomain = payload.domain;
      socket.tokenType = tokenType;
      socket.authenticated = true;

      next();
    }
    catch (error: any) {
      next(new Error(`认证失败: ${error.message}`));
    }
  };
}

/**
 * 可选的 Socket.IO JWT 认证中间件
 * 认证失败时阻止连接
 */
export function createOptionalSocketJwtAuth() {
  return async (socket: Socket, next: (err?: Error) => void) => {
    try {
      const authMiddleware = createSocketJwtAuth();
      await new Promise<void>((resolve, reject) => {
        authMiddleware(socket, (error) => {
          if (error) {
            // 认证失败时拒绝连接
            reject(error);
          }
          else {
            resolve();
          }
        });
      });

      next();
    }
    catch (error) {
      // 认证失败时拒绝连接
      next(error as Error);
    }
  };
}

/**
 * 检查 socket 是否已认证的辅助函数
 */
export function requireAuth(socket: Socket): boolean {
  return socket.authenticated === true && !!socket.userId && !!socket.userDomain;
}

/**
 * 检查 socket 是否为管理员的辅助函数
 */
export function requireAdmin(socket: Socket): boolean {
  return requireAuth(socket) && socket.tokenType === "admin";
}

/**
 * 验证用户是否属于指定域的辅助函数
 */
export function requireDomain(socket: Socket, domain: string): boolean {
  return requireAuth(socket) && socket.userDomain === domain;
}
