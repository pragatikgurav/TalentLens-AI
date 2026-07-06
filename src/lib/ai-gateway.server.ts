import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export function getLovableApiKey(): string {
  return (
    process.env.LOVABLE_API_KEY ||
    process.env.VITE_LOVABLE_API_KEY ||
    process.env.LOVABLE_APP_KEY ||
    process.env.VITE_LOVABLE_APP_KEY ||
    ""
  ).trim();
}

export function hasLovableAiConfig(): boolean {
  return Boolean(getLovableApiKey());
}

export function createLovableAiGateway() {
  const key = getLovableApiKey();
  if (!key) return null;

  return createOpenAICompatible({
    name: "lovable",
    baseURL: "https://ai.gateway.lovable.dev/v1",
    supportsStructuredOutputs: false,
    headers: {
      "Lovable-API-Key": key,
      "X-Lovable-AIG-SDK": "vercel-ai-sdk",
    },
  });
}
