import fs from "fs";
import path from "path";
import { WebClient } from "@slack/web-api";
import { SocketModeClient } from "@slack/socket-mode";
import type { Server as SocketServer } from "socket.io";

const SESSION_FILE = path.join(process.cwd(), "slack-session.json");

interface Conversation {
  id: string;
  name: string;
  snippet: string | null;
  unreadCount: number;
  participants: Participant[];
  imageUrl: string | null;
  timestamp: string | null;
  isGroup: boolean;
  type: "channel" | "dm" | "group";
}

interface Participant {
  id: string;
  name: string;
  imageUrl: string | null;
}

interface Message {
  id: string;
  body: string | null;
  timestamp: string;
  senderId: string;
  senderName: string;
  isOwn: boolean;
  attachments: Attachment[];
}

interface Attachment {
  id: string;
  type: string;
  url: string | null;
  name: string | null;
}

interface SlackSession {
  accessToken: string;
  userId: string;
  teamId: string;
  teamName: string;
}

class SlackService {
  private client: WebClient | null = null;
  private socketMode: SocketModeClient | null = null;
  private session: SlackSession | null = null;
  private io: SocketServer | null = null;
  private userCache = new Map<string, { name: string; image: string | null }>();
  private displayName: string | null = null;
  private profilePicture: string | null = null;

  setSocketServer(io: SocketServer) {
    this.io = io;
  }

  isLoggedIn(): boolean {
    return this.client !== null && this.session !== null;
  }

  isConfigured(): boolean {
    return !!(process.env["SLACK_CLIENT_ID"] && process.env["SLACK_CLIENT_SECRET"]);
  }

  getAuthStatus() {
    if (!this.isConfigured()) {
      return {
        isLoggedIn: false,
        userId: null,
        displayName: null,
        profilePicture: null,
        workspaceName: null,
        configError: "Brak konfiguracji Slack. Ustaw SLACK_CLIENT_ID i SLACK_CLIENT_SECRET w zmiennych środowiskowych.",
      };
    }
    return {
      isLoggedIn: this.isLoggedIn(),
      userId: this.session?.userId ?? null,
      displayName: this.displayName,
      profilePicture: this.profilePicture,
      workspaceName: this.session?.teamName ?? null,
      configError: null,
    };
  }

  async loginWithToken(accessToken: string): Promise<void> {
    const tempClient = new WebClient(accessToken);

    const authTest = await tempClient.auth.test();
    if (!authTest.ok || !authTest.user_id || !authTest.team_id) {
      throw new Error("Nieprawidłowy token Slack");
    }

    this.session = {
      accessToken,
      userId: authTest.user_id,
      teamId: authTest.team_id,
      teamName: String(authTest.team ?? "Workspace"),
    };

    this.client = tempClient;

    try {
      const userInfo = await this.client.users.info({ user: this.session.userId });
      if (userInfo.ok && userInfo.user) {
        const u = userInfo.user as Record<string, unknown>;
        const profile = u["profile"] as Record<string, unknown> | undefined;
        this.displayName = String(profile?.["real_name"] || profile?.["display_name"] || u["name"] || "User");
        this.profilePicture = profile?.["image_72"] ? String(profile["image_72"]) : null;
      }
    } catch {
      this.displayName = String(authTest.user ?? "User");
    }

    this.saveSession();
    await this.startSocketMode();
  }

  async loginWithSession(): Promise<boolean> {
    if (!fs.existsSync(SESSION_FILE)) {
      return false;
    }

    try {
      const raw = JSON.parse(fs.readFileSync(SESSION_FILE, "utf-8"));
      if (!raw.accessToken) return false;

      await this.loginWithToken(raw.accessToken);
      return true;
    } catch {
      try { fs.unlinkSync(SESSION_FILE); } catch { /* ignore */ }
      return false;
    }
  }

  private saveSession() {
    if (!this.session) return;
    try {
      fs.writeFileSync(SESSION_FILE, JSON.stringify(this.session), "utf-8");
    } catch {
      /* ignore */
    }
  }

  private async startSocketMode() {
    const appToken = process.env["SLACK_APP_TOKEN"];
    if (!appToken) {
      console.log("[Slack] SLACK_APP_TOKEN not set — real-time events disabled. Set an app-level token with connections:write scope for live updates.");
      return;
    }

    try {
      if (this.socketMode) {
        await this.socketMode.disconnect();
      }

      this.socketMode = new SocketModeClient({ appToken });

      this.socketMode.on("message", async ({ event, ack }) => {
        await ack();
        if (!event || !this.io || !this.session) return;

        const ev = event as Record<string, unknown>;
        if (ev["subtype"] && ev["subtype"] !== "me_message") return;

        const channelId = String(ev["channel"] || "");
        const senderId = String(ev["user"] || "");
        const senderInfo = await this.resolveUser(senderId);

        const formattedMessage: Message = {
          id: String(ev["client_msg_id"] || ev["ts"] || Date.now()),
          body: ev["text"] ? String(ev["text"]) : null,
          timestamp: ev["ts"] ? new Date(Number(ev["ts"]) * 1000).toISOString() : new Date().toISOString(),
          senderId,
          senderName: senderInfo.name,
          isOwn: senderId === this.session.userId,
          attachments: [],
        };

        this.io.emit("new-message", { channelId, message: formattedMessage });
        this.io.emit("conversation-updated");
      });

      await this.socketMode.start();
      console.log("[Slack] Socket Mode connected — listening for real-time events");
    } catch (err) {
      console.error("[Slack] Socket Mode connection failed:", err);
    }
  }

  private async resolveUser(userId: string): Promise<{ name: string; image: string | null }> {
    if (this.userCache.has(userId)) {
      return this.userCache.get(userId)!;
    }

    if (!this.client) {
      return { name: userId, image: null };
    }

    try {
      const info = await this.client.users.info({ user: userId });
      if (info.ok && info.user) {
        const u = info.user as Record<string, unknown>;
        const profile = u["profile"] as Record<string, unknown> | undefined;
        const result = {
          name: String(profile?.["real_name"] || profile?.["display_name"] || u["name"] || userId),
          image: profile?.["image_72"] ? String(profile["image_72"]) : null,
        };
        this.userCache.set(userId, result);
        return result;
      }
    } catch { /* ignore */ }

    return { name: userId, image: null };
  }

  async getConversations(limit = 50): Promise<Conversation[]> {
    if (!this.client || !this.session) throw new Error("Not logged in");

    const result = await this.client.conversations.list({
      types: "public_channel,private_channel,mpim,im",
      limit,
      exclude_archived: true,
    });

    if (!result.ok || !result.channels) {
      throw new Error("Failed to get conversations");
    }

    const conversations: Conversation[] = [];

    for (const ch of result.channels) {
      const channel = ch as Record<string, unknown>;
      const id = String(channel["id"] || "");
      const isIm = Boolean(channel["is_im"]);
      const isMpim = Boolean(channel["is_mpim"]);
      const isChannel = Boolean(channel["is_channel"] || channel["is_group"]);

      let name = String(channel["name"] || "");
      let type: "channel" | "dm" | "group" = "channel";
      const participants: Participant[] = [];

      if (isIm) {
        type = "dm";
        const otherUserId = String(channel["user"] || "");
        const userInfo = await this.resolveUser(otherUserId);
        name = userInfo.name;
        participants.push({ id: otherUserId, name: userInfo.name, imageUrl: userInfo.image });
      } else if (isMpim) {
        type = "group";
        name = String(channel["name"] || "Group DM").replace("mpdm-", "").replace(/--/g, ", ").replace(/-\d+$/, "");
      }

      const topic = channel["topic"] as Record<string, unknown> | undefined;
      const snippet = topic?.["value"] ? String(topic["value"]) : null;

      const lastUpdated = Number(channel["updated"] || channel["last_read"] || 0);
      const timestamp = lastUpdated > 0
        ? new Date(lastUpdated * 1000).toISOString()
        : null;

      conversations.push({
        id,
        name,
        snippet,
        unreadCount: Number(channel["unread_count"] || channel["unread_count_display"] || 0),
        participants,
        imageUrl: null,
        timestamp,
        isGroup: isChannel || isMpim,
        type,
      });
    }

    conversations.sort((a, b) => {
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tB - tA;
    });

    return conversations;
  }

  async getMessages(channelId: string, limit = 30, cursor?: string): Promise<Message[]> {
    if (!this.client || !this.session) throw new Error("Not logged in");

    const result = await this.client.conversations.history({
      channel: channelId,
      limit,
      ...(cursor ? { cursor } : {}),
    });

    if (!result.ok || !result.messages) {
      throw new Error("Failed to get messages");
    }

    const messages: Message[] = [];

    for (const m of result.messages) {
      const msg = m as Record<string, unknown>;
      if (msg["subtype"] && msg["subtype"] !== "me_message") continue;

      const senderId = String(msg["user"] || "");
      const senderInfo = await this.resolveUser(senderId);

      const slackAttachments = (msg["files"] as Array<Record<string, unknown>> | undefined) || [];
      const attachments: Attachment[] = slackAttachments.map((f) => ({
        id: String(f["id"] || Date.now()),
        type: String(f["filetype"] || "file"),
        url: f["url_private"] ? String(f["url_private"]) : null,
        name: f["name"] ? String(f["name"]) : null,
      }));

      messages.push({
        id: String(msg["client_msg_id"] || msg["ts"] || ""),
        body: msg["text"] ? String(msg["text"]) : null,
        timestamp: msg["ts"] ? new Date(Number(msg["ts"]) * 1000).toISOString() : new Date().toISOString(),
        senderId,
        senderName: senderInfo.name,
        isOwn: senderId === this.session.userId,
        attachments,
      });
    }

    return messages.reverse();
  }

  async sendMessage(channelId: string, text: string): Promise<Message> {
    if (!this.client || !this.session) throw new Error("Not logged in");

    const result = await this.client.chat.postMessage({
      channel: channelId,
      text,
    });

    if (!result.ok) {
      throw new Error("Failed to send message");
    }

    return {
      id: String(result.ts || Date.now()),
      body: text,
      timestamp: result.ts ? new Date(Number(result.ts) * 1000).toISOString() : new Date().toISOString(),
      senderId: this.session.userId,
      senderName: this.displayName || "Me",
      isOwn: true,
      attachments: [],
    };
  }

  async logout(): Promise<void> {
    if (this.socketMode) {
      try { await this.socketMode.disconnect(); } catch { /* ignore */ }
      this.socketMode = null;
    }

    this.client = null;
    this.session = null;
    this.displayName = null;
    this.profilePicture = null;
    this.userCache.clear();

    try {
      if (fs.existsSync(SESSION_FILE)) {
        fs.unlinkSync(SESSION_FILE);
      }
    } catch { /* ignore */ }
  }
}

export const slackService = new SlackService();
