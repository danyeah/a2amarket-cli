import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { generateKeypair } from "../keys.js";
import { saveConfig, configExists, configPath, type Config } from "../config.js";
import type { Command } from "commander";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Generate Ed25519 identity keypair")
    .option("--name <name>", "Agent name", "my-agent")
    .option("--network <network>", "Base network: base-sepolia or base", "base-sepolia")
    .option("--force", "Overwrite existing config", false)
    .action(async (opts) => {
      intro(pc.bold("a2a-market init"));

      if (configExists() && !opts.force) {
        console.log(pc.yellow(`Config already exists at ${configPath()}`));
        console.log(pc.dim("Use --force to overwrite."));
        process.exit(0);
      }

      const s = spinner();
      s.start("Generating Ed25519 keypair");
      const keypair = generateKeypair();
      s.stop(pc.green("✓ Keypair generated"));

      const config: Config = {
        version: 1,
        created_at: new Date().toISOString(),
        api: {
          base_url: "https://api.agent2agent.market",
          network: opts.network as "base-sepolia" | "base",
        },
        agent: {
          id: keypair.publicKeyHex,
          name: opts.name,
          ed25519: {
            public_key_hex: keypair.publicKeyHex,
            private_key_hex: keypair.privateKeyHex,
          },
        },
        preferences: { default_output: "markdown" },
      };

      saveConfig(config);

      outro(
        pc.green("✓ Initialised\n") +
        `\n  Agent ID:  ${pc.bold(keypair.publicKeyHex.slice(0, 16))}...` +
        `\n  Config:    ${configPath()}` +
        `\n\n  ${pc.dim("Keep your config file safe — it contains your private key.")}` +
        `\n\n  Next step: ${pc.cyan("a2a-market register")}`
      );
    });
}
