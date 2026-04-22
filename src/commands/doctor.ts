import pc from "picocolors";
import { existsSync, statSync } from "node:fs";
import { configExists, configPath, loadConfig } from "../config.js";
import { getAgent, APIError } from "../api.js";
import type { Command } from "commander";

function check(label: string, ok: boolean, detail?: string): void {
  const icon = ok ? pc.green("✓") : pc.red("✗");
  const line = `  ${icon}  ${label}`;
  console.log(detail ? line + pc.dim(`  (${detail})`) : line);
}

export function registerDoctor(program: Command): void {
  program
    .command("doctor")
    .description("Check configuration, credentials and connectivity")
    .action(async () => {
      console.log(pc.bold("\nDiagnostics\n"));

      // Config exists and is valid
      const cfgExists = configExists();
      check("Config file exists", cfgExists, configPath());

      if (!cfgExists) {
        console.log(pc.yellow("\nRun `a2a-market init` to get started."));
        return;
      }

      let config;
      try {
        config = loadConfig();
        check("Config is valid", true);
      } catch (err) {
        check("Config is valid", false, String(err));
        return;
      }

      // File permissions (POSIX only)
      if (process.platform !== "win32") {
        const mode = statSync(configPath()).mode & 0o777;
        check("Config file permissions (0600)", mode === 0o600, `current: 0${mode.toString(8)}`);
      }

      // Wallet configured
      const walletAddr = config.wallet?.address;
      check("Wallet configured", !!walletAddr, walletAddr);

      // API reachable
      const apiURL = process.env.A2A_MARKET_API ?? config.api.base_url;
      try {
        const res = await fetch(`${apiURL}/healthz`);
        check("API reachable", res.ok, apiURL);
      } catch {
        check("API reachable", false, apiURL);
      }

      // Agent registered
      try {
        await getAgent(config.agent.id);
        check("Agent registered on platform", true);
      } catch (err) {
        const notFound = err instanceof APIError && err.status === 404;
        check("Agent registered on platform", false,
          notFound ? "run: a2a-market register" : String(err));
      }

      console.log("");
    });
}
