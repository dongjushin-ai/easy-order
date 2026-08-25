import { createServer } from "node:http";
import type { StoreInferenceInput } from "../src/types/enrichment.js";
import { createServerAttributeProvider } from "./providerFactory.js";
import { loadServerEnvironment } from "./loadEnvironment.js";

loadServerEnvironment();

const provider = createServerAttributeProvider();
const port = Number(process.env.ATTRIBUTE_SERVER_PORT ?? 8787);
export const ENRICHMENT_LIMITS={maxBodyBytes:256_000,maxMenus:50,maxAttributes:30,requestsPerMinute:20} as const;
const requestLog=new Map<string,number[]>();
createServer((request, response) => {
  if (request.method !== "POST" || request.url !== "/api/attribute-enrichment") { response.writeHead(404).end(); return; }
  const client=request.socket.remoteAddress??"unknown",now=Date.now(),recent=(requestLog.get(client)??[]).filter(time=>now-time<60_000);
  if(recent.length>=ENRICHMENT_LIMITS.requestsPerMinute){response.writeHead(429,{"content-type":"application/json","retry-after":"60"}).end(JSON.stringify({error:"Too many requests"}));return}recent.push(now);requestLog.set(client,recent);
  const chunks: Buffer[] = [];
  let bodyBytes=0,rejected=false;
  request.on("data", (chunk) => {bodyBytes+=chunk.length;if(bodyBytes>ENRICHMENT_LIMITS.maxBodyBytes){rejected=true;response.writeHead(413,{"content-type":"application/json"}).end(JSON.stringify({error:"Request is too large"}));request.destroy();return}chunks.push(chunk)});
  request.on("end", async () => {
    if(rejected)return;
    try {
      const input = JSON.parse(Buffer.concat(chunks).toString("utf8")) as StoreInferenceInput;
      if (!input || !Array.isArray(input.menus) || !Array.isArray(input.schema) || typeof input.storeName !== "string") throw new Error("Invalid request");
      if(input.menus.length>ENRICHMENT_LIMITS.maxMenus||input.schema.length>ENRICHMENT_LIMITS.maxAttributes)throw new Error("Request limits exceeded");
      const result = provider.inferStoreAttributes ? await provider.inferStoreAttributes(input) : { results: {}, diagnostics: { provider: provider.id, menuCount: input.menus.length, batchCount: 0, latencyMs: 0, retryCount: 0 } };
      response.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch { response.writeHead(400, { "content-type": "application/json" }).end(JSON.stringify({ error: "Attribute enrichment request could not be processed" })); }
  });
}).listen(port, "127.0.0.1", () => { console.log(`Attribute server listening on http://127.0.0.1:${port}`); });
