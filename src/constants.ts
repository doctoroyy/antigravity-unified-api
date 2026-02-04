// Antigravity OAuth configuration
export const ANTIGRAVITY_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const ANTIGRAVITY_CLIENT_SECRET = "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";

export const ANTIGRAVITY_SCOPES: readonly string[] = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/cclog",
  "https://www.googleapis.com/auth/experimentsandconfigs",
];

// User-Agent and API Client headers
export const ANTIGRAVITY_USER_AGENT = "antigravity/1.15.8 linux/amd64";
export const ANTIGRAVITY_API_CLIENT = "google-cloud-sdk vscode_cloudshelleditor/0.1";
export const ANTIGRAVITY_CLIENT_METADATA = '{"ideType":"IDE_UNSPECIFIED","platform":"PLATFORM_UNSPECIFIED","pluginType":"GEMINI"}';

// Root endpoints for the Antigravity API (in fallback order)
export const CODE_ASSIST_ENDPOINT_DAILY = "https://daily-cloudcode-pa.sandbox.googleapis.com";
export const CODE_ASSIST_ENDPOINT_AUTOPUSH = "https://autopush-cloudcode-pa.sandbox.googleapis.com";
export const CODE_ASSIST_ENDPOINT_PROD = "https://cloudcode-pa.googleapis.com";

// Endpoint fallback order (daily → autopush → prod)
export const CODE_ASSIST_ENDPOINT_FALLBACKS = [
  CODE_ASSIST_ENDPOINT_DAILY,
  CODE_ASSIST_ENDPOINT_AUTOPUSH,
  CODE_ASSIST_ENDPOINT_PROD,
] as const;

// Primary endpoint to use
export const CODE_ASSIST_ENDPOINT = CODE_ASSIST_ENDPOINT_DAILY;
export const CODE_ASSIST_API_VERSION = "v1internal";

// Standard headers for Code Assist requests
export const CODE_ASSIST_HEADERS = {
  "User-Agent": ANTIGRAVITY_USER_AGENT,
  "X-Goog-Api-Client": ANTIGRAVITY_API_CLIENT,
  "Client-Metadata": ANTIGRAVITY_CLIENT_METADATA,
} as const;
