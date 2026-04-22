import { intro, outro, spinner } from "@clack/prompts";
import pc from "picocolors";
import { generateKeypair } from "../keys.js";
import { generateLocalWallet } from "../localWallet.js";
import { saveConfig, configExists, configPath, type Config } from "../config.js";
import { createOrGetAccount, hasCDPCredentials } from "../cdp.js";
import type { Command } from "commander";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Generate Ed25519 identity and a local Base wallet")
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

      // 1. Ed25519 keypair (API signing identity)
      s.start("Generating Ed25519 keypair");
      const keypair = generateKeypair();
      s.stop(pc.green("✓ Ed25519 keypair generated"));

      // 2. Local Base wallet (no CDP required)
      s.start("Generating local Base wallet");
      const localWallet = generateLocalWallet();
      s.stop(pc.green(`✓ Wallet generated: ${localWallet.address}`));

      // 3. Optional: CDP MPC wallet
      let cdpInfo: Config["cdp"] = undefined;
      if (hasCDPCredentials()) {
        s.start("Creating CDP MPC wallet (optional)");
        try {
          const shortId = keypair.publicKeyHex.slice(0, 8);
          const account = await createOrGetAccount(`a2a-${shortId}`, opts.network);
          cdpInfo = { account_name: account.name, address: account.address, network: opts.network };
          s.stop(pc.green(`✓ CDP wallet created: ${account.address}`));
        } catch (err) {
          s.stop(pc.dim("CDP wallet skipped: " + (err instanceof Error ? err.message : err)));
        }
      }

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
        wallet: {
          address: localWallet.address,
          private_key_hex: localWallet.privateKeyHex,
          network: opts.network,
        },
        cdp: cdpInfo,
        preferences: { default_output: "markdown" },
      };

      saveConfig(config);

      outro(
        pc.green("✓ Initialised\n") +
        `\n  Agent ID:  ${pc.bold(keypair.publicKeyHex.slice(0, 16))}...` +
        `\n  Wallet:    ${pc.bold(localWallet.address)} (${opts.network})` +
        `\n  Config:    ${configPath()}` +
        `\n\n  ${pc.dim("Keep your config file safe — it contains your private keys.")}` +
        `\n\n  Next step: ${pc.cyan("a2a-market register")}`
      );
    });
}
