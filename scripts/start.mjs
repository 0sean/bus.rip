import { spawn } from "node:child_process";
import { constants } from "node:os";

const provider = process.env.DATABASE_PROVIDER || "postgres";
if (!["postgres", "d1"].includes(provider)) {
  throw new Error("DATABASE_PROVIDER must be postgres or d1");
}

const args = process.argv.slice(2);
const child =
  provider === "d1"
    ? spawn("vite", ["preview", ...args], {
        stdio: "inherit",
        shell: process.platform === "win32",
      })
    : spawn(process.execPath, [".output/server/index.mjs", ...args], {
        stdio: "inherit",
      });

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => child.kill(signal));
}
child.on("error", (error) => {
  console.error(error);
  process.exitCode = 1;
});
child.on("exit", (code, signal) => {
  process.exitCode = code ?? (signal ? 128 + constants.signals[signal] : 1);
});
