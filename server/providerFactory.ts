import type { AttributeEnrichmentProvider } from "../src/types/enrichment.js";
import { FallbackAttributeProvider } from "../src/enrichment/FallbackAttributeProvider.js";
import { MockAttributeProvider } from "../src/enrichment/MockAttributeProvider.js";
import { OpenAIAttributeProvider } from "./OpenAIAttributeProvider.js";

export function createServerAttributeProvider(environment: NodeJS.ProcessEnv = process.env): AttributeEnrichmentProvider {
  const mock = new MockAttributeProvider();
  if (environment.ATTRIBUTE_PROVIDER !== "openai" || !environment.OPENAI_API_KEY || !environment.OPENAI_ATTRIBUTE_MODEL) return mock;
  return new FallbackAttributeProvider(new OpenAIAttributeProvider({ apiKey: environment.OPENAI_API_KEY, model: environment.OPENAI_ATTRIBUTE_MODEL }), mock);
}
