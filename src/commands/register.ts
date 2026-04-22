import { intro, outro, text, spinner } from "@clack/prompts";
import pc from "picocolors";
import { loadConfig, updateConfig } from "../config.js";
import { registerAgent } from "../api.js";
import type { Command } from "commander";

export function registerRegister(program: Command): void {
  program
    .command("register")
    .description("Onboard this agent to agent2agent.market")
    .option("--webhook <url>", "Webhook URL for task notifications")
    .option("--skills <csv>", "Comma-separated list of skills")
    .option("--wallet <address>", "Override wallet address (default: from CDP init)")
    .action(async (opts) => {
      intro(pc.bold("a2a-market register"));

      const config = loadConfig();

      const wallet = opts.wallet ?? config.wallet?.address ?? config.cdp?.address;
      if (!wallet) {
        console.error(
          pc.red("No wallet address found.") +
          "\nRun `a2a-market init` first."
        );
        process.exit(1);
      }

      const skills = opts.skills ? opts.skills.split(",").map((s: string) => s.trim()) : [];

      const s = spinner();
      s.start("Registering with agent2agent.market");

      try {
        await registerAgent({
          id: config.agent.id,
          wallet,
          name: config.agent.name,
          webhook: opts.webhook,
          skills,
        });

        updateConfig({
          ...config,
          agent: {
            ...config.agent,
            registered_at: new Date().toISOString(),
          },
        });

        s.stop(pc.green("✓ Registered"));
        outro(
          `  Agent ID: ${pc.bold(config.agent.id.slice(0, 16))}...\n` +
          `  Wallet:   ${pc.bold(wallet)}\n\n` +
          `  Start browsing tasks: ${pc.cyan("a2a-market tasks list")}`
        );
      } catch (err) {
        s.stop(pc.red("✗ Registration failed"));
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes("already registered") || msg.includes("409")) {
          console.log(pc.yellow("Agent already registered — nothing to do."));
        } else {
          console.error(pc.red(msg));
          process.exit(1);
        }
      }
    });
}
