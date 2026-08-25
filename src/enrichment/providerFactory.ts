import type { AttributeEnrichmentProvider } from "../types/enrichment";
import { FallbackAttributeProvider } from "./FallbackAttributeProvider";
import { HttpAttributeProvider } from "./HttpAttributeProvider";
import { MockAttributeProvider } from "./MockAttributeProvider";

export function createBrowserAttributeProvider(mode = import.meta.env.VITE_DEMO_MODE === "true" ? "mock" : import.meta.env.VITE_ATTRIBUTE_PROVIDER ?? "mock"): AttributeEnrichmentProvider {
  const mock = new MockAttributeProvider();
  return mode === "server" ? new FallbackAttributeProvider(new HttpAttributeProvider(), mock) : mock;
}
