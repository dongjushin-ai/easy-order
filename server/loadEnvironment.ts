import { existsSync } from "node:fs";
import { resolve } from "node:path";

export function loadServerEnvironment(): void {
  const envPath = resolve(".env");
  if (!existsSync(envPath)) return;
  process.loadEnvFile(envPath);
}
