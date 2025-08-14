/* eslint-disable no-console */
import type { Server as HTTPServer } from "node:http";

import { Server } from "socket.io";

import env from "@/env";
import { createSocketJwtAuth, requireAdmin, requireAuth, requireDomain } from "@/middlewares/socket-jwt-auth";

/**
 * 创建并配置 Socket.IO 服务器
 */
export function createSocketServer(httpServer: HTTPServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: env.NODE_ENV === "production" ? false : "*",
      credentials: true,
    },
    // 当然，好像也可以把 polling 关了节省带宽
    transports: ["websocket", "polling"],
  });

  // 应用 JWT 认证中间件
  io.use(createSocketJwtAuth());

  // 配置连接处理
  setupConnectionHandlers(io);

  return io;
}

/**
 * 设置 Socket.IO 连接处理器
 */
function setupConnectionHandlers(io: Server): void {
  io.on("connection", (socket) => {
    // 连接成功日志
    console.log(`用户 ${socket.userId} (域: ${socket.userDomain}, 类型: ${socket.tokenType}) 已连接 [${socket.id}]`);

    /** 用户加入特定域的房间 */
    socket.on("join_domain_room", () => {
      if (!requireAuth(socket)) {
        return socket.emit("error", { message: "需要认证" });
      }

      const domainRoom = `domain:${socket.userDomain}`;
      socket.join(domainRoom);
      socket.emit("joined_room", { room: domainRoom });
      console.log(`用户 ${socket.userId} 加入域房间: ${domainRoom}`);
    });

    /** 管理员专用房间 */
    socket.on("join_admin_room", () => {
      if (!requireAdmin(socket)) {
        return socket.emit("error", { message: "需要管理员权限" });
      }

      const adminRoom = `admin:${socket.userDomain}`;
      socket.join(adminRoom);
      socket.emit("joined_room", { room: adminRoom });
      console.log(`管理员 ${socket.userId} 加入管理员房间: ${adminRoom}`);
    });

    /** 向特定房间发送消息 */
    socket.on("send_message", (data) => {
      if (!requireAuth(socket)) {
        return socket.emit("error", { message: "需要认证" });
      }

      const { room, message } = data;

      // 验证用户是否有权限向该房间发送消息
      if (room.startsWith("domain:") && !requireDomain(socket, room.split(":")[1])) {
        return socket.emit("error", { message: "无权限访问该域" });
      }

      if (room.startsWith("admin:") && !requireAdmin(socket)) {
        return socket.emit("error", { message: "需要管理员权限" });
      }

      // 广播消息到房间
      io.to(room).emit("message", {
        userId: socket.userId,
        userDomain: socket.userDomain,
        tokenType: socket.tokenType,
        message,
        timestamp: new Date().toISOString(),
      });
    });

    /** 获取用户信息 */
    socket.on("get_user_info", () => {
      if (!requireAuth(socket)) {
        return socket.emit("error", { message: "需要认证" });
      }

      socket.emit("user_info", {
        userId: socket.userId,
        userDomain: socket.userDomain,
        tokenType: socket.tokenType,
        authenticated: socket.authenticated,
      });
    });

    /** 断开连接处理 */
    socket.on("disconnect", (reason) => {
      console.log(`用户 ${socket.userId} 断开连接 [${socket.id}]: ${reason}`);
    });

    /** 认证错误处理 */
    socket.on("connect_error", (error) => {
      console.error(`连接错误 [${socket.id}]:`, error.message);
    });
  });
}
