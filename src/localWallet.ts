import { generatePrivateKey, privateKeyToAddress } from "viem/accounts";

export interface LocalWallet {
  address: string;
  privateKeyHex: string;
}

export function generateLocalWallet(): LocalWallet {
  const privateKey = generatePrivateKey();
  const address = privateKeyToAddress(privateKey);
  return {
    address,
    privateKeyHex: privateKey,
  };
}
