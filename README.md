# Antigravity Auth to API

<div align="center">

[English](README.md) | [中文说明](README_zh.md)

</div>

Use Google's internal Cloud Code API (`daily-cloudcode-pa`) via a standard OpenAI-compatible interface. This Cloudflare Worker acts as a proxy/wrapper, handling the complex internal protocol details like Project ID discovery, request wrapping, and model mapping.

## Features

- **Internal API Access**: Unlocks access to Google's internal `daily-cloudcode-pa.sandbox.googleapis.com` API using standard Google OAuth credentials.
- **OpenAI Compatibility**: Provides a `/v1/chat/completions` endpoint that works with existing OpenAI clients.
- **Auto Project ID**: Automatically discovers the user's Google Cloud Project ID required for the internal API using `loadCodeAssist`.
- **Model Mapping**: Automatically maps public model names (e.g., `gemini-2.0-flash-exp`) to their internal counterparts (e.g., `gemini-3-flash`).
- **Streaming Support**: Full Server-Sent Events (SSE) support for real-time responses.
- **Authentication**: Built-in `/auth` page for easy Google OAuth linking and token management.

## Prerequisites

- **Node.js**: v18.0.0 or later.
- **npm**: v9.0.0 or later.
- **Cloudflare Account**: Required for deploying Workers and using KV storage.

## Installation & Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/antigravity-unified-api.git
   cd antigravity-unified-api
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Login to Cloudflare**
   ```bash
   npx wrangler login
   ```

4. **Create KV Namespace (Important)**
   You need to create a KV Namespace to store user sessions.
   ```bash
   npx wrangler kv:namespace create SESSIONS
   ```
   *Copy the `id` from the output and update your `wrangler.toml` file:*
   ```toml
   [[kv_namespaces]]
   binding = "SESSIONS"
   id = "YOUR_KV_ID_HERE"
   ```

5. **Deploy to Cloudflare Workers**
   ```bash
   npx wrangler deploy
   ```

## Usage

### 1. Authentication
After deployment, visit your worker's base URL and append `/auth` (e.g., `https://your-worker.workers.dev/auth`).
1. Click the "Connect Google Account" button.
2. Complete the OAuth flow.
3. Once successful, your Refresh Token is securely stored in the Worker's KV storage.

### 2. API Configuration
You can now use any OpenAI-compatible client (e.g., cursor, vscode, python-openai).

- **Base URL**: `https://your-worker.workers.dev/v1`
- **API Key**: `any-string` (The worker uses the internal session for auth, but most clients require a non-empty key).

### 3. Supported Models
The worker automatically maps these public model names to internal Google models:

| Public Name | Internal Mapping |
|-------------|------------------|
| `gemini-2.0-flash-exp` | `gemini-3-flash` |
| `gemini-pro` | `gemini-3-pro-high` |
| `claude-3-5-sonnet` | `claude-sonnet-4-5` |

### 4. Example Request (cURL)
```bash
curl -X POST https://your-worker.workers.dev/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-any-key" \
  -d '{
    "model": "gemini-2.0-flash-exp",
    "messages": [{"role": "user", "content": "Hello! who are you?"}],
    "stream": true
  }'
```

## Configuration

The `wrangler.toml` file controls the Worker's configuration.
- `name`: The name of your worker.
- `kv_namespaces`: Bindings for storage.

> [!NOTE]
> The default `wrangler.toml` contains a placeholder KV ID. You **MUST** replace it with your own ID generated in step 4 of Installation.

## Disclaimer
This tool is for educational and research purposes only. It interacts with internal Google APIs which may change or break at any time. Use at your own risk.
