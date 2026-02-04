// API Key management module
import { Env } from './types';

export interface ApiKey {
  id: string;
  name: string;
  keyHash: string;      // SHA-256 hash of the key
  keyPrefix: string;    // First 8 chars for display (sk-ag-xxxx...)
  created_at: number;
  last_used?: number;
}

const API_KEY_PREFIX = "sk-ag-";

// Generate a secure random API key
export function generateApiKeyValue(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let key = API_KEY_PREFIX;
  for (let i = 0; i < 48; i++) {
    key += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return key;
}

// Hash API key using SHA-256
async function hashKey(key: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(key);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Create a new API key
export async function createApiKey(env: Env, name: string): Promise<{ apiKey: ApiKey; rawKey: string }> {
  const rawKey = generateApiKeyValue();
  const keyHash = await hashKey(rawKey);
  const id = crypto.randomUUID();
  
  const apiKey: ApiKey = {
    id,
    name,
    keyHash,
    keyPrefix: rawKey.slice(0, 12) + '...',
    created_at: Date.now(),
  };
  
  await env.SESSIONS.put(`apikey:${id}`, JSON.stringify(apiKey));
  
  return { apiKey, rawKey };
}

// Validate API key and return metadata if valid
export async function validateApiKey(env: Env, rawKey: string): Promise<ApiKey | null> {
  if (!rawKey || !rawKey.startsWith(API_KEY_PREFIX)) {
    return null;
  }
  
  const keyHash = await hashKey(rawKey);
  
  // Search through all API keys
  let cursor: string | undefined;
  let listComplete = false;
  
  while (!listComplete) {
    const result = await env.SESSIONS.list({ prefix: "apikey:", cursor }) as { 
      keys: { name: string }[], 
      list_complete: boolean, 
      cursor?: string 
    };
    
    for (const k of result.keys) {
      const data = await env.SESSIONS.get(k.name, "json") as ApiKey | null;
      if (data && data.keyHash === keyHash) {
        // Update last_used
        data.last_used = Date.now();
        await env.SESSIONS.put(k.name, JSON.stringify(data));
        return data;
      }
    }
    
    listComplete = result.list_complete;
    cursor = result.cursor;
  }
  
  return null;
}

// List all API keys (without revealing full keys)
export async function listApiKeys(env: Env): Promise<ApiKey[]> {
  const keys: ApiKey[] = [];
  let cursor: string | undefined;
  let listComplete = false;
  
  while (!listComplete) {
    const result = await env.SESSIONS.list({ prefix: "apikey:", cursor }) as { 
      keys: { name: string }[], 
      list_complete: boolean, 
      cursor?: string 
    };
    
    for (const k of result.keys) {
      const data = await env.SESSIONS.get(k.name, "json") as ApiKey | null;
      if (data) {
        keys.push(data);
      }
    }
    
    listComplete = result.list_complete;
    cursor = result.cursor;
  }
  
  return keys.sort((a, b) => b.created_at - a.created_at);
}

// Delete an API key
export async function deleteApiKey(env: Env, id: string): Promise<boolean> {
  const key = `apikey:${id}`;
  const exists = await env.SESSIONS.get(key);
  if (!exists) return false;
  
  await env.SESSIONS.delete(key);
  return true;
}
