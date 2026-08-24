import { spawnSync } from "node:child_process";

const args = process.argv.slice(2).filter((arg) => arg !== "--runInBand");
const vitestPath = new URL("../node_modules/vitest/vitest.mjs", import.meta.url);
const result = spawnSync(process.execPath, [vitestPath.pathname, "run", ...args], {
  stdio: "inherit",
});

if (result.error) {
  throw result.error;
}

process.exitCode = result.status ?? 1;
