# Antigravity Auth to API

<div align="center">

[English](README.md) | [中文说明](README_zh.md)

</div>

一个统一的 API 网关，提供与 OpenAI 兼容的接口，用于访问 Antigravity 服务。该 Cloudflare Worker 负责处理身份验证、会话管理和模型适配，作为标准 AI 客户端与后端服务之间的桥梁。

## 功能特性

- **统一 API 访问**: 无缝连接 Antigravity 后端服务。
- **OpenAI 兼容性**: 提供标准的 `/v1/chat/completions` 接口，可直接接入现有的 OpenAI 客户端。
- **自动配置**: 自动管理项目上下文和连接细节。
- **模型映射**: 自动将公共模型名称 (如 `gemini-2.0-flash-exp`) 映射到后端对应模型。
- **流式支持**: 完整支持 Server-Sent Events (SSE) 流式响应。
- **身份验证**: 内置 `/auth` 页面，方便进行 Google OAuth 授权和 Token 管理。

## 前置要求

- **Node.js**: v18.0.0 或更高版本。
- **npm**: v9.0.0 或更高版本。
- **Cloudflare 账号**: 用于部署 Worker 和使用 KV 存储。

## 安装与部署

1. **克隆仓库**
   ```bash
   git clone https://github.com/your-username/antigravity-unified-api.git
   cd antigravity-unified-api
   ```

2. **安装依赖**
   ```bash
   npm install
   ```

3. **登录 Cloudflare**
   ```bash
   npx wrangler login
   ```

4. **创建 KV Namespace (重要)**
   你需要创建一个 KV 命名空间来存储用户会话。
   ```bash
   npx wrangler kv:namespace create SESSIONS
   ```
   *复制输出中的 `id` 并更新你的 `wrangler.toml` 文件:*
   ```toml
   [[kv_namespaces]]
   binding = "SESSIONS"
   id = "YOUR_KV_ID_HERE"
   ```

5. **部署到 Cloudflare Workers**
   ```bash
   npx wrangler deploy
   ```

## 使用指南

### 1. 身份验证
部署完成后，访问您的 Worker 地址并加上 `/auth` 后缀 (例如 `https://your-worker.workers.dev/auth`)。
1. 点击 "Connect Google Account" 按钮。
2. 完成 OAuth 授权流程。
3. 成功后，您的 Refresh Token 将安全地存储在 Worker 的 KV 中。

### 2. API 配置
现在您可以使用任何与其兼容的 OpenAI 客户端 (如 cursor, vscode, python-openai)。

- **Base URL**: `https://your-worker.workers.dev/v1`
- **API Key**: `any-string` (Worker 内部使用 Session 认证，但大多数客户端需要填入非空字符串)。

### 3. 支持的模型
Worker 会自动将以下公共模型名称映射到后端模型：

| 公共名称 |
|-------------|
| `gemini-2.0-flash-exp` |
| `gemini-pro` |
| `claude-3-5-sonnet` |

### 4. 请求示例 (cURL)
```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-any-key" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{"role": "user", "content": "你好！你是谁？"}],
    "stream": true
  }'
```

## 配置说明

`wrangler.toml` 文件控制 Worker 的主要配置。
- `name`: Worker 的服务名称。
- `kv_namespaces`: 存储绑定配置。

> [!NOTE]
> 默认的 `wrangler.toml` 包含一个占位符 KV ID。你**必须**将其替换为你自己在第 4 步中生成的 ID。

## 免责声明
本工具仅供学习和研究使用。使用风险自负。
