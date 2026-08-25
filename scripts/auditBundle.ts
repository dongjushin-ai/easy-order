import {readdir,readFile} from "node:fs/promises";
import {join} from "node:path";
const forbidden=["OPENAI_API_KEY","sk-proj-",".env.local","OPENAI_ATTRIBUTE_MODEL="];
async function files(dir:string):Promise<string[]>{const output:string[]=[];for(const entry of await readdir(dir,{withFileTypes:true})){const path=join(dir,entry.name);output.push(...(entry.isDirectory()?await files(path):[path]))}return output}
const targets=await files("dist"),hits:string[]=[];
for(const file of targets){const text=await readFile(file,"utf8").catch(()=>"");for(const token of forbidden)if(text.includes(token))hits.push(`${file}: ${token}`);if(/sk-[A-Za-z0-9_-]{20,}/.test(text))hits.push(`${file}: API-key-like value`)}
if(hits.length)throw new Error(`Public bundle secret audit failed:\n${hits.join("\n")}`);
console.log(`[bundle audit] ${targets.length} public files checked; no forbidden secret markers found`);
