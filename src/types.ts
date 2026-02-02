
export interface Env {
  SESSIONS: KVNamespace;
}

export interface GoogleSession {
  email: string;
  refresh_token: string;
  access_token?: string;
  access_expires_at?: number; // timestamp (ms) when access token expires
  blocked_until?: number;     // timestamp (ms) if temporarily blocked due to errors
  project_id?: string;        // Google Cloud Project ID (required for internal APIs)
}

export interface AnthropicSession {
  id: string;       // an identifier (could be last 6 of key or a label)
  api_key: string;
  blocked_until?: number;
}

export interface ChatMessage {
  role: string;
  content: string;
}

export interface ContentPart {
  text?: string;
}

export interface ContentObject {
  parts?: ContentPart[];
  text?: string;
}
