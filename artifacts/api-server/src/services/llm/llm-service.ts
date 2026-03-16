import type { LLMProvider } from "./llm-provider";
import { LMStudioProvider } from "./providers/lmstudio-provider";
import { OpenAIProvider } from "./providers/openai-provider";
import { getConfig } from "../../config/ai-services";

const providers: Record<string, LLMProvider> = {
  lmstudio: new LMStudioProvider(),
  openai: new OpenAIProvider(),
};

export async function getLLMProvider(): Promise<LLMProvider> {
  const config = await getConfig();

  const explicit = config.llmProvider;
  if (explicit && providers[explicit]) {
    return providers[explicit];
  }

  if (config.openai.apiKey && config.openai.apiKey.length > 0) {
    return providers.openai;
  }

  return providers.lmstudio;
}

export function getProviderByName(name: string): LLMProvider | undefined {
  return providers[name];
}

export function getAvailableProviders(): string[] {
  return Object.keys(providers);
}

export { LMStudioProvider, OpenAIProvider };
export type { LLMProvider } from "./llm-provider";
export type { LLMMessage, LLMCompletionOptions } from "./llm-provider";
