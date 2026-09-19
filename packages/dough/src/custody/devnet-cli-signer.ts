import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { resolve } from "node:path";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { toClientSvmSigner } from "@x402/svm";

const configuredKeypairPath =
  process.env.SVM_KEYPAIR_PATH ?? "~/.embody-solana/x402-payer.json";

function resolveKeypairPath(path: string): string {
  if (path === "~") return homedir();
  if (path.startsWith("~/")) return resolve(homedir(), path.slice(2));
  return resolve(path);
}

async function loadCliKeypairBytes(path: string): Promise<Uint8Array> {
  const keypairPath = resolveKeypairPath(path);
  const raw = await readFile(keypairPath, "utf8");

  let bytes: unknown;

  try {
    bytes = JSON.parse(raw);
  } catch {
    throw new Error(`Invalid Solana CLI keypair JSON: ${keypairPath}`);
  }

  if (
    !Array.isArray(bytes) ||
    !bytes.every(
      value =>
        Number.isInteger(value) &&
        value >= 0 &&
        value <= 255
    )
  ) {
    throw new Error(`Invalid Solana CLI keypair file: ${keypairPath}`);
  }

  return Uint8Array.from(bytes);
}

export async function createDoughDevnetSigner() {
  const keypairBytes = await loadCliKeypairBytes(configuredKeypairPath);
  const kitSigner = await createKeyPairSignerFromBytes(keypairBytes);

  return toClientSvmSigner(kitSigner);
}
