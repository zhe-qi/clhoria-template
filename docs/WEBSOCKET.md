# WebSocket 集成指南

本项目提供了两种 WebSocket 集成方案：Socket.IO 和 @hono/node-ws，都支持 JWT 认证。

## 当前实现：Socket.IO

### 概述

项目已集成 Socket.IO 服务器，提供以下功能：
- JWT 认证（支持客户端和管理员双重密钥）
- 基于域的房间管理
- 权限验证（普通用户和管理员权限）
- 实时消息传输
- 错误处理和连接管理

### 架构

```
src/
├── middlewares/
│   └── socket-jwt-auth.ts      # Socket.IO JWT 认证中间件
├── lib/
│   └── socket-server.ts        # Socket.IO 服务器配置和事件处理
└── index.ts                    # 服务器启动入口
```

### JWT 认证

#### 认证方式

Socket.IO 支持多种 token 传递方式：

```javascript
// 方式1：通过 auth 对象（推荐）
const socket = io('http://localhost:3000', {
  auth: {
    token: 'your-jwt-token'
  }
});

// 方式2：通过 query 参数
const socket = io('http://localhost:3000?token=your-jwt-token');

// 方式3：通过 Authorization header
const socket = io('http://localhost:3000', {
  extraHeaders: {
    Authorization: 'Bearer your-jwt-token'
  }
});
```

#### 认证流程

1. 客户端连接时提供 JWT token
2. 服务器验证 token（先尝试客户端密钥，失败后尝试管理员密钥）
3. 验证成功后提取用户信息（userId, userDomain, tokenType）
4. 认证失败则拒绝连接

### 支持的事件

#### 房间管理

```javascript
// 加入域房间（所有认证用户）
socket.emit('join_domain_room');

// 加入管理员房间（仅管理员）
socket.emit('join_admin_room');
```

#### 消息传输

```javascript
// 发送消息到房间
socket.emit('send_message', {
  room: 'domain:your-domain', // 或 'admin:your-domain'
  message: 'Hello World'
});

// 接收消息
socket.on('message', (data) => {
  console.log('收到消息:', data);
  // data: {
  //   userId: '...',
  //   userDomain: '...',
  //   tokenType: 'client' | 'admin',
  //   message: '...',
  //   timestamp: '...'
  // }
});
```

#### 用户信息

```javascript
// 获取当前用户信息
socket.emit('get_user_info');

socket.on('user_info', (data) => {
  console.log('用户信息:', data);
  // data: {
  //   userId: '...',
  //   userDomain: '...',
  //   tokenType: 'client' | 'admin',
  //   authenticated: true
  // }
});
```

#### 错误处理

```javascript
// 监听错误事件
socket.on('error', (error) => {
  console.error('Socket 错误:', error.message);
});

// 监听连接错误
socket.on('connect_error', (error) => {
  console.error('连接错误:', error.message);
});
```

### 权限验证

- **域隔离**：用户只能访问自己域的房间
- **管理员权限**：只有管理员可以访问 admin 房间
- **消息验证**：发送消息前验证房间访问权限

## 替代方案：@hono/node-ws

如果需要更轻量级的 WebSocket 实现，可以使用 @hono/node-ws：

### 安装

```bash
pnpm add @hono/node-ws
```

### 基本用法

```typescript
import { Hono } from 'hono';
import { createNodeWebSocket } from '@hono/node-ws';

const { injectWebSocket, upgradeWebSocket } = createNodeWebSocket({ app });

const app = new Hono();

// WebSocket 路由
app.get('/ws', upgradeWebSocket((c) => {
  return {
    onOpen(evt, ws) {
      console.log('WebSocket 连接已建立');
    },
    onMessage(evt, ws) {
      console.log('收到消息:', evt.data);
      ws.send('服务器回复: ' + evt.data);
    },
    onClose(evt, ws) {
      console.log('WebSocket 连接已关闭');
    },
  };
}));

// 启动服务器
const server = serve({
  fetch: app.fetch,
  port: 3000,
});

injectWebSocket(server);
```

### JWT 认证集成

```typescript
import { jwt } from 'hono/jwt';

// 在 WebSocket 升级前进行 JWT 验证
app.get('/ws',
  jwt({ secret: env.CLIENT_JWT_SECRET }), // JWT 中间件
  upgradeWebSocket((c) => {
    const payload = c.get('jwtPayload');
    const userId = payload.uid;
    const userDomain = payload.domain;

    return {
      onOpen(evt, ws) {
        console.log(`用户 ${userId} 连接成功`);
      },
      onMessage(evt, ws) {
        // 处理认证用户的消息
      },
    };
  })
);
```

## 方案对比

| 特性 | Socket.IO | @hono/node-ws |
|------|-----------|---------------|
| 包大小 | 较大 | 轻量级 |
| 功能丰富度 | 丰富（房间、命名空间等） | 基础 |
| 浏览器兼容性 | 优秀（自动降级） | 现代浏览器 |
| 传输方式 | WebSocket + Polling | 仅 WebSocket |
| 学习成本 | 中等 | 较低 |
| 生态系统 | 成熟 | 新兴 |

## 开发建议

1. **生产环境**：推荐使用 Socket.IO，功能完整且稳定
2. **轻量级需求**：可考虑 @hono/node-ws
3. **认证安全**：始终在 WebSocket 连接中进行 JWT 验证
4. **错误处理**：实现完善的错误处理和重连机制
5. **性能优化**：合理使用房间功能，避免全局广播

## 配置说明

### 环境变量

```bash
# JWT 密钥（必需）
CLIENT_JWT_SECRET=your-client-secret
ADMIN_JWT_SECRET=your-admin-secret

# 端口配置
PORT=3000
```

### CORS 配置

生产环境下会自动禁用 CORS，开发环境允许所有来源：

```typescript
cors: {
  origin: env.NODE_ENV === "production" ? false : "*",
  credentials: true,
}
```

### 传输方式

默认启用 WebSocket 和 Polling，可根据需要调整：

```typescript
transports: ["websocket", "polling"]
```

## 故障排除

### 常见问题

1. **认证失败**
   - 检查 JWT token 是否正确
   - 确认使用正确的 secret
   - 验证 token 是否过期

2. **连接失败**
   - 检查服务器是否正常启动
   - 确认端口配置正确
   - 验证防火墙设置

3. **消息无法发送**
   - 确认已加入对应房间
   - 检查权限验证逻辑
   - 验证消息格式正确

### 调试建议

1. 启用详细日志
2. 使用浏览器开发者工具监控 WebSocket 连接
3. 检查服务器端错误日志
4. 验证 JWT token 内容

## 扩展功能

### 自定义事件

可根据业务需求添加自定义事件：

```typescript
socket.on('custom_event', (data) => {
  // 自定义业务逻辑
  if (!requireAuth(socket)) {
    return socket.emit('error', { message: '需要认证' });
  }

  // 处理业务逻辑
});
```

### 中间件扩展

可以创建额外的中间件进行功能扩展：

```typescript
// 限流中间件
io.use((socket, next) => {
  // 实现连接限流逻辑
  next();
});

// 日志中间件
io.use((socket, next) => {
  // 记录连接日志
  next();
});
```
