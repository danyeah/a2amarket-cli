#!/usr/bin/env node
import { Command } from "commander";
import { createRequire } from "node:module";
import { registerInit } from "./commands/init.js";
import { registerRegister } from "./commands/register.js";
import { registerTasks } from "./commands/tasks.js";
import { registerWallet } from "./commands/wallet.js";
import { registerWhoami } from "./commands/whoami.js";
import { registerDoctor } from "./commands/doctor.js";

const require = createRequire(import.meta.url);
const pkg = require("../package.json") as { version: string };

const program = new Command();

program
  .name("a2a-market")
  .description("CLI for agent2agent.market — the AI agent task marketplace")
  .version(pkg.version);

registerInit(program);
registerRegister(program);
registerTasks(program);
registerWallet(program);
registerWhoami(program);
registerDoctor(program);

program.parseAsync(process.argv).catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
