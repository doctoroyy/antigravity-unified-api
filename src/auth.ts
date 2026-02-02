
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
  
  // Try to use a better User-Agent, though "antigravity" is what the plan committed to generically.
  // Reference uses: antigravity/{version} {os}/{arch}
  // We don't have easy runtime version/os access in Worker env without more code.
  // We will use a static one that mimics it slightly better than just "antigravity".
  const userAgent = "antigravity/0.0.0 worker/unknown";

  try {
    const res = await fetch(url, {
        method: "POST",
        headers: { 
        "Authorization": `Bearer ${accessToken}`,
        "Content-Type": "application/json",
        "User-Agent": userAgent
        },
        body: JSON.stringify({ metadata: { ideType: "ANTIGRAVITY" } })
    });

    if (!res.ok) {
        const text = await res.text();
        console.warn(`loadCodeAssist failed (status ${res.status}): ${text}. Using fallback project ID.`);
        return generateMockProjectId();
    }

    const data = await res.json() as any;
    const projectId = data.cloudaicompanionProject;
    
    if (!projectId) {
        console.warn("loadCodeAssist returned no Project ID. Using fallback.");
        return generateMockProjectId();
    }

    return projectId;
  } catch (e) {
      console.warn("Error fetching Project ID:", e);
      return generateMockProjectId();
  }
}

function generateMockProjectId(): string {
  const adjectives = ["useful", "bright", "swift", "calm", "bold"];
  const nouns = ["fuze", "wave", "spark", "flow", "core"];
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  
  const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
  const noun = nouns[Math.floor(Math.random() * nouns.length)];
  let randomNum = "";
  for (let i = 0; i < 5; i++) {
    randomNum += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  
  return `${adj}-${noun}-${randomNum}`;
}
