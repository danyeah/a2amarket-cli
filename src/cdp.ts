import { CdpClient } from "@coinbase/cdp-sdk";

function getClient(): CdpClient {
  const apiKeyId = process.env.CDP_API_KEY_ID;
  const apiKeySecret = process.env.CDP_API_KEY_SECRET;
  const walletSecret = process.env.CDP_WALLET_SECRET;

  if (!apiKeyId || !apiKeySecret || !walletSecret) {
    throw new Error(
      "CDP credentials required. Set environment variables:\n" +
      "  CDP_API_KEY_ID\n  CDP_API_KEY_SECRET\n  CDP_WALLET_SECRET\n\n" +
      "Get them at portal.cdp.coinbase.com"
    );
  }

  return new CdpClient({ apiKeyId, apiKeySecret, walletSecret });
}

export interface CDPAccount {
  name: string;
  address: string;
  network: string;
}

export async function createOrGetAccount(name: string, network: string): Promise<CDPAccount> {
  const cdp = getClient();
  const account = await cdp.evm.getOrCreateAccount({ name });
  return {
    name: account.name,
    address: account.address,
    network,
  };
}

export async function getBalance(address: string, network: string): Promise<{
  usdc: string;
  eth: string;
}> {
  const cdp = getClient();
  const account = await cdp.evm.getOrCreateAccount({ name: address });
  const balances = await account.listTokenBalances({ network: network as never });

  let usdc = "0";
  let eth = "0";

  for (const b of balances as Array<{ token: { symbol: string }; amount: string }>) {
    if (b.token.symbol === "USDC") usdc = b.amount;
    if (b.token.symbol === "ETH") eth = b.amount;
  }

  return { usdc, eth };
}

export async function sendUsdc(
  accountName: string,
  to: string,
  amount: string,
  network: string
): Promise<string> {
  const cdp = getClient();
  const account = await cdp.evm.getOrCreateAccount({ name: accountName });
  const tx = await account.transfer({
    to,
    amount,
    token: "usdc",
    network: network as never,
  });
  return (tx as { hash: string }).hash;
}

export function hasCDPCredentials(): boolean {
  return !!(
    process.env.CDP_API_KEY_ID &&
    process.env.CDP_API_KEY_SECRET &&
    process.env.CDP_WALLET_SECRET
  );
}
