import { readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { renderEvaluationReport, type StoredEvaluation } from "./report.js";

const inputPath = resolve("evaluation-results/latest.json");
const outputPath = resolve("evaluation-results/latest.md");
const payload = JSON.parse(await readFile(inputPath, "utf8")) as StoredEvaluation;
await writeFile(outputPath, renderEvaluationReport(payload), "utf8");
console.log(`[Evaluation report rebuilt] ${outputPath}`);
