const { existsSync } = require("fs");
const { join } = require("path");
const { spawnSync } = require("child_process");

const repoRoot = join(__dirname, "..");
const contractsDir = join(repoRoot, "packages", "contracts");
const contractsPkg = join(contractsDir, "package.json");
const contractsTsconfig = join(contractsDir, "tsconfig.json");

if (!existsSync(contractsPkg) || !existsSync(contractsTsconfig)) {
  console.log("[@repo/contracts] package not found, skipping build");
  process.exit(0);
}

console.log("[@repo/contracts] building shared package...");
const result = spawnSync(
  "npm",
  ["run", "build", "--prefix", contractsDir],
  { stdio: "inherit", shell: true }
);

if (result.status !== 0) {
  console.error("[@repo/contracts] build failed");
  process.exit(result.status ?? 1);
}

console.log("[@repo/contracts] build complete");
