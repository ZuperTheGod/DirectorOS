import { getConfig } from "../../config/ai-services";

export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: { type: string };
}

export async function chatCompletion(options: LLMCompletionOptions): Promise<string> {
  const config = await getConfig();
  const { url, model } = config.lmstudio;

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "local-model",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: false,
      ...(options.response_format ? { response_format: options.response_format } : {}),
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`LM Studio error (${response.status}): ${errorText}`);
  }

  const data = await response.json() as any;
  return data.choices?.[0]?.message?.content || "";
}

export async function* streamChatCompletion(options: LLMCompletionOptions): AsyncGenerator<string> {
  const config = await getConfig();
  const { url, model } = config.lmstudio;

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: model || "local-model",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`LM Studio error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream from LM Studio");

  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data: ")) continue;
      const payload = trimmed.slice(6);
      if (payload === "[DONE]") return;

      try {
        const parsed = JSON.parse(payload) as any;
        const content = parsed.choices?.[0]?.delta?.content;
        if (content) yield content;
      } catch {}
    }
  }
}

export async function checkConnection(): Promise<{ connected: boolean; models?: string[]; error?: string }> {
  try {
    const config = await getConfig();
    const { url } = config.lmstudio;
    const response = await fetch(`${url}/v1/models`, { signal: AbortSignal.timeout(5000) });
    if (!response.ok) return { connected: false, error: `Status ${response.status}` };

    const data = await response.json() as any;
    const models = data.data?.map((m: any) => m.id) || [];
    return { connected: true, models };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
