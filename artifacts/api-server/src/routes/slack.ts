import { Router } from "express";
import { slackService } from "../slack/service";

const slackRouter = Router();

slackRouter.get("/slack/conversations", async (req, res) => {
  if (!slackService.isLoggedIn()) {
    res.status(401).json({ error: "unauthorized", message: "Not logged in" });
    return;
  }

  try {
    const limit = req.query["limit"] ? Number(req.query["limit"]) : 50;
    const conversations = await slackService.getConversations(limit);
    res.json(conversations);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get conversations";
    res.status(500).json({ error: "server_error", message });
  }
});

slackRouter.get("/slack/conversations/:channelId/messages", async (req, res) => {
  if (!slackService.isLoggedIn()) {
    res.status(401).json({ error: "unauthorized", message: "Not logged in" });
    return;
  }

  try {
    const { channelId } = req.params as { channelId: string };
    const limit = req.query["limit"] ? Number(req.query["limit"]) : 30;
    const cursor = req.query["cursor"] ? String(req.query["cursor"]) : undefined;

    const messages = await slackService.getMessages(channelId, limit, cursor);
    res.json(messages);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to get messages";
    res.status(500).json({ error: "server_error", message });
  }
});

slackRouter.post("/slack/conversations/:channelId/messages", async (req, res) => {
  if (!slackService.isLoggedIn()) {
    res.status(401).json({ error: "unauthorized", message: "Not logged in" });
    return;
  }

  try {
    const { channelId } = req.params as { channelId: string };
    const { body } = req.body as { body?: string };

    if (!body || !body.trim()) {
      res.status(400).json({ error: "bad_request", message: "Message body is required" });
      return;
    }

    const message = await slackService.sendMessage(channelId, body.trim());
    res.json(message);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to send message";
    res.status(500).json({ error: "server_error", message });
  }
});

export default slackRouter;
