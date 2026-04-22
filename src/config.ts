import { existsSync, mkdirSync, readFileSync, writeFileSync, chmodSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { z } from "zod";

const CONFIG_DIR = join(homedir(), ".a2a-market");
const CONFIG_FILE = join(CONFIG_DIR, "config.json");

const ConfigSchema = z.object({
  version: z.literal(1),
  created_at: z.string(),
  api: z.object({
    base_url: z.string().default("https://api.agent2agent.market"),
    network: z.enum(["base-sepolia", "base"]).default("base-sepolia"),
  }),
  agent: z.object({
    id: z.string(),
    name: z.string(),
    ed25519: z.object({
      public_key_hex: z.string(),
      private_key_hex: z.string(),
    }),
    registered_at: z.string().optional(),
  }),
  wallet: z.object({
    address: z.string(),
    network: z.string(),
  }).optional(),
  cdp: z.object({
    account_name: z.string(),
    address: z.string(),
    network: z.string(),
  }).optional(),
  preferences: z.object({
    default_output: z.enum(["markdown", "json"]).default("markdown"),
  }).default({}),
});

export type Config = z.infer<typeof ConfigSchema>;

export function configPath(): string {
  return CONFIG_FILE;
}

export function configExists(): boolean {
  return existsSync(CONFIG_FILE);
}

export function loadConfig(): Config {
  if (!existsSync(CONFIG_FILE)) {
    throw new Error(`Config not found at ${CONFIG_FILE}. Run: a2a-market init`);
  }
  const raw = JSON.parse(readFileSync(CONFIG_FILE, "utf-8"));
  return ConfigSchema.parse(raw);
}

export function saveConfig(config: Config): void {
  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { mode: 0o700, recursive: true });
  }
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), { mode: 0o600 });
  chmodSync(CONFIG_FILE, 0o600);
}

export function updateConfig(partial: Partial<Config>): Config {
  const current = loadConfig();
  const updated = { ...current, ...partial };
  saveConfig(updated);
  return updated;
}
