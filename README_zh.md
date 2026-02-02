# Antigravity Auth to API (Google 内网 API 鉴权代理)

<div align="center">

[English](README.md) | [中文说明](README_zh.md)

</div>

通过标准的 OpenAI 兼容接口调用 Google 内部的 Cloud Code API (`daily-cloudcode-pa`)。这也是一个 Cloudflare Worker 项目，作为代理/封装层，处理 Project ID 获取、请求封装和模型映射等复杂的内部协议细节。

## 功能特性

- **内部 API 访问**: 解锁对 Google 内部 `daily-cloudcode-pa.sandbox.googleapis.com` API 的访问权限。
- **OpenAI 兼容性**: 提供标准的 `/v1/chat/completions` 接口，可直接接入现有的 OpenAI 客户端。
- **自动 Project ID**: 使用 `loadCodeAssist` 接口自动获取内部 API 所需的 Google Cloud Project ID。
- **模型映射**: 自动将公共模型名称 (如 `gemini-2.0-flash-exp`) 映射到内部 ID (如 `gemini-3-flash`)。
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
Worker 会自动将以下公共模型名称映射到 Google 内部模型 ID：

| 公共名称 | 内部映射 |
|-------------|------------------|
| `gemini-2.0-flash-exp` | `gemini-3-flash` |
| `gemini-pro` | `gemini-3-pro-high` |
| `claude-3-5-sonnet` | `claude-sonnet-4-5` |

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
本工具仅供学习和研究使用。它调用了 Google 的内部 API 接口，这些接口随时可能更改或失效。使用风险自负。
