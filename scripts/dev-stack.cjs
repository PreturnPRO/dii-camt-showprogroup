const { spawn } = require("node:child_process");
const path = require("node:path");

const commands = [
  {
    name: "frontend",
    cwd: process.cwd(),
    script: path.join(process.cwd(), "node_modules/vite/bin/vite.js"),
    args: [],
  },
  {
    name: "backend",
    cwd: path.join(process.cwd(), "backend"),
    script: path.join(process.cwd(), "backend/node_modules/tsx/dist/cli.mjs"),
    args: ["watch", "src/server.ts"],
  },
];

const children = commands.map(({ name, cwd, script, args }) => {
  const child = spawn(process.execPath, [script, ...args], {
    cwd,
    stdio: "inherit",
  });

  child.on("error", (error) => {
    console.error(`Could not start ${name}:`, error.message);
    stopChildren(1);
  });

  child.on("exit", (code, signal) => {
    if (!stopping) {
      console.error(`${name} stopped${signal ? ` (${signal})` : ` with exit code ${code}`}. Stopping the other service.`);
      stopChildren(code || 1);
    }
  });

  return child;
});

let stopping = false;

function stopChildren(exitCode = 0) {
  if (stopping) return;
  stopping = true;
  for (const child of children) {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  }
  process.exitCode = exitCode;
}

process.on("SIGINT", () => stopChildren(0));
process.on("SIGTERM", () => stopChildren(0));
