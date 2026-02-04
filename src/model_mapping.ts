// Model aliases from opencode-google-antigravity-auth reference
// These map user-facing model names to internal API model names
export const MODEL_ALIASES: Record<string, string> = {
  // Gemini preview aliases
  "gemini-2.5-computer-use-preview-10-2025": "rev19-uic3-1p",
  "gemini-3-pro-image-preview": "gemini-3-pro-image",
  "gemini-3-pro-preview": "gemini-3-pro-high",
  "gemini-3-flash-preview": "gemini-3-flash",
  
  // Claude proxy model aliases
  "gemini-claude-sonnet-4-5-thinking": "claude-sonnet-4-5-thinking",
  "gemini-claude-opus-4-5-thinking": "claude-opus-4-5-thinking",
  // Image generation aliases
  "dall-e-3": "gemini-3-pro-image",
  "imagen-3": "gemini-3-pro-image",
};

// Model fallbacks
export const MODEL_FALLBACKS: Record<string, string> = {
  "gemini-2.5-flash-image": "gemini-2.5-flash",
};

/**
 * Resolve model name using aliases and fallbacks
 * Matches the reference implementation exactly
 */
export function resolveModel(input: string): string {
  // 1. Check aliases
  if (MODEL_ALIASES[input]) {
    return MODEL_ALIASES[input];
  }
  
  // 2. Check fallbacks
  if (MODEL_FALLBACKS[input]) {
    return MODEL_FALLBACKS[input];
  }
  
  // 3. Pass-through as-is
  return input;
}

// Determine model family for signature caching
export type ModelFamily = "claude" | "gemini-flash" | "gemini-pro";

export function getModelFamily(model: string): ModelFamily {
  if (model.includes("claude")) return "claude";
  if (model.includes("flash")) return "gemini-flash";
  return "gemini-pro";
}
