const RPC: Record<string, string> = {
  "base-mainnet": "https://mainnet.base.org",
  "base-sepolia": "https://sepolia.base.org",
};

const USDC: Record<string, string> = {
  "base-mainnet": "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
  "base-sepolia": "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
};

async function rpc(network: string, method: string, params: unknown[]): Promise<string> {
  const url = RPC[network] ?? RPC["base-sepolia"];
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  const json = await res.json() as { result?: string; error?: { message: string } };
  if (json.error) throw new Error(json.error.message);
  return json.result ?? "0x0";
}

function hexToDecimal(hex: string): bigint {
  return BigInt(hex === "0x" ? 0 : hex);
}

export async function getOnchainBalance(address: string, network: string): Promise<{ usdc: string; eth: string }> {
  const ethHex = await rpc(network, "eth_getBalance", [address, "latest"]);
  const ethWei = hexToDecimal(ethHex);
  const eth = (Number(ethWei) / 1e18).toFixed(6);

  const usdcAddress = USDC[network] ?? USDC["base-sepolia"];
  const selector = "0x70a08231";
  const paddedAddr = address.toLowerCase().replace("0x", "").padStart(64, "0");
  const usdcHex = await rpc(network, "eth_call", [
    { to: usdcAddress, data: selector + paddedAddr },
    "latest",
  ]);
  const usdcRaw = hexToDecimal(usdcHex);
  const usdc = (Number(usdcRaw) / 1e6).toFixed(2);

  return { usdc, eth };
}
