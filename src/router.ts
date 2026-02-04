
import { Env, GoogleSession, AnthropicSession, ChatMessage, ContentObject } from './types';
import * as auth from './auth';
import * as sessionFn from './session';
import * as adapter from './adapter';
import { AUTH_PAGE_HTML, getManualAuthHtml, ADMIN_LOGIN_HTML, getAdminPanelHtml } from './html';
import { ClaudeStreamAdapter } from './claude_stream';
import { CODE_ASSIST_ENDPOINT, CODE_ASSIST_ENDPOINT_FALLBACKS, CODE_ASSIST_HEADERS } from './constants';
import { getModelFamily } from './model_mapping';
import * as apikeys from './apikeys';

// Simple session token for admin (stored in memory, reset on worker restart)
const adminSessions = new Set<string>();

// Helper to parse cookies from request
function getCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie") || "";
  const cookies = cookieHeader.split(";").map(c => c.trim());
  for (const cookie of cookies) {
    const [key, value] = cookie.split("=");
    if (key === name) return value;
  }
  return null;
}

export async function handleRequest(request: Request, env: Env): Promise<Response> {
  // Ensure sessions loaded
  if (!sessionFn.sessionsLoaded) {
    await sessionFn.loadSessions(env);
  }

  const url = new URL(request.url);
  const path = url.pathname;

  // --- 0. Admin Routes (No API key required) ---
  if (path === "/admin" || path === "/admin/") {
    const sessionToken = getCookie(request, "admin_session");
    if (!sessionToken || !adminSessions.has(sessionToken)) {
      return new Response(ADMIN_LOGIN_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
    }
    const keys = await apikeys.listApiKeys(env);
    return new Response(getAdminPanelHtml(keys), { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
  }

  if (path === "/admin/login" && request.method === "POST") {
    const formData = await request.formData();
    const password = formData.get("password")?.toString() || "";
    const adminPassword = env.ADMIN_PASSWORD || "antigravity2026";
    
    if (password === adminPassword) {
      const sessionToken = crypto.randomUUID();
      adminSessions.add(sessionToken);
      return new Response(null, {
        status: 302,
        headers: {
          "Location": "/admin",
          "Set-Cookie": `admin_session=${sessionToken}; Path=/; HttpOnly; SameSite=Strict; Max-Age=86400`
        }
      });
    }
    return new Response(ADMIN_LOGIN_HTML.replace("</form>", '<div class="error">Invalid password</div></form>'), { 
      status: 401, 
      headers: { "Content-Type": "text/html; charset=UTF-8" } 
    });
  }

  if (path === "/admin/logout") {
    const sessionToken = getCookie(request, "admin_session");
    if (sessionToken) adminSessions.delete(sessionToken);
    return new Response(null, {
      status: 302,
      headers: {
        "Location": "/admin",
        "Set-Cookie": "admin_session=; Path=/; Max-Age=0"
      }
    });
  }

  if (path === "/admin/keys") {
    const sessionToken = getCookie(request, "admin_session");
    if (!sessionToken || !adminSessions.has(sessionToken)) {
      return new Response("Unauthorized", { status: 401 });
    }

    if (request.method === "POST") {
      const formData = await request.formData();
      const name = formData.get("name")?.toString() || "Unnamed Key";
      const { apiKey, rawKey } = await apikeys.createApiKey(env, name);
      const keys = await apikeys.listApiKeys(env);
      return new Response(getAdminPanelHtml(keys, rawKey), { 
        status: 200, 
        headers: { "Content-Type": "text/html; charset=UTF-8" } 
      });
    }

    if (request.method === "GET") {
      const keys = await apikeys.listApiKeys(env);
      return new Response(JSON.stringify(keys), { 
        status: 200, 
        headers: { "Content-Type": "application/json" } 
      });
    }
  }

  if (path.startsWith("/admin/keys/") && request.method === "DELETE") {
    const sessionToken = getCookie(request, "admin_session");
    if (!sessionToken || !adminSessions.has(sessionToken)) {
      return new Response("Unauthorized", { status: 401 });
    }
    const keyId = path.split("/admin/keys/")[1];
    const deleted = await apikeys.deleteApiKey(env, keyId);
    return new Response(JSON.stringify({ deleted }), { 
      status: deleted ? 200 : 404, 
      headers: { "Content-Type": "application/json" } 
    });
  }

  // --- 1. Auth & Callback (No API key required) ---
  if (path === "/auth") {
    if (request.method === "GET") {
      return new Response(AUTH_PAGE_HTML, { status: 200, headers: { "Content-Type": "text/html; charset=UTF-8" } });
    }
    if (request.method === "POST") {
      const formData = await request.formData();
      
      // Google OAuth Link
      if (formData.has("google_oauth")) {
        const state = crypto.randomUUID();
        const redirectPort = 8132; 
        const redirectUri = `http://localhost:${redirectPort}/oauth-callback`;
        const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
        authUrl.searchParams.set("client_id", auth.GOOGLE_CLIENT_ID);
        authUrl.searchParams.set("redirect_uri", redirectUri);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", auth.GOOGLE_SCOPES);
        authUrl.searchParams.set("access_type", "offline");
        authUrl.searchParams.set("prompt", "consent");
        authUrl.searchParams.set("state", state);

        return new Response(getManualAuthHtml(authUrl.toString(), redirectPort), { 
          status: 200, 
          headers: { "Content-Type": "text/html; charset=UTF-8" } 
        });
      }

      // Import Google Refresh Token
      if (formData.has("email") && formData.has("refresh_token")) {
        const email = formData.get("email")!.toString();
        const refreshToken = formData.get("refresh_token")!.toString();
        const newSession: GoogleSession = { email, refresh_token: refreshToken };
        await sessionFn.saveGoogleSession(env, newSession);
        return new Response(`Imported Google account for ${email}. You can now use the API.`, { status: 200 });
      }

      // Import Anthropic Key
      if (formData.has("anthropic_key")) {
        const key = formData.get("anthropic_key")!.toString();
        const id = "key-" + key.slice(-6);
        const session: AnthropicSession = { id, api_key: key };
        await sessionFn.saveAnthropicSession(env, session);
        return new Response(`Anthropic API key added (ID: ${id}).`, { status: 200 });
      }
    }
  }

  // Auth Callback
  if (path === "/auth/callback" && request.method === "POST") {
    const formData = await request.formData();
    const redirectedUrl = formData.get("redirected_url")?.toString() || "";
    // Robust parsing even if full localhost URL is provided
    let code: string | null = null;
    try {
      const urlParams = new URL(redirectedUrl); // allow any valid URL
      code = urlParams.searchParams.get("code");
    } catch {
      // try relative
      try {
         const urlParams = new URL(redirectedUrl, "http://localhost");
         code = urlParams.searchParams.get("code");
      } catch {}
    }

    if (!code) {
      return new Response("Missing authorization code in URL.", { status: 400 });
    }

    try {
      // Reconstruct redirect_uri sent during auth
      const redirectUri = redirectedUrl.includes("oauth-callback")
        ? redirectedUrl.split("?")[0]
        : "http://localhost:8132/oauth-callback"; // Fallback to what we told Google

      const tokenData = await auth.exchangeCodeForToken(code, redirectUri);
      const userInfo = await auth.getGoogleUserInfo(tokenData.access_token);
      
      const newSession: GoogleSession = {
        email: userInfo.email,
        refresh_token: tokenData.refresh_token,
        access_token: tokenData.access_token,
        access_expires_at: Date.now() + (tokenData.expires_in * 1000)
      };
      
      if (!newSession.refresh_token) {
        return new Response("No refresh token received. Check you requested 'offline' access.", { status: 400 });
      }

      await sessionFn.saveGoogleSession(env, newSession);
      return new Response(`Google account "${userInfo.email}" authenticated and stored!`, { status: 200 });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new Response("OAuth exchange failed: " + msg, { status: 500 });
    }
  }

  // --- 2. API Routes (API key required) ---
  const isOpenAICompat = path.startsWith("/v1/chat/completions");
  const isAnthropicMessages = path.startsWith("/v1/messages");
  const isAnthropicComplete = path.startsWith("/v1/complete");
  const isImageGeneration = path.startsWith("/v1/images/generations");
  
  if (!isOpenAICompat && !isAnthropicMessages && !isAnthropicComplete && !isImageGeneration) {
    return new Response("Not found", { status: 404 });
  }

  // API Key Validation
  const authHeader = request.headers.get("Authorization") || "";
  const xApiKey = request.headers.get("x-api-key") || "";
  let apiKey = "";
  
  if (authHeader.startsWith("Bearer ")) {
    apiKey = authHeader.slice(7);
  } else if (xApiKey) {
    apiKey = xApiKey;
  }

  // Skip validation if key starts with sk-ag- (our keys) - validate it
  // Pass-through if it's a native Anthropic/OpenAI key format for direct use
  if (apiKey.startsWith("sk-ag-")) {
    const validKey = await apikeys.validateApiKey(env, apiKey);
    if (!validKey) {
      return new Response(JSON.stringify({ error: "Invalid API key" }), { 
        status: 401, 
        headers: { "Content-Type": "application/json" } 
      });
    }
    console.log(`[Auth] API key validated: ${validKey.name} (${validKey.keyPrefix})`);
  } else if (!apiKey) {
    return new Response(JSON.stringify({ error: "Missing API key. Use Authorization: Bearer sk-ag-xxx or x-api-key header" }), { 
      status: 401, 
      headers: { "Content-Type": "application/json" } 
    });
  }
  // If apiKey exists but doesn't start with sk-ag-, pass through (allows direct Anthropic/OpenAI keys)

  if (request.method !== "POST") {
     return new Response("Method not allowed", { status: 405 });
  }

  let reqBody: Record<string, any>;
  try {
    reqBody = await request.json();
  } catch {
    return new Response(`{"error":"Invalid JSON"}`, { status: 400 });
  }

  let model = reqBody.model;
  if (!model) {
    return new Response(`{"error":"Model is required"}`, { status: 400 });
  }

  // Model Mapping for Internal API
  console.log(`[Router] Resolving model for: ${model}`);
  const originalModel = model;
  
  // Map Claude official model names (for /v1/messages compatibility)
  if (isAnthropicMessages) {
    model = adapter.mapClaudeModelName(model);
    if (model !== originalModel) {
      console.log(`[Router] Claude model mapped: ${originalModel} -> ${model}`);
    }
  }
  
  // Apply general model mapping
  const mappedModel = (await import('./model_mapping')).resolveModel(model);
  
  if (mappedModel !== model) {
    console.log(`[Router] Model mapped: ${model} -> ${mappedModel}`);
    model = mappedModel;
  }

  const provider = adapter.inferProvider(model);
  const streamRequested = reqBody.stream === true;

  // Session Selection
  let session: GoogleSession | AnthropicSession | null = null;
  const indexParam = url.searchParams.get("index");
  const providerParam = url.searchParams.get("provider");

  if (providerParam && indexParam) {
     const idx = parseInt(indexParam);
     session = sessionFn.selectSession(providerParam as "google" | "anthropic", isNaN(idx) ? undefined : idx);
  } else if (url.searchParams.get("account")) {
    const acct = url.searchParams.get("account")!;
    if (acct.includes("@")) {
      session = sessionFn.sessions.google.find(s => s.email.toLowerCase() === acct.toLowerCase()) || null;
    } else if (acct.startsWith("key-")) {
      session = sessionFn.sessions.anthropic.find(s => s.id === acct) || null;
    }
  } else {
    session = sessionFn.selectSession(provider);
  }

  if (!session) {
    return new Response(`{"error":"No available ${provider} account session"}`, { status: 503 });
  }

  // Upstream Request Prep & Execution
  if (provider === "google") {
    const sessionAcc = session as GoogleSession;
    
    // 1. Refresh Token Logic
    let accessToken = sessionAcc.access_token;
    let expiresAt = sessionAcc.access_expires_at || 0;
    
    if (!accessToken || Date.now() > expiresAt - 30000) {
      try {
        console.log(`[Google] Refreshing token for ${sessionAcc.email}...`);
        const refreshRes = await auth.refreshAccessToken(sessionAcc.refresh_token);
        accessToken = refreshRes.access_token;
        expiresAt = Date.now() + (refreshRes.expires_in * 1000);
        
        sessionAcc.access_token = accessToken;
        sessionAcc.access_expires_at = expiresAt;
        await sessionFn.saveGoogleSession(env, sessionAcc);
      } catch (e: any) {
        console.error(`[Google] Refresh failed:`, e);
        return new Response(JSON.stringify({ error: "Failed to refresh Google token", details: e.message }), { status: 401 });
      }
    }

    // 2. Get Project ID
    if (!sessionAcc.project_id) {
      try {
        console.log(`[Google] Fetching Project ID...`);
        const pid = await auth.getProjectId(accessToken!);
        sessionAcc.project_id = pid;
        await sessionFn.saveGoogleSession(env, sessionAcc);
      } catch (e: any) {
        return new Response(JSON.stringify({ error: "Failed to get Google Cloud Project ID", details: e.message }), { status: 500 });
      }
    }

    // 3. Prepare Internal Request
    const method = streamRequested ? "streamGenerateContent" : "generateContent";
    const buildUrl = (endpoint: string) => {
      let url = `${endpoint}/v1internal:${method}`;
      if (streamRequested) url += "?alt=sse";
      return url;
    };

    // Transform to Gemini Format
    const geminiBody: any = {};
    if (isOpenAICompat) {
      geminiBody.contents = adapter.openAIToContents(reqBody.messages as ChatMessage[]);
    } else if (isAnthropicMessages) {
       const { contents, systemInstruction } = adapter.anthropicMessagesToContents(reqBody.messages, reqBody.system);
       geminiBody.contents = contents;
       if (systemInstruction) geminiBody.systemInstruction = systemInstruction;
       
       // Handle Tools
       if (reqBody.tools) {
         // Pass through tools (mapping input_schema to parameters if needed?)
         // Gemini expects { functionDeclarations: [ { name, description, parameters } ] }
         // Anthropic expects { name, description, input_schema }
         // We simply map input_schema -> parameters
         geminiBody.tools = [{
           functionDeclarations: reqBody.tools.map((t: any) => ({
             name: t.name,
             description: t.description,
             // Note: Gemini strict schema might require specific types. 
             // We assume simple compatibility for now or pass raw if compliant.
             parameters: t.input_schema 
           }))
         }];
       }
    } else if (isImageGeneration) {
      // Image Generation Request
      const prompt = reqBody.prompt || "";
      geminiBody.contents = [{ role: "user", parts: [{ text: prompt }] }];
      // You might interpret `n` or `size`, but widely we just pass the prompt for now
      // The model 'gemini-3-pro-image' handles the rest.
    } else {
      const prompt = (reqBody.prompt as string) || "";
      geminiBody.contents = adapter.anthropicPromptToContents(prompt);
    }
    
    // generationConfig
    const generationConfig: any = {};
    if (reqBody.temperature !== undefined) generationConfig.temperature = reqBody.temperature;
    if (reqBody.top_p !== undefined) generationConfig.topP = reqBody.top_p;
    if (reqBody.top_k !== undefined) generationConfig.topK = reqBody.top_k;
    if (reqBody.max_tokens) generationConfig.maxOutputTokens = reqBody.max_tokens;
    if (Object.keys(generationConfig).length > 0) {
      geminiBody.generationConfig = generationConfig;
    }

    const wrappedBody = {
      project: sessionAcc.project_id,
      requestId: `agent-${crypto.randomUUID()}`,
      request: geminiBody, 
      model: model, 
      userAgent: "antigravity",
      requestType: "IDE_CHAT" // Use IDE_CHAT for internal API
    };

    try {
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${accessToken}`,
        "Accept": streamRequested ? "text/event-stream" : "application/json",
        ...CODE_ASSIST_HEADERS
      };

      // Inject Beta Headers for Claude thinking models
      const modelFamily = getModelFamily(model);
      if (modelFamily === "claude" && model.includes("thinking")) {
        console.log(`[Google] Injecting anthropic-beta header for Claude thinking model`);
        headers["anthropic-beta"] = "interleaved-thinking-2025-05-14";
      }

      // Endpoint fallback: try daily -> autopush -> prod
      let upstreamResp: Response | null = null;
      let lastError = "";
      for (const endpoint of CODE_ASSIST_ENDPOINT_FALLBACKS) {
        const upstreamUrl = buildUrl(endpoint);
        console.log(`[Google] Trying endpoint: ${endpoint}`);
        
        try {
          upstreamResp = await fetch(upstreamUrl, {
            method: "POST",
            headers,
            body: JSON.stringify(wrappedBody)
          });

          if (upstreamResp.ok || upstreamResp.status < 500) {
            // Success or client error (4xx) - don't retry
            break;
          }
          lastError = await upstreamResp.text();
          console.warn(`[Google] Endpoint ${endpoint} failed: ${upstreamResp.status} - ${lastError}`);
        } catch (e: any) {
          lastError = e.message;
          console.warn(`[Google] Endpoint ${endpoint} fetch error: ${e.message}`);
        }
      }

      if (!upstreamResp || !upstreamResp.ok) {
        const errText = lastError || (upstreamResp ? await upstreamResp.text() : "All endpoints failed");
        const status = upstreamResp?.status || 503;
        console.error(`[Google] Upstream error: ${status} - ${errText}`);
        
        // Handle 401 (unauthorized) - delete session
        if (status === 401) {
          await env.SESSIONS.delete(`google:${sessionAcc.email}`);
        }
        
        // Handle 429 (rate limit) or 5xx (server error) - block session and suggest retry
        if (status === 429 || status >= 500) {
          const blockDuration = status === 429 ? 60 * 1000 : 30 * 1000; // 60s for rate limit, 30s for server error
          await sessionFn.blockSession(env, "google", sessionAcc, blockDuration);
          console.log(`[Google] Blocked account ${sessionAcc.email} for ${blockDuration/1000}s due to ${status}`);
          
          // Check if there are other available accounts
          const availableAccounts = sessionFn.sessions.google.filter(
            acc => !acc.blocked_until || acc.blocked_until <= Date.now()
          );
          
          if (availableAccounts.length > 0) {
            return new Response(JSON.stringify({ 
              error: "Rate limited - retry to use another account", 
              details: `Account ${sessionAcc.email} rate limited. ${availableAccounts.length} other account(s) available. Please retry.`,
              status: 429,
              retry: true
            }), { 
              status: 429,
              headers: { "Retry-After": "1" }
            });
          }
        }
        
        return new Response(JSON.stringify({ 
          error: "Upstream error", 
          details: errText, 
          status
        }), { status });
      }

      // 4. Handle Response
      if (streamRequested) {
        // SSE Transform
        const { readable, writable } = new TransformStream();
        const writer = writable.getWriter();
        const reader = upstreamResp.body?.getReader();
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        if (!reader) return new Response("No response body", { status: 500 });

        (async () => {
          // If handling /v1/messages, use specialized adapter
          let claudeStreamAdapter = isAnthropicMessages ? new ClaudeStreamAdapter(writer, model) : null;
          
          let buffer = "";
          try {
             // Initial Role Chunk for OpenAI Compat
             if (isOpenAICompat) {
                const roleChunk = {
                  id: "chatcmpl-" + Math.random().toString(36).slice(2),
                  object: "chat.completion.chunk",
                  created: Math.floor(Date.now()/1000),
                  model,
                  choices: [{ delta: { role: "assistant" }, index: 0, finish_reason: null }]
                };
                await writer.write(encoder.encode(`data: ${JSON.stringify(roleChunk)}\n\n`));
             }

             while (true) {
               const { done, value } = await reader.read();
               if (done) break;
               buffer += decoder.decode(value, { stream: true });
               const lines = buffer.split("\n");
               buffer = lines.pop() || "";

               for (const line of lines) {
                 const trimmed = line.trim();
                 if (!trimmed || !trimmed.startsWith("data:")) continue;
                 
                 const dataPart = trimmed.slice(5).trim();
                 if (dataPart === "[DONE]") {
                    if (isOpenAICompat) await writer.write(encoder.encode("data: [DONE]\n\n"));
                    continue;
                 }

                 try {
                   const json = JSON.parse(dataPart);
                   let payload = json.response ? json.response : json;
                   
                   if (claudeStreamAdapter) {
                      // Delegate to Claude Stream Adapter
                      await claudeStreamAdapter.handleGeminiChunk(payload);
                   } else if (isOpenAICompat && payload.candidates) {
                      // ... existing OpenAI logic ...
                      const text = adapter.contentToText(payload.candidates[0].content);
                      if (text) {
                        const chunk = {
                          id: null, object: "chat.completion.chunk", created: Math.floor(Date.now()/1000), model,
                          choices: [{ delta: { content: text }, index: 0, finish_reason: null }]
                        };
                        await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
                      }
                   } else {
                      // Pass through (unwrapped) for others
                      await writer.write(encoder.encode(`data: ${JSON.stringify(payload)}\n\n`));
                   }
                 } catch (e) {
                   if (!claudeStreamAdapter) await writer.write(encoder.encode(`${line}\n\n`));
                 }
               }
             }
             if (isOpenAICompat) await writer.write(encoder.encode("data: [DONE]\n\n"));
          } catch(e) {
             console.error("Stream error", e);
             if (!claudeStreamAdapter) await writer.write(encoder.encode(`data: {"error": "Stream error"}\n\n`));
          } finally {
             await writer.close();
          }
        })();

        return new Response(readable, {
          headers: { "Content-Type": "text/event-stream; charset=utf-8", "Cache-Control": "no-cache", "Connection": "keep-alive" }
        });

      } else {
        // Sync
        const json = await upstreamResp.json() as any;
        const payload = json.response ? json.response : json;
        // Convert if needed
        let finalResp = payload;
        if (isOpenAICompat && payload.candidates) {
           const text = adapter.contentToText(payload.candidates[0].content);
           finalResp = adapter.formatOpenAIResponse(text, model);
        } else if (isAnthropicComplete && payload.candidates) {
           const text = adapter.contentToText(payload.candidates[0].content);
           finalResp = adapter.formatAnthropicResponse(text, model);
        } else if (isAnthropicMessages && payload.candidates) {
           // Basic Sync Support for Messages
           const text = adapter.contentToText(payload.candidates[0]?.content);
           // Needs full message object structure
            finalResp = {
                id: payload.responseId || "msg_" + Math.random().toString(36).slice(2),
                type: "message",
                role: "assistant", 
                model: model,
                content: [{ type: "text", text: text }],
                stop_reason: payload.candidates[0]?.finishReason === "MAX_TOKENS" ? "max_tokens" : "end_turn",
                stop_sequence: null,
                usage: { input_tokens: 0, output_tokens: payload.usageMetadata?.candidatesTokenCount || 0 }
            };
        } else if (isImageGeneration && payload.candidates) {
            // Image Generation Response
            // Expecting inlineData in parts
            const parts = payload.candidates?.[0]?.content?.parts || [];
            const imagePart = parts.find((p: any) => p.inlineData);
            
            if (imagePart) {
                finalResp = {
                    created: Math.floor(Date.now() / 1000),
                    data: [
                        { b64_json: imagePart.inlineData.data }
                    ]
                };
            } else {
                // Check if there is text indicating failure or explicit refusal
               const text = adapter.contentToText(payload.candidates[0]?.content);
               if (text) {
                   // Return as error or textual description if no image
                   return new Response(JSON.stringify({ error: "Image generation returned text instead of image", details: text }), { status: 500 });
               }
               return new Response(JSON.stringify({ error: "No image data received" }), { status: 500 });
            }
        }

        return new Response(JSON.stringify(finalResp), { headers: { "Content-Type": "application/json" } });
      }

    } catch (e: any) {
        return new Response(JSON.stringify({ error: "Internal Proxy Error", details: e.message }), { status: 500 });
    }
  }

  // --- Anthropic Logic (Passthrough) ---
  if (provider === "anthropic") {
    const anthropicAcc = session as AnthropicSession;
    let upstreamUrl = "https://api.anthropic.com/v1/complete";
    if (isAnthropicMessages) upstreamUrl = "https://api.anthropic.com/v1/messages";

    const upstreamHeaders: Record<string, string> = {
      "Content-Type": "application/json",
      "x-api-key": anthropicAcc.api_key,
      "anthropic-version": "2023-06-01"
    };
    if (streamRequested) upstreamHeaders["Accept"] = "text/event-stream";

    // ... (rest of Anthropic passthrough logic is cleaner if we just forward body) ...
    // But we need to handle mapping if it was transformed. For strict passthrough we trust client.
    let postData = reqBody;
    
    // Legacy complete
    if (isAnthropicComplete) {
         let promptStr: string;
         if (isOpenAICompat) {
           promptStr = adapter.messagesToAnthropicPrompt(reqBody.messages as ChatMessage[]);
         } else {
           promptStr = reqBody.prompt as string;
           if (!promptStr.trim().startsWith("Human:")) promptStr = `Human: ${promptStr}\n\nAssistant: `;
         }
         postData = {
           prompt: promptStr, model,
           max_tokens_to_sample: reqBody.max_tokens_to_sample ?? reqBody.max_tokens ?? 300,
           temperature: reqBody.temperature ?? 1,
           stream: streamRequested,
           stop_sequences: reqBody.stop_sequences ?? []
         };
    }

    try {
      const upstreamResp = await fetch(upstreamUrl, {
        method: "POST", headers: upstreamHeaders, body: JSON.stringify(postData)
      });

      if (!upstreamResp.ok) {
         const errText = await upstreamResp.text();
         return new Response(JSON.stringify({ error: "Upstream error", details: errText }), { status: upstreamResp.status });
      }

      if (streamRequested) {
         return new Response(upstreamResp.body, { headers: { "Content-Type": "text/event-stream" } });
      } else {
         const json = await upstreamResp.json() as any;
         // If it's pure passthrough (Messages), return direct.
         if (isAnthropicMessages) {
             return new Response(JSON.stringify(json), { headers: { "Content-Type": "application/json" } });
         } else {
             const text = json.completion || "";
             const finalResp = isOpenAICompat ? adapter.formatOpenAIResponse(text, model) : adapter.formatAnthropicResponse(text, model);
             return new Response(JSON.stringify(finalResp), { headers: { "Content-Type": "application/json" } });
         }
      }
    } catch (e: any) {
       return new Response(`{"error":"Anthropic fetch failed: ${e.message}"}`, { status: 502 });
    }
  }

  return new Response("Unknown provider", { status: 400 });
}
