import { Router } from "express";
import crypto from "crypto";
import { slackService } from "../slack/service";

const authRouter = Router();

interface QrSession {
  token: string;
  status: "pending" | "success" | "expired" | "error";
  errorMessage?: string;
  userAccessToken?: string;
  createdAt: number;
}

const qrSessions = new Map<string, QrSession>();

const QR_TTL_MS = 5 * 60 * 1000;

const SLACK_BOT_SCOPES = [
  "channels:read",
  "users:read",
  "users.profile:read",
].join(",");

const SLACK_USER_SCOPES = [
  "channels:read",
  "channels:history",
  "groups:read",
  "groups:history",
  "im:read",
  "im:history",
  "mpim:read",
  "mpim:history",
  "chat:write",
  "users:read",
  "users.profile:read",
].join(",");

function getBaseUrl(req: import("express").Request): string {
  const replitDomain = process.env["REPLIT_DEV_DOMAIN"] || process.env["REPLIT_DOMAINS"]?.split(",")[0];
  if (replitDomain) {
    return `https://${replitDomain}`;
  }
  const protocol = req.headers["x-forwarded-proto"] || "https";
  const host = req.headers["x-forwarded-host"] || req.headers.host || "localhost";
  return `${protocol}://${host}`;
}

function cleanExpiredSessions() {
  const now = Date.now();
  for (const [token, session] of qrSessions.entries()) {
    if (now - session.createdAt > QR_TTL_MS) {
      session.status = "expired";
      qrSessions.set(token, session);
      setTimeout(() => qrSessions.delete(token), 60_000);
    }
  }
}

authRouter.get("/auth/status", (_req, res) => {
  res.json(slackService.getAuthStatus());
});

authRouter.get("/auth/qr-code", (req, res) => {
  cleanExpiredSessions();

  if (!slackService.isConfigured()) {
    res.status(503).json({
      error: "not_configured",
      message: "Slack is not configured. Set SLACK_CLIENT_ID and SLACK_CLIENT_SECRET environment variables.",
    });
    return;
  }

  const token = crypto.randomBytes(24).toString("hex");
  const baseUrl = getBaseUrl(req);
  const redirectUri = `${baseUrl}/api/auth/slack/callback`;

  const slackOAuthUrl = `https://slack.com/oauth/v2/authorize?client_id=${encodeURIComponent(process.env["SLACK_CLIENT_ID"]!)}&scope=${encodeURIComponent(SLACK_BOT_SCOPES)}&user_scope=${encodeURIComponent(SLACK_USER_SCOPES)}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${token}`;

  qrSessions.set(token, {
    token,
    status: "pending",
    createdAt: Date.now(),
  });

  res.json({ token, loginUrl: slackOAuthUrl, expiresIn: QR_TTL_MS / 1000 });
});

authRouter.get("/auth/qr-status/:token", (req, res) => {
  const { token } = req.params as { token: string };
  const session = qrSessions.get(token);

  if (!session) {
    res.status(404).json({ status: "expired" });
    return;
  }

  const age = Date.now() - session.createdAt;
  if (age > QR_TTL_MS && session.status === "pending") {
    session.status = "expired";
    qrSessions.set(token, session);
  }

  const response: Record<string, unknown> = {
    status: session.status,
    errorMessage: session.errorMessage,
  };

  if (session.status === "success" && session.userAccessToken) {
    response.accessToken = session.userAccessToken;
  }

  res.json(response);
});

authRouter.get("/auth/slack/callback", async (req, res) => {
  const code = req.query["code"] ? String(req.query["code"]) : null;
  const state = req.query["state"] ? String(req.query["state"]) : null;
  const error = req.query["error"] ? String(req.query["error"]) : null;

  if (error) {
    const session = state ? qrSessions.get(state) : undefined;
    if (session) {
      session.status = "error";
      session.errorMessage = error === "access_denied"
        ? "Odmówiono dostępu do Slack. Spróbuj ponownie i zaakceptuj uprawnienia."
        : `Błąd Slack: ${error}`;
      qrSessions.set(state!, session);
    }
    res.send(callbackPage(false, "Autoryzacja nie powiodła się. Wróć do ekranu auta i zeskanuj nowy kod QR."));
    return;
  }

  if (!code || !state) {
    res.status(400).send(callbackPage(false, "Brakuje wymaganych parametrów."));
    return;
  }

  const session = qrSessions.get(state);
  if (!session || session.status !== "pending") {
    res.status(400).send(callbackPage(false, "Sesja wygasła. Wróć do ekranu auta i zeskanuj nowy kod QR."));
    return;
  }

  try {
    const baseUrl = getBaseUrl(req);
    const redirectUri = `${baseUrl}/api/auth/slack/callback`;

    const tokenResponse = await fetch("https://slack.com/api/oauth.v2.access", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env["SLACK_CLIENT_ID"]!,
        client_secret: process.env["SLACK_CLIENT_SECRET"]!,
        code,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = (await tokenResponse.json()) as Record<string, unknown>;

    if (!tokenData["ok"]) {
      throw new Error(String(tokenData["error"] || "Token exchange failed"));
    }

    const authedUser = tokenData["authed_user"] as Record<string, unknown> | undefined;
    const userToken = authedUser?.["access_token"] ? String(authedUser["access_token"]) : null;
    const botToken = tokenData["access_token"] ? String(tokenData["access_token"]) : null;
    const accessToken = userToken || botToken;

    if (!accessToken) {
      throw new Error("No access token in Slack response");
    }

    console.log(`[Auth] Using ${userToken ? "user" : "bot"} token for Slack API`);
    await slackService.loginWithToken(accessToken);

    session.status = "success";
    session.userAccessToken = accessToken;
    qrSessions.set(state, session);

    res.send(callbackPage(true, "Połączono ze Slackiem! Możesz zamknąć tę stronę — ekran auta załaduje się automatycznie."));
  } catch (err) {
    const message = err instanceof Error ? err.message : "Logowanie nie powiodło się";
    session.status = "error";
    session.errorMessage = message;
    qrSessions.set(state, session);
    res.send(callbackPage(false, `Błąd: ${message}. Wróć do ekranu auta i spróbuj ponownie.`));
  }
});

authRouter.post("/auth/logout", async (_req, res) => {
  try {
    await slackService.logout();
    res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Logout failed";
    res.status(500).json({ error: "logout_failed", message });
  }
});

function callbackPage(success: boolean, message: string): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Slack – Autoryzacja</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: #1a1d21;
      color: #d1d2d3;
      min-height: 100dvh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: #222529;
      border: 1px solid #3a3d41;
      border-radius: 20px;
      padding: 36px 28px;
      width: 100%;
      max-width: 420px;
      display: flex;
      flex-direction: column;
      gap: 24px;
      box-shadow: 0 8px 32px rgba(0,0,0,0.4);
      text-align: center;
    }
    .logo { display: flex; align-items: center; justify-content: center; gap: 12px; }
    .logo-icon {
      width: 48px; height: 48px; background: #4A154B;
      border-radius: 13px; display: flex; align-items: center;
      justify-content: center; font-size: 26px;
    }
    .logo-text { font-size: 22px; font-weight: 700; color: #fff; }
    .status-icon { font-size: 48px; }
    h1 { font-size: 22px; font-weight: 700; color: #fff; }
    p { font-size: 16px; color: #ababad; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="card">
    <div class="logo">
      <div class="logo-icon">💬</div>
      <span class="logo-text">Slack</span>
    </div>
    <div class="status-icon">${success ? "✅" : "❌"}</div>
    <h1>${success ? "Połączono!" : "Błąd"}</h1>
    <p>${message}</p>
  </div>
</body>
</html>`;
}

export default authRouter;
