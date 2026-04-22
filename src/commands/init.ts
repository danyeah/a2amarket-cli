import { intro, outro, text, confirm, spinner } from "@clack/prompts";
import pc from "picocolors";
import { generateKeypair, publicKeyFromPrivate } from "../keys.js";
import { saveConfig, configExists, configPath, type Config } from "../config.js";
import { createOrGetAccount, hasCDPCredentials } from "../cdp.js";
import type { Command } from "commander";

export function registerInit(program: Command): void {
  program
    .command("init")
    .description("Generate Ed25519 keypair and create a CDP wallet")
    .option("--name <name>", "Agent name")
    .option("--network <network>", "Base network: base-sepolia or base", "base-sepolia")
    .option("--force", "Overwrite existing config", false)
    .action(async (opts) => {
      intro(pc.bold("a2a-market init"));

      if (configExists() && !opts.force) {
        console.log(pc.yellow(`Config already exists at ${configPath()}`));
        const overwrite = await confirm({ message: "Overwrite existing config?" });
        if (!overwrite) {
          outro("Aborted.");
          return;
        }
      }

      const name = opts.name ?? await text({
        message: "Agent name",
        placeholder: "my-agent",
        validate: (v) => v.length < 2 ? "Name must be at least 2 characters" : undefined,
      }) as string;

      // Generate Ed25519 keypair
      const s = spinner();
      s.start("Generating Ed25519 keypair");
      const keypair = generateKeypair();
      s.stop(pc.green("✓ Keypair generated"));

      // CDP wallet (optional — requires CDP credentials)
      let cdpInfo: Config["cdp"] = undefined;

      if (hasCDPCredentials()) {
        s.start("Creating CDP wallet on Base");
        try {
          const shortId = keypair.publicKeyHex.slice(0, 8);
          const accountName = `a2a-${shortId}`;
          const account = await createOrGetAccount(accountName, opts.network);
          cdpInfo = {
            account_name: account.name,
            address: account.address,
            network: opts.network,
          };
          s.stop(pc.green(`✓ Wallet created: ${account.address}`));
        } catch (err) {
          s.stop(pc.yellow("⚠ CDP wallet creation failed (credentials missing or invalid)"));
          console.log(pc.dim(String(err)));
        }
      } else {
        console.log(pc.dim("No CDP credentials found — skipping wallet creation."));
        console.log(pc.dim("Set CDP_API_KEY_ID, CDP_API_KEY_SECRET, CDP_WALLET_SECRET to enable."));
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
          name,
          ed25519: {
            public_key_hex: keypair.publicKeyHex,
            private_key_hex: keypair.privateKeyHex,
          },
        },
        cdp: cdpInfo,
        preferences: { default_output: "markdown" },
      };

      saveConfig(config);

      outro(
        pc.green("✓ Initialised") + "\n\n" +
        `  Agent ID:  ${pc.bold(keypair.publicKeyHex.slice(0, 16))}...\n` +
        (cdpInfo ? `  Wallet:    ${pc.bold(cdpInfo.address)}\n` : "") +
        `  Config:    ${configPath()}\n\n` +
        `  Next step: ${pc.cyan("a2a-market register")}`
      );
    });
}
