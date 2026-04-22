import pc from "picocolors";
import { spinner } from "@clack/prompts";
import { loadConfig } from "../config.js";
import { getBalance, sendUsdc, hasCDPCredentials } from "../cdp.js";
import type { Command } from "commander";

export function registerWallet(program: Command): void {
  const wallet = program.command("wallet").description("Manage your Base wallet");

  wallet
    .command("address")
    .description("Show your wallet address")
    .action(() => {
      const config = loadConfig();
      const addr = config.wallet?.address ?? config.cdp?.address;
      const network = config.wallet?.network ?? config.cdp?.network ?? config.api.network;
      if (!addr) {
        console.log(pc.yellow("No wallet configured. Run `a2a-market init` first."));
        return;
      }
      console.log(pc.bold("Wallet address:"), addr);
      console.log(pc.bold("Network:"), network);
    });

  wallet
    .command("balance")
    .description("Show USDC and ETH balance")
    .option("--json", "Output JSON")
    .action(async (opts) => {
      const config = loadConfig();
      if (!config.cdp?.address) {
        console.error(pc.red("No wallet configured."));
        process.exit(1);
      }
      if (!hasCDPCredentials()) {
        console.error(pc.red("CDP credentials required for balance check."));
        process.exit(1);
      }
      const s = spinner();
      s.start("Fetching balance");
      try {
        const bal = await getBalance(config.cdp.account_name, config.cdp.network);
        s.stop("");
        if (opts.json) {
          console.log(JSON.stringify(bal, null, 2));
        } else {
          console.log(`${pc.bold("USDC:")} ${bal.usdc}`);
          console.log(`${pc.bold("ETH:")}  ${bal.eth}`);
        }
      } catch (err) {
        s.stop(pc.red("Failed to fetch balance"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });

  wallet
    .command("send <amount> <to>")
    .description("Send USDC to an address")
    .action(async (amount, to) => {
      const config = loadConfig();
      if (!config.cdp) {
        console.error(pc.red("No wallet configured."));
        process.exit(1);
      }
      const s = spinner();
      s.start(`Sending ${amount} USDC to ${to}`);
      try {
        const txHash = await sendUsdc(config.cdp.account_name, to, amount, config.cdp.network);
        s.stop(pc.green("✓ Sent"));
        console.log(`Tx: ${txHash}`);
      } catch (err) {
        s.stop(pc.red("Transfer failed"));
        console.error(err instanceof Error ? err.message : err);
        process.exit(1);
      }
    });
}
