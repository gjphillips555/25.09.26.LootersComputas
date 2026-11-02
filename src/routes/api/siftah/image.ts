import { createFileRoute } from "@tanstack/react-router";
import { getSessionUser } from "@/lib/auth/verify.server";

const ALLOWED_MODELS = new Set([
  "Qwen/Qwen-Image",
  "black-forest-labs/FLUX.1-schnell",
  "stabilityai/stable-diffusion-xl-base-1.0",
]);

type ImageBody = { prompt?: string; model?: string; referenceImage?: string };

export const Route = createFileRoute("/api/siftah/image")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const user = await getSessionUser();
          if (!user) return json({ error: "Sign in to use Da Vinci image generation." }, 401);

          const token = (process.env.HUGGINGFACE_API_TOKEN || process.env.HF_TOKEN || "").trim();
          if (!token) return json({ error: "Da Vinci is not connected. Add a Hugging Face inference token to the Vercel environment." }, 503);

          const body = await request.json() as ImageBody;
          const prompt = typeof body.prompt === "string" ? body.prompt.trim().slice(0, 1800) : "";
          const model = typeof body.model === "string" && ALLOWED_MODELS.has(body.model) ? body.model : "Qwen/Qwen-Image";
          if (!prompt) return json({ error: "Describe the image you want to create." }, 400);

          const reference = typeof body.referenceImage === "string" ? body.referenceImage : "";
          let payload: { inputs: string; parameters?: Record<string, unknown> };
          let endpointModel = model;
          if (reference) {
            if (!reference.startsWith("data:image/") || reference.length > 4_200_000) {
              return json({ error: "Reference image is invalid or too large. Use an image under 3 MB." }, 400);
            }
            const match = reference.match(/^data:image\/(png|jpeg|jpg|webp);base64,([A-Za-z0-9+/=]+)$/i);
            if (!match) return json({ error: "Use a PNG, JPEG or WebP reference image." }, 400);
            endpointModel = "stabilityai/stable-diffusion-xl-base-1.0";
            payload = { inputs: match[2], parameters: { prompt, guidance_scale: 7.5, num_inference_steps: 30 } };
          } else {
            payload = { inputs: prompt, parameters: { width: 1024, height: 1024, num_inference_steps: 25 } };
          }

          const response = await fetch(`https://router.huggingface.co/hf-inference/models/${endpointModel}`, {
            method: "POST",
            headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
          if (!response.ok) {
            const detail = (await response.text()).slice(0, 700);
            return json({ error: detail || `Image provider returned HTTP ${response.status}.` }, 502);
          }
          const contentType = response.headers.get("content-type") || "image/png";
          if (!contentType.startsWith("image/")) {
            const detail = (await response.text()).slice(0, 500);
            return json({ error: detail || "The selected provider did not return an image." }, 502);
          }
          const bytes = Buffer.from(await response.arrayBuffer());
          return json({ image: `data:${contentType};base64,${bytes.toString("base64")}` });
        } catch (error) {
          return json({ error: error instanceof Error ? error.message : "Da Vinci image generation failed." }, 500);
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
