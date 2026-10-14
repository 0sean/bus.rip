import { spawnSync } from "node:child_process";

const [command, ...args] = process.argv.slice(2);

function run(tool, toolArgs, provider) {
  const result = spawnSync(tool, toolArgs, {
    stdio: "inherit",
    env: { ...process.env, DATABASE_PROVIDER: provider },
    shell: process.platform === "win32",
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

if (command === "generate") {
  for (const provider of ["postgres", "d1"]) {
    console.log(`Generating ${provider} migrations`);
    run("drizzle-kit", ["generate", ...args], provider);
  }
} else {
  const provider = process.env.DATABASE_PROVIDER || "postgres";
  if (!["postgres", "d1"].includes(provider)) {
    throw new Error("DATABASE_PROVIDER must be postgres or d1");
  }
  const d1 = provider === "d1";
  if (d1 && command === "studio") {
    throw new Error(
      "For D1, inspect data with wrangler d1 execute DB --local (or --remote). Drizzle Studio here is PostgreSQL-only.",
    );
  }
  const tool = d1 && command === "migrate" ? "wrangler" : "drizzle-kit";
  const toolArgs =
    d1 && command === "migrate"
      ? [
          "d1",
          "migrations",
          "apply",
          "DB",
          ...(args.includes("--remote") ? [] : ["--local"]),
          ...args,
        ]
      : [command, ...args];
  run(tool, toolArgs, provider);
}
