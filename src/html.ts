
export const AUTH_PAGE_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antigravity Auth</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
      min-height: 100vh;
      background: linear-gradient(135deg, #0f0f23 0%, #1a1a3e 50%, #2d1b4e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
    }
    .container { width: 100%; max-width: 480px; }
    .logo { text-align: center; margin-bottom: 32px; }
    .logo h1 {
      font-size: 2rem; font-weight: 700;
      background: linear-gradient(135deg, #a78bfa 0%, #818cf8 50%, #6366f1 100%);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      letter-spacing: -0.5px;
    }
    .logo p { color: rgba(255, 255, 255, 0.5); font-size: 0.9rem; margin-top: 8px; }
    .card {
      background: rgba(255, 255, 255, 0.05);
      backdrop-filter: blur(20px); -webkit-backdrop-filter: blur(20px);
      border: 1px solid rgba(255, 255, 255, 0.1);
      border-radius: 20px; padding: 32px; margin-bottom: 20px;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3); }
    .card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 24px; }
    .card-icon {
      width: 48px; height: 48px; border-radius: 12px;
      display: flex; align-items: center; justify-content: center; font-size: 24px;
    }
    .card-icon.google { background: linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335); }
    .card-icon.anthropic { background: linear-gradient(135deg, #d97706, #f59e0b); }
    .card-title { color: #fff; font-size: 1.25rem; font-weight: 600; }
    .card-subtitle { color: rgba(255, 255, 255, 0.5); font-size: 0.85rem; }
    .btn {
      width: 100%; padding: 14px 24px; border: none; border-radius: 12px;
      font-family: inherit; font-size: 1rem; font-weight: 600; cursor: pointer;
      transition: all 0.2s ease; display: flex; align-items: center; justify-content: center; gap: 10px;
    }
    .btn-primary {
      background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #fff;
      box-shadow: 0 4px 15px rgba(99, 102, 241, 0.4);
    }
    .btn-primary:hover { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(99, 102, 241, 0.5); }
    .btn-google { background: #fff; color: #333; }
    .btn-google:hover { background: #f5f5f5; }
    .btn-anthropic { background: linear-gradient(135deg, #d97706, #f59e0b); color: #fff; }
    .btn-anthropic:hover { filter: brightness(1.1); }
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; color: rgba(255, 255, 255, 0.7); font-size: 0.85rem; font-weight: 500; margin-bottom: 8px; }
    .form-input {
      width: 100%; padding: 14px 16px; background: rgba(255, 255, 255, 0.05);
      border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 10px;
      color: #fff; font-family: inherit; font-size: 1rem; transition: all 0.2s ease;
    }
    .form-input::placeholder { color: rgba(255, 255, 255, 0.3); }
    .form-input:focus { outline: none; border-color: rgba(99, 102, 241, 0.5); box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1); }
    .collapsible { margin-top: 16px; }
    .collapsible-trigger {
      background: none; border: none; color: rgba(255, 255, 255, 0.5);
      font-family: inherit; font-size: 0.85rem; cursor: pointer;
      display: flex; align-items: center; gap: 6px; padding: 8px 0; transition: color 0.2s ease;
    }
    .collapsible-trigger:hover { color: rgba(255, 255, 255, 0.8); }
    .collapsible-content { display: none; padding-top: 16px; }
    .collapsible.open .collapsible-content { display: block; }
    .collapsible.open .collapsible-trigger svg { transform: rotate(180deg); }
    .footer { text-align: center; color: rgba(255, 255, 255, 0.3); font-size: 0.8rem; }
    @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
    .card { animation: fadeIn 0.4s ease forwards; }
    .card:nth-child(2) { animation-delay: 0.1s; }
  </style>
</head>
<body>
  <div class="container">
    <div class="logo">
      <h1>⚡ Antigravity</h1>
      <p>Unified AI API Gateway</p>
    </div>
    
    <!-- Google Account Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon google">G</div>
        <div>
          <div class="card-title">Google Account</div>
          <div class="card-subtitle">Connect via OAuth or import token</div>
        </div>
      </div>
      
      <form method="POST" action="/auth">
        <input type="hidden" name="google_oauth" value="1">
        <button type="submit" class="btn btn-google">
          <svg width="18" height="18" viewBox="0 0 24 24" style="margin-right: 8px;">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
          </svg>
          Sign in with Google
        </button>
      </form>
      
      <div class="collapsible" id="tokenCollapsible">
        <button type="button" class="collapsible-trigger" onclick="toggleCollapsible('tokenCollapsible')">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          Already have a refresh token?
        </button>
        <div class="collapsible-content">
          <form method="POST" action="/auth">
            <div class="form-group">
              <label class="form-label">Email</label>
              <input type="email" name="email" class="form-input" placeholder="you@example.com" required>
            </div>
            <div class="form-group">
              <label class="form-label">Refresh Token</label>
              <input type="text" name="refresh_token" class="form-input" placeholder="1//0xxx..." required>
            </div>
            <button type="submit" class="btn btn-primary">Import Token</button>
          </form>
        </div>
      </div>
    </div>
    
    <!-- Anthropic Card -->
    <div class="card">
      <div class="card-header">
        <div class="card-icon anthropic">A</div>
        <div>
          <div class="card-title">Anthropic API</div>
          <div class="card-subtitle">Add your Claude API key</div>
        </div>
      </div>
      <form method="POST" action="/auth">
        <div class="form-group">
          <label class="form-label">API Key</label>
          <input type="password" name="anthropic_key" class="form-input" placeholder="sk-ant-..." required>
        </div>
        <button type="submit" class="btn btn-anthropic">Add API Key</button>
      </form>
    </div>
    <div class="footer"><p>Powered by Cloudflare Workers</p></div>
  </div>
  <script>function toggleCollapsible(id){document.getElementById(id).classList.toggle('open');}</script>
</body>
</html>`;

export function getManualAuthHtml(authUrl: string, redirectPort: number): string {
  // Using same styling for consistency
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>Complete Sign In</title>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Inter', sans-serif; background: #0f0f23; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { width: 100%; max-width: 500px; background: rgba(255,255,255,0.05); padding: 40px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center; }
    h2 { margin-bottom: 20px; font-size: 1.5rem; }
    p { margin-bottom: 20px; color: rgba(255,255,255,0.7); line-height: 1.6; }
    code { background: rgba(0,0,0,0.3); padding: 2px 6px; border-radius: 4px; color: #a78bfa; }
    input { width: 100%; padding: 14px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 10px; color: #fff; margin-bottom: 20px; font-size: 1rem; }
    button { background: #6366f1; color: #fff; border: none; padding: 14px 24px; border-radius: 10px; font-size: 1rem; font-weight: 600; cursor: pointer; width: 100%; }
    button:hover { background: #5558e6; }
    a.link-btn { display: inline-block; background: #fff; color: #333; text-decoration: none; padding: 12px 24px; border-radius: 10px; font-weight: 600; margin-bottom: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <h2>Complete Google Sign-In</h2>
    <p>1. Click the button below to open Google Sign-In in a new tab.</p>
    <a href="${authUrl}" target="_blank" class="link-btn">Open Google Sign-In</a>
    <p>2. After signing in, you will see an error page (because it tries to redirect to localhost).<br>Copy the <b>URL</b> from that browser tab and paste it below:</p>
    <form method="POST" action="/auth/callback">
      <input type="text" name="redirected_url" placeholder="http://localhost:8132/oauth-callback?code=..." required>
      <button type="submit">Verify & Save</button>
    </form>
  </div>
</body></html>`;
}
