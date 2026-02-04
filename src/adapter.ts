
import { ChatMessage, ContentObject, ContentPart } from './types';

export function inferProvider(model: string): "google" | "anthropic" {
  const m = model.toLowerCase();
  // Internal Antigravity Claude models must be routed to Google
  if (m === "claude-sonnet-4-5") return "google";
  
  if (m.includes("claude") || m.includes("anthropic") || m.includes("opus")) return "google";
  if (m.includes("gemini") || m.includes("google") || m.includes("palm") || m.includes("codey")) return "google";
  return "google";
}

export function openAIToContents(messages: ChatMessage[]): { role: string; parts: { text: string }[] }[] {
  const contents: { role: string; parts: { text: string }[] }[] = [];
  let systemInstructions = "";
  
  for (const msg of messages) {
    if (msg.role === "system") {
      systemInstructions += msg.content + "\n";
    } else {
      const role = msg.role === "assistant" ? "model" : "user";
      let text = msg.content;
      if (role === "user" && systemInstructions) {
        text = systemInstructions.trim() + "\n" + msg.content;
        systemInstructions = "";
      }
      contents.push({ role, parts: [ { text } ] });
    }
  }
  
  if (systemInstructions && contents.length === 0) {
    contents.push({ role: "user", parts: [ { text: systemInstructions.trim() } ] });
  }
  return contents;
}

export function anthropicPromptToContents(prompt: string): { role: string; parts: { text: string }[] }[] {
  return [ { role: "user", parts: [ { text: prompt } ] } ];
}

export function messagesToAnthropicPrompt(messages: ChatMessage[]): string {
  let prompt = "";
  let lastRole = null;
  for (const msg of messages) {
    if (msg.role === "system") {
      prompt += `Human: ${msg.content}\n\nAssistant: Ok.\n\n`;
      lastRole = "assistant";
    } else if (msg.role === "user") {
      prompt += `Human: ${msg.content}\n\n`;
      lastRole = "user";
    } else if (msg.role === "assistant") {
      prompt += `Assistant: ${msg.content}\n\n`;
      lastRole = "assistant";
    }
  }
  
  if (lastRole === "assistant" || lastRole === null) {
    prompt += "Human: ";
  }
  if (!prompt.endsWith("Assistant: ")) {
    prompt += "Assistant: ";
  }
  return prompt;
}

export function contentToText(contentObj: ContentObject | ContentObject[] | null | undefined): string {
  if (!contentObj) return "";
  if (Array.isArray(contentObj)) {
    return contentObj.map(contentToText).join("");
  }
  if (contentObj.parts) {
    return contentObj.parts.map((p: ContentPart) => p.text || "").join("");
  }
  return contentObj.text || "";
}

export function formatOpenAIResponse(content: string, model: string) {
  return {
    id: "chatcmpl-" + Math.random().toString(36).slice(2),
    object: "chat.completion",
    created: Math.floor(Date.now() / 1000),
    model,
    choices: [
      {
        index: 0,
        message: { role: "assistant", content },
        finish_reason: "stop"
      }
    ]
  };
}

export function formatAnthropicResponse(content: string, model: string) {
  return {
    completion: content,
    stop_reason: "stop_sequence",
    model,
    truncated: false
  };
}

// Claude Messages API format (for /v1/messages)
export function formatClaudeMessagesResponse(content: string, model: string, inputTokens = 0, outputTokens = 0) {
  return {
    id: "msg_" + Math.random().toString(36).slice(2),
    type: "message",
    role: "assistant",
    content: [
      { type: "text", text: content }
    ],
    model,
    stop_reason: "end_turn",
    stop_sequence: null,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens
    }
  };
}

// Map Claude official model names to internal names
export function mapClaudeModelName(model: string): string {
  const mapping: Record<string, string> = {
    // Claude 3.5 Sonnet versions
    "claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
    "claude-3-5-sonnet-latest": "claude-sonnet-4-5",
    "claude-3-5-sonnet@20241022": "claude-sonnet-4-5",
    
    // Claude 3 Opus versions
    "claude-3-opus-20240229": "claude-opus-4-5-thinking",
    "claude-3-opus-latest": "claude-opus-4-5-thinking",
    "claude-3-opus@20240229": "claude-opus-4-5-thinking",
    
    // Claude 4.5 versions (if they exist)
    "claude-sonnet-4-5-20250514": "claude-sonnet-4-5",
    "claude-opus-4-5-20250514": "claude-opus-4-5-thinking",
    
    // Anthropic-style names
    "claude-3-5-sonnet": "claude-sonnet-4-5",
    "claude-3-opus": "claude-opus-4-5-thinking",
  };
  
  return mapping[model] || model;
}

export function anthropicMessagesToContents(
  messages: any[], 
  system?: string
): { contents: any[], systemInstruction?: any } {
  const contents: any[] = [];
  const toolIdMap = new Map<string, string>(); // id -> name

  // 1. Build Tool ID Map from history (to resolve tool_result names)
  for (const msg of messages) {
    if (msg.role === "assistant") {
      if (Array.isArray(msg.content)) {
        for (const block of msg.content) {
          if (block.type === "tool_use") {
            toolIdMap.set(block.id, block.name);
          }
        }
      }
    }
  }

  // 2. Convert Messages
  for (const msg of messages) {
    const role = msg.role === "assistant" ? "model" : "user";
    const parts: any[] = [];

    if (typeof msg.content === "string") {
      parts.push({ text: msg.content });
    } else if (Array.isArray(msg.content)) {
      for (const block of msg.content) {
        if (block.type === "text") {
          parts.push({ text: block.text });
        } else if (block.type === "thinking") {
           // Map to text part with thought=true
           parts.push({ text: block.thinking, thought: true, thoughtSignature: block.signature });
        } else if (block.type === "image") {
          parts.push({
            inlineData: {
              mimeType: block.source.media_type,
              data: block.source.data
            }
          });
        } else if (block.type === "tool_use") {
          parts.push({
            functionCall: {
              name: block.name,
              args: block.input // Gemini uses 'args', Anthropic uses 'input'
            }
          });
        } else if (block.type === "tool_result") {
          const toolName = toolIdMap.get(block.tool_use_id);
          if (toolName) {
            let responseContent = block.content;
            parts.push({
              functionResponse: {
                name: toolName,
                response: { content: responseContent } 
              }
            });
          }
        }
      }
    }
    
    if (parts.length > 0) {
      contents.push({ role, parts });
    }
  }
  
  return { contents, systemInstruction: system ? { parts: [{ text: system }] } : undefined };
}
