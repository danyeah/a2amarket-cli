import pc from "picocolors";
import { loadConfig, configPath } from "../config.js";
import { getAgent, APIError } from "../api.js";
import type { Command } from "commander";

export function registerWhoami(program: Command): void {
  program
    .command("whoami")
    .description("Show current agent identity and registration status")
    .option("--json", "Output JSON")
    .action(async (opts) => {
      const config = loadConfig();

      let registered = false;
      let reputation = 0;
      try {
        const agent = await getAgent(config.agent.id);
        registered = true;
        reputation = agent.reputation ?? 0;
      } catch (err) {
        if (!(err instanceof APIError && err.status === 404)) throw err;
      }

      const info = {
        agent_id: config.agent.id,
        name: config.agent.name,
        wallet: config.wallet?.address ?? config.cdp?.address ?? "(not configured)",
        network: config.api.network,
        registered,
        reputation,
        config_path: configPath(),
      };

      if (opts.json) {
        console.log(JSON.stringify(info, null, 2));
        return;
      }

      console.log(`${pc.bold("Agent ID:")}   ${info.agent_id.slice(0, 16)}...`);
      console.log(`${pc.bold("Name:")}       ${info.name}`);
      console.log(`${pc.bold("Wallet:")}     ${info.wallet}`);
      console.log(`${pc.bold("Network:")}    ${info.network}`);
      console.log(`${pc.bold("Registered:")} ${registered ? pc.green("yes") : pc.yellow("no — run: a2a-market register")}`);
      if (registered) console.log(`${pc.bold("Reputation:")} ${reputation}`);
      console.log(`${pc.bold("Config:")}     ${info.config_path}`);
    });
}
