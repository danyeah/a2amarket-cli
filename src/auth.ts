import { createHash } from "node:crypto";
import { signMessage } from "./keys.js";

export interface AuthHeaders {
  "X-Agent-Key": string;
  "X-Agent-Sig": string;
  "X-Agent-Ts": string;
}

// Reproduces the signing contract from agent2agent-api/internal/auth/auth.go:
//   SHA256( ts + "\n" + METHOD + "\n" + requestURI + "\n" + hex(SHA256(body)) )
export function buildAuthHeaders(
  publicKeyHex: string,
  privateKeyHex: string,
  method: string,
  requestURI: string,
  body: Buffer = Buffer.alloc(0)
): AuthHeaders {
  const ts = Math.floor(Date.now() / 1000).toString();

  const bodyHash = createHash("sha256").update(body).digest("hex");
  const plain = `${ts}\n${method}\n${requestURI}\n${bodyHash}`;
  const msg = createHash("sha256").update(plain).digest();

  const sig = signMessage(privateKeyHex, msg);

  return {
    "X-Agent-Key": publicKeyHex,
    "X-Agent-Sig": sig.toString("hex"),
    "X-Agent-Ts": ts,
  };
}
