import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: string; content: string };

type Body = {
  model?: string;
  messages?: ChatMessage[];
  token?: string;
  trial?: boolean;
};

export const Route = createFileRoute("/api/siftah/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return json({ error: "Invalid JSON body" }, 400);
        }

        const model = (body.model || "").trim();
        const messages = Array.isArray(body.messages) ? body.messages : [];
        if (!model) return json({ error: "Missing model" }, 400);
        if (messages.length === 0) return json({ error: "Missing messages" }, 400);

        const userToken = typeof body.token === "string" ? body.token.trim() : "";
        const serverToken = (process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN || "").trim();
        const token = userToken || serverToken;

        // No token configured → honest demo reply so the UI still works while you wire HF.
        if (!token) {
          const last = [...messages].reverse().find((m) => m.role === "user");
          const q = last?.content?.slice(0, 200) || "";
          return json({
            reply:
              `Siftah demo mode (no Hugging Face token on server yet).\n\n` +
              `You said: “${q}”\n\n` +
              `Add HUGGINGFACE_API_TOKEN in Vercel env for shared trial replies, ` +
              `or users can paste their own hf_ token in the UI. Model requested: ${model}`,
          });
        }

        try {
          const reply = await hfChat(model, messages, token);
          return json({ reply });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "Upstream model error";
          return json({ error: msg }, 502);
        }
      },
    },
  },
});

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function hfChat(model: string, messages: ChatMessage[], token: string) {
  // Prefer OpenAI-compatible router when available; fall back to text-generation.
  const routerUrl = "https://router.huggingface.co/v1/chat/completions";
  const res = await fetch(routerUrl, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages: messages.map((m) => ({
        role: m.role === "assistant" ? "assistant" : m.role === "system" ? "system" : "user",
        content: String(m.content || "").slice(0, 8000),
      })),
      max_tokens: 512,
      temperature: 0.7,
    }),
  });

  if (res.ok) {
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const text = data.choices?.[0]?.message?.content;
    if (text) return text;
  }

  // Fallback: classic inference API text generation
  const prompt = messages
    .map((m) => `${m.role.toUpperCase()}: ${m.content}`)
    .join("\n") + "\nASSISTANT:";

  const tg = await fetch(`https://api-inference.huggingface.co/models/${encodeURIComponent(model)}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      inputs: prompt.slice(0, 12000),
      parameters: {
        max_new_tokens: 400,
        temperature: 0.7,
        return_full_text: false,
      },
    }),
  });

  const raw = await tg.text();
  if (!tg.ok) {
    throw new Error(`Hugging Face ${tg.status}: ${raw.slice(0, 280)}`);
  }

  try {
    const parsed = JSON.parse(raw) as Array<{ generated_text?: string }> | { generated_text?: string };
    if (Array.isArray(parsed)) return parsed[0]?.generated_text || raw;
    if (parsed && typeof parsed === "object" && "generated_text" in parsed) {
      return parsed.generated_text || raw;
    }
  } catch {
    /* plain text */
  }
  return raw;
}
