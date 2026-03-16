export interface LLMMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface LLMCompletionOptions {
  messages: LLMMessage[];
  temperature?: number;
  max_tokens?: number;
  response_format?: { type: string };
}

export interface LLMProvider {
  readonly name: string;
  chat(options: LLMCompletionOptions): Promise<string>;
  streamChat(options: LLMCompletionOptions): AsyncGenerator<string>;
  checkConnection(): Promise<{ connected: boolean; models?: string[]; error?: string }>;
}
