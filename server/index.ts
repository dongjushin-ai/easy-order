import { createServer } from "node:http";
import type { StoreInferenceInput } from "../src/types/enrichment.js";
import { createServerAttributeProvider } from "./providerFactory.js";
import { loadServerEnvironment } from "./loadEnvironment.js";

loadServerEnvironment();

const provider = createServerAttributeProvider();
const port = Number(process.env.ATTRIBUTE_SERVER_PORT ?? 8787);
createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/api/attribute-enrichment") { response.writeHead(404).end(); return; }
  const chunks: Buffer[] = [];
  request.on("data", (chunk) => chunks.push(chunk));
  request.on("end", async () => {
    try {
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8")) as StoreInferenceInput;
      if (!input || !Array.isArray(input.menus) || !Array.isArray(input.schema) || typeof input.storeName !== "string") throw new Error("Invalid request");
      const result = provider.inferStoreAttributes ? await provider.inferStoreAttributes(input) : { results: {}, diagnostics: { provider: provider.id, menuCount: input.menus.length, batchCount: 0, latencyMs: 0, retryCount: 0 } };
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch { response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "Attribute enrichment request could not be processed" })); }
  });
}).listen(port, "127.0.0.1", () => { console.log(`Attribute server listening on http://127.0.0.1:${port}`); });
