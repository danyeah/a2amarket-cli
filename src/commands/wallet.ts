import pc from "picocolors";
import { spinner } from "@clack/prompts";
import { loadConfig } from "../config.js";
import { getOnchainBalance } from "../onchain.js";
import type { Command } from "commander";

export function registerWallet(program: Command): void {
  const wallet = program.command("wallet").description("Manage your Base wallet");

  wallet
    .command("address")
    .description("Show your wallet address")
    .action(() => {
      const config = loadConfig();
      const addr = config.wallet?.address;
      const network = config.wallet?.network ?? config.api.network;
      if (!addr) {
        console.log(pc.yellow("No wallet configured. Run `a2a-market register` first."));
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
      const addr = config.wallet?.address;
      const network = config.wallet?.network ?? config.api.network;
      if (!addr) {
        console.error(pc.red("No wallet configured. Run `a2a-market register` first."));
        process.exit(1);
      }
      const s = spinner();
      s.start("Fetching on-chain balance");
      try {
        const bal = await getOnchainBalance(addr, network);
        s.stop("");
        if (opts.json) {
          console.log(JSON.stringify({ address: addr, network, ...bal }, null, 2));
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
}
