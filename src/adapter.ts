
import { ChatMessage, ContentObject, ContentPart } from './types';

export function inferProvider(model: string): "google" | "anthropic" {
  const m = model.toLowerCase();
  // Internal Antigravity Claude models must be routed to Google
  if (m === "claude-sonnet-4-5") return "google";
  
  if (m.includes("claude") || m.includes("anthropic")) return "anthropic";
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
