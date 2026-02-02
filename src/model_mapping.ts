
export const MODEL_MAPPING: Record<string, string> = {
  // Direct mappings
  "claude-opus-4-5-thinking": "claude-opus-4-5-thinking", // Kept as specific ID if needed, or map to internal
  "claude-sonnet-4-5": "claude-sonnet-4-5",
  "claude-sonnet-4-5-thinking": "claude-sonnet-4-5-thinking",

  // Alias mappings
  "claude-sonnet-4-5-20250929": "claude-sonnet-4-5-thinking",
  "claude-3-5-sonnet-20241022": "claude-sonnet-4-5",
  "claude-3-5-sonnet-20240620": "claude-sonnet-4-5",
  "claude-opus-4": "claude-opus-4-5-thinking",
  "claude-opus-4-5-20251101": "claude-opus-4-5-thinking",
  "claude-haiku-4": "claude-sonnet-4-5",
  "claude-3-haiku-20240307": "claude-sonnet-4-5",
  "claude-haiku-4-5-20251001": "claude-sonnet-4-5",

  // OpenAI mappings
  "gpt-4": "gemini-2.5-flash",
  "gpt-4-turbo": "gemini-2.5-flash",
  "gpt-4-turbo-preview": "gemini-2.5-flash",
  "gpt-4-0125-preview": "gemini-2.5-flash",
  "gpt-4-1106-preview": "gemini-2.5-flash",
  "gpt-4-0613": "gemini-2.5-flash",

  "gpt-4o": "gemini-2.5-flash",
  "gpt-4o-2024-05-13": "gemini-2.5-flash",
  "gpt-4o-2024-08-06": "gemini-2.5-flash",

  "gpt-4o-mini": "gemini-2.5-flash",
  "gpt-4o-mini-2024-07-18": "gemini-2.5-flash",

  "gpt-3.5-turbo": "gemini-2.5-flash",
  "gpt-3.5-turbo-16k": "gemini-2.5-flash",
  "gpt-3.5-turbo-0125": "gemini-2.5-flash",
  "gpt-3.5-turbo-1106": "gemini-2.5-flash",
  "gpt-3.5-turbo-0613": "gemini-2.5-flash",

  // Gemini mappings
  "gemini-2.5-flash-lite": "gemini-2.5-flash",
  "gemini-2.5-flash-thinking": "gemini-2.5-flash-thinking",
  "gemini-3-pro-low": "gemini-3-pro-preview",
  "gemini-3-pro-high": "gemini-3-pro-preview",
  "gemini-3-pro-preview": "gemini-3-pro-preview",
  "gemini-3-pro": "gemini-3-pro-preview",
  "gemini-2.5-flash": "gemini-2.5-flash",
  "gemini-3-flash": "gemini-3-flash",
  "gemini-3-pro-image": "gemini-3-pro-image",
  
  // Internal
  "internal-background-task": "gemini-2.5-flash",
  
  // Specific mappings requested by context
  "gemini-2.0-flash-exp": "gemini-3-flash",
  "gemini-2.0-flash": "gemini-3-flash",
  "gemini-flash": "gemini-3-flash",
  "gemini-pro": "gemini-3-pro-high",
  "gemini-1.5-pro": "gemini-3-pro-high",
};

export function resolveModel(input: string): string {
    // 1. Exact match
    if (MODEL_MAPPING[input]) {
        return MODEL_MAPPING[input];
    }
    
    // 2. Pass-through known prefixes
    if (input.startsWith("gemini-") || input.includes("thinking")) {
        // Exception: Check if it matches a mapped key first (already done above), 
        // if not, pass through, but be careful of non-existent models.
        // For safety, we trust the input if it looks like a valid internal ID.
        return input;
    }

    // 3. Fallback/Intelligent logic
    const lower = input.toLowerCase();
    
    // Opus to Gemini 3 Pro Preview (per reference code)
    if (lower.includes("opus")) {
        return "gemini-3-pro-preview";
    }

    // 4. Default fallback
    return "claude-sonnet-4-5";
}
