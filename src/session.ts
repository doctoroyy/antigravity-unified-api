
import { Env, GoogleSession, AnthropicSession } from './types';

export const sessions: { google: GoogleSession[]; anthropic: AnthropicSession[] } = { google: [], anthropic: [] };
export let sessionsLoaded = false;

export async function loadSessions(env: Env) {
  sessions.google = [];
  sessions.anthropic = [];
  
  let listComplete = false;
  let cursor: string | undefined;
  
  while (!listComplete) {
    const result = await env.SESSIONS.list({ prefix: "", cursor }) as { keys: { name: string }[], list_complete: boolean, cursor?: string };
    const keys = result.keys;
    listComplete = result.list_complete;
    cursor = result.cursor;
    
    for (const k of keys) {
      if (k.name.startsWith("google:")) {
        const data = await env.SESSIONS.get(k.name, "json");
        if (data) sessions.google.push(data as GoogleSession);
      } else if (k.name.startsWith("anthropic:")) {
        const data = await env.SESSIONS.get(k.name, "json");
        if (data) sessions.anthropic.push(data as AnthropicSession);
      }
    }
  }
  sessionsLoaded = true;
}

export async function saveGoogleSession(env: Env, session: GoogleSession) {
  await env.SESSIONS.put(`google:${session.email}`, JSON.stringify(session));
  const idx = sessions.google.findIndex(s => s.email === session.email);
  if (idx >= 0) sessions.google[idx] = session; else sessions.google.push(session);
}

export async function saveAnthropicSession(env: Env, session: AnthropicSession) {
  await env.SESSIONS.put(`anthropic:${session.id}`, JSON.stringify(session));
  const idx = sessions.anthropic.findIndex(s => s.id === session.id);
  if (idx >= 0) sessions.anthropic[idx] = session; else sessions.anthropic.push(session);
}

const lastUsedIndex: { google: number, anthropic: number } = { google: 0, anthropic: 0 };

export function selectSession(provider: "google" | "anthropic", explicitIndex?: number): GoogleSession | AnthropicSession | null {
  const list = provider === "google" ? sessions.google : sessions.anthropic;
  if (list.length === 0) return null;

  const now = Date.now();
  const available = list.filter(acc => !acc.blocked_until || acc.blocked_until <= now);
  if (available.length === 0) return null;

  if (explicitIndex !== undefined) {
    const idx = Math.max(0, Math.min(explicitIndex, available.length - 1));
    return available[idx];
  }

  const idx = provider === "google" 
    ? (lastUsedIndex.google + 1) % available.length 
    : (lastUsedIndex.anthropic + 1) % available.length;
  
  if (provider === "google") lastUsedIndex.google = idx;
  else lastUsedIndex.anthropic = idx;
  
  return available[idx];
}

export async function blockSession(env: { SESSIONS: KVNamespace }, provider: "google" | "anthropic", session: GoogleSession | AnthropicSession, durationMs: number) {
  const until = Date.now() + durationMs;
  // Update in-memory
  if (provider === "google") {
    (session as GoogleSession).blocked_until = until;
    // Persist to KV
    await env.SESSIONS.put(`google:${(session as GoogleSession).email}`, JSON.stringify(session));
  } else {
    (session as AnthropicSession).blocked_until = until;
    await env.SESSIONS.put(`anthropic:${(session as AnthropicSession).id}`, JSON.stringify(session));
  }
}
