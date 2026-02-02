
export const GOOGLE_CLIENT_ID = "1071006060591-tmhssin2h21lcre235vtolojh4g403ep.apps.googleusercontent.com";
export const GOOGLE_CLIENT_SECRET = "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";

// Internal scopes required by this specific Client ID
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/cloud-platform",
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/experimentsandconfigs",
  "https://www.googleapis.com/auth/cclog",
].join(" ");

export async function exchangeCodeForToken(code: string, redirectUri: string): Promise<{ refresh_token: string, access_token: string, expires_in: number }> {
    const params = new URLSearchParams();
    params.append("client_id", GOOGLE_CLIENT_ID);
    params.append("client_secret", GOOGLE_CLIENT_SECRET);
    params.append("code", code);
    params.append("redirect_uri", redirectUri);
    params.append("grant_type", "authorization_code");
  
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token exchange failed: ${text}`);
    }
  
    const data = await res.json() as any;
    return {
      refresh_token: data.refresh_token,
      access_token: data.access_token,
      expires_in: data.expires_in
    };
}
  
export async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string, expires_in: number }> {
    const params = new URLSearchParams();
    params.append("client_id", GOOGLE_CLIENT_ID);
    params.append("client_secret", GOOGLE_CLIENT_SECRET);
    params.append("refresh_token", refreshToken);
    params.append("grant_type", "refresh_token");
  
    const res = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: params
    });
  
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Token refresh failed: ${text}`);
    }
  
    const data = await res.json() as any;
    return {
      access_token: data.access_token,
      expires_in: data.expires_in
    };
}
  
export async function getGoogleUserInfo(accessToken: string): Promise<{ email: string }> {
    const res = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` }
    });
  
    if (!res.ok) {
      throw new Error("Failed to fetch user info");
    }
  
    const data = await res.json() as any;
    return { email: data.email };
}

export async function getProjectId(accessToken: string): Promise<string> {
  const url = "https://daily-cloudcode-pa.sandbox.googleapis.com/v1internal:loadCodeAssist";
  const res = await fetch(url, {
    method: "POST",
    headers: { 
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY" } })
  });

  if (!res.ok) {
    const text = await res.text();
    console.error("loadCodeAssist failed", text);
    // Fallback? Reference code uses "bamboo-precept-lgxtn" as final fallback.
    // Let's try to return that fallback if request fails, to avoid total blocker.
    // Or throw error?
    // If this fails, the token might be bad OR the service is down.
    // Let's throw for now to make it visible.
    throw new Error(`Failed to loadCodeAssist: ${text}`);
  }

  const data = await res.json() as any;
  const projectId = data.cloudaicompanionProject;
  
  if (!projectId) {
     // Try fallback
     return "bamboo-precept-lgxtn";
  }

  return projectId;
}
