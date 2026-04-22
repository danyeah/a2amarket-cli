import { createPrivateKey, createPublicKey, generateKeyPairSync, sign } from "node:crypto";

export interface Ed25519Keypair {
  publicKeyHex: string;
  privateKeyHex: string;
}

export function generateKeypair(): Ed25519Keypair {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");

  const privDer = privateKey.export({ type: "pkcs8", format: "der" });
  const pubDer = publicKey.export({ type: "spki", format: "der" });

  // Ed25519 private key: last 32 bytes of PKCS8 DER, public key: last 32 bytes of SPKI DER
  const privateKeyHex = privDer.subarray(privDer.length - 32).toString("hex");
  const publicKeyHex = pubDer.subarray(pubDer.length - 32).toString("hex");

  return { publicKeyHex, privateKeyHex };
}

export function signMessage(privateKeyHex: string, message: Buffer): Buffer {
  const privBytes = Buffer.from(privateKeyHex, "hex");

  // Reconstruct PKCS8 DER for 32-byte raw Ed25519 private key
  const pkcs8Header = Buffer.from(
    "302e020100300506032b657004220420",
    "hex"
  );
  const der = Buffer.concat([pkcs8Header, privBytes]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });

  return sign(null, message, privateKey) as Buffer;
}

export function publicKeyFromPrivate(privateKeyHex: string): string {
  const privBytes = Buffer.from(privateKeyHex, "hex");
  const pkcs8Header = Buffer.from("302e020100300506032b657004220420", "hex");
  const der = Buffer.concat([pkcs8Header, privBytes]);
  const privateKey = createPrivateKey({ key: der, format: "der", type: "pkcs8" });
  const publicKey = createPublicKey(privateKey);
  const pubDer = publicKey.export({ type: "spki", format: "der" }) as Buffer;
  return pubDer.subarray(pubDer.length - 32).toString("hex");
}
