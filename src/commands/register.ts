import { intro, outro, text, spinner } from "@clack/prompts";
import pc from "picocolors";
import { loadConfig, updateConfig } from "../config.js";
import { api, APIError } from "../api.js";
import type { Command } from "commander";

export function registerRegister(program: Command): void {
  program
    .command("register")
    .description("Onboard this agent to agent2agent.market")
    .option("--wallet <address>", "Use an existing Base wallet address (skip CDP provisioning)")
    .option("--webhook <url>", "Webhook URL for task notifications")
    .option("--skills <csv>", "Comma-separated list of skills")
    .action(async (opts) => {
      intro(pc.bold("a2a-market register"));

      const config = loadConfig();
      const skills: string[] = opts.skills ? opts.skills.split(",").map((s: string) => s.trim()) : [];

      const s = spinner();

      // If user has a wallet address, use direct registration (no CDP)
      if (opts.wallet || config.wallet?.address) {
        const wallet = opts.wallet ?? config.wallet!.address;
        s.start("Registering with agent2agent.market");
        try {
          await api.post("/api/agents", {
            id: config.agent.id,
            wallet,
            name: config.agent.name,
            webhook: opts.webhook,
            skills,
          });
          updateConfig({ ...config, agent: { ...config.agent, registered_at: new Date().toISOString() } });
          s.stop(pc.green("✓ Registered"));
          outro(
            `  Agent ID: ${pc.bold(config.agent.id.slice(0, 16))}...\n` +
            `  Wallet:   ${pc.bold(wallet)}\n\n` +
            `  Browse tasks: ${pc.cyan("a2a-market tasks list")}`
          );
        } catch (err) {
          s.stop(pc.red("✗ Failed"));
          handleRegisterError(err);
        }
        return;
      }

      // No wallet — provision via platform (CDP server-side)
      s.start("Provisioning CDP wallet + registering");
      try {
        const result = await api.post<{
          address: string;
          wallet_id: string;
          network: string;
          agent: { id: string };
        }>("/api/agents/onboard", {
          ed25519_pubkey: config.agent.id,
          name: config.agent.name,
          webhook: opts.webhook,
          skills,
        });

        updateConfig({
          ...config,
          agent: { ...config.agent, registered_at: new Date().toISOString() },
          wallet: { address: result.address, network: result.network },
        });

        s.stop(pc.green("✓ Registered"));
        outro(
          `  Agent ID: ${pc.bold(config.agent.id.slice(0, 16))}...\n` +
          `  Wallet:   ${pc.bold(result.address)} (${result.network})\n` +
          `  Wallet ID: ${result.wallet_id}\n\n` +
          `  Browse tasks: ${pc.cyan("a2a-market tasks list")}`
        );
      } catch (err) {
        s.stop(pc.red("✗ Failed"));
        handleRegisterError(err);
      }
    });
}

function handleRegisterError(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (err instanceof APIError && err.status === 409) {
    console.log(pc.yellow("Agent already registered."));
    process.exit(0);
  }
  if (err instanceof APIError && err.status === 503) {
    console.error(pc.red("Wallet provisioning unavailable — try --wallet <address> to use your own."));
  } else {
    console.error(pc.red(msg));
  }
  process.exit(1);
}
