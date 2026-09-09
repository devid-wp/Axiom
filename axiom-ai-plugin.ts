import type { Plugin } from "vite";
import type { Connect } from "vite";

/**
 * Minimal dev server-side AI boundary for AXIOM.
 *
 * The browser NEVER holds the API key. The key (if any) lives in the
 * AXIOM_AI_API_KEY environment variable, read only on the server via this
 * plugin's middleware. Without a key, /api/ai/status reports unconfigured and
 * the client tutor falls back to its offline MockTutorProvider.
 */

interface AiMsg {
  role?: string;
  content?: string;
}

interface AiChatRequest {
  messages?: AiMsg[];
  lang?: string;
  stream?: boolean;
}

function aiKey(): string | undefined {
  return process.env.AXIOM_AI_API_KEY || process.env.AI_API_KEY || undefined;
}

function aiUrl(): string {
  return process.env.AXIOM_AI_URL || "https://api.openai.com/v1/chat/completions";
}

export function axiomAiPlugin(): Plugin {
  return {
    name: "axiom-ai",
    configureServer(server) {
      server.middlewares.use("/api/ai/status", (_req, res: Connect.ServerResponse) => {
        const configured = !!aiKey();
        res.statusCode = 200;
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify({ configured }));
      });

      server.middlewares.use("/api/ai/tutor", async (req, res: Connect.ServerResponse, next) => {
        if ((req.method ?? "").toUpperCase() !== "POST") return next();
        const key = aiKey();
        if (!key) {
          res.statusCode = 503;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ error: "unconfigured" }));
          return;
        }
        let body: AiChatRequest = {};
        try {
          body = JSON.parse(String(req.body ?? "{}")) as AiChatRequest;
        } catch {
          res.statusCode = 400;
          res.end(JSON.stringify({ error: "bad json" }));
          return;
        }
        const messages = (body.messages ?? []).map((m) => ({
          role: (m.role ?? "user") as string,
          content: String(m.content ?? ""),
        }));
        const stream = body.stream === true;
        try {
          const upstream = await fetch(aiUrl(), {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${key}`,
            },
            body: JSON.stringify({
              model: process.env.AXIOM_AI_MODEL || "gpt-4o-mini",
              temperature: 0.4,
              max_tokens: 500,
              stream,
              messages,
            }),
          });
          if (!upstream.ok) {
            res.statusCode = 502;
            res.end(JSON.stringify({ error: `upstream ${upstream.status}` }));
            return;
          }
          if (stream && upstream.body) {
            res.statusCode = 200;
            res.setHeader("Content-Type", "text/event-stream");
            res.setHeader("Cache-Control", "no-cache");
            res.setHeader("Connection", "keep-alive");
            const reader = upstream.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";
            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() ?? "";
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6).trim();
                    if (data === "[DONE]") {
                      res.write("data: [DONE]\n\n");
                    } else {
                      try {
                        const parsed = JSON.parse(data) as { choices?: Array<{ delta?: { content?: string } }> };
                        const delta = parsed.choices?.[0]?.delta?.content;
                        if (delta) {
                          res.write(`data: ${JSON.stringify({ delta })}\n\n`);
                        }
                      } catch {
                        /* skip malformed chunks */
                      }
                    }
                  }
                }
              }
            } finally {
              res.end();
            }
          } else {
            const data = (await upstream.json()) as { choices?: Array<{ message?: { content?: string } }> };
            const reply = data.choices?.[0]?.message?.content ?? "";
            res.statusCode = 200;
            res.setHeader("Content-Type", "application/json");
            res.end(JSON.stringify({ reply }));
          }
        } catch (e) {
          res.statusCode = 502;
          res.end(JSON.stringify({ error: String((e as Error)?.message ?? e) }));
        }
      });
    },
  };
}