import type { AiProvider } from "@/lib/db/types";

export type PublicProviderConfig = {
  provider: AiProvider;
  baseUrl: string | null;
  model: string;
};

export function publicProviderConfig(config: PublicProviderConfig & { apiKey: string | null }): PublicProviderConfig {
  return {
    provider: config.provider,
    baseUrl: config.baseUrl,
    model: config.model,
  };
}
