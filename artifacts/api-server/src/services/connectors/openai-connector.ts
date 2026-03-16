import { getConfig } from "../../config/ai-services";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ChatCompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  model?: string;
}

export async function chatCompletion(options: ChatCompletionOptions): Promise<string> {
  const config = await getConfig();
  const { url, apiKey, model } = config.openai;

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured. Set it in Settings.");
  }

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || model || "gpt-4o-mini",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI error (${response.status}): ${errorText}`);
  }

  const data = (await response.json()) as any;
  return data.choices?.[0]?.message?.content || "";
}

export async function* streamChatCompletion(options: ChatCompletionOptions): AsyncGenerator<string> {
  const config = await getConfig();
  const { url, apiKey, model } = config.openai;

  if (!apiKey) {
    throw new Error("OpenAI API key is not configured. Set it in Settings.");
  }

  const response = await fetch(`${url}/v1/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: options.model || model || "gpt-4o-mini",
      messages: options.messages,
      temperature: options.temperature ?? 0.7,
      max_tokens: options.max_tokens,
      stream: true,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => "Unknown error");
    throw new Error(`OpenAI error (${response.status}): ${errorText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error("No response stream from OpenAI");

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

export async function checkConnection(): Promise<{
  connected: boolean;
  models?: string[];
  error?: string;
}> {
  try {
    const config = await getConfig();
    const { url, apiKey } = config.openai;

    if (!apiKey) {
      return { connected: false, error: "API key not configured" };
    }

    const response = await fetch(`${url}/v1/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(10000),
    });

    if (!response.ok) {
      return { connected: false, error: `Status ${response.status}` };
    }

    const data = (await response.json()) as any;
    const models = (data.data?.map((m: any) => m.id) || []).slice(0, 5);
    return { connected: true, models };
  } catch (err: any) {
    return { connected: false, error: err.message };
  }
}
