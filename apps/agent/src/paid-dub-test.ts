import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { createKeyPairSignerFromBytes } from "@solana/kit";
import { toClientSvmSigner } from "@x402/svm";

import {
  purchaseSolanaX402Resource
} from "../../../packages/dough/src/adapters/solana-x402/dist/index.js";

const keypairPath =
  process.env.SVM_KEYPAIR_PATH ??
  `${homedir()}/.embody-solana/x402-payer.json`;

const bytes = Uint8Array.from(
  JSON.parse(await readFile(keypairPath, "utf8"))
);

const kitSigner =
  await createKeyPairSignerFromBytes(bytes);

const signer = toClientSvmSigner(kitSigner);

console.log("Dough payer:", signer.address);

const result =
  await purchaseSolanaX402Resource(signer, {
    resourceUrl:
      "http://127.0.0.1:4022/dub/interview",

    init: {
      method: "POST",
      headers: {
        "content-type": "application/json"
      },
      body: JSON.stringify({
        question:
          "What demonstrated experience does Marcus have with AI-agent payments?"
      })
    }
  });

const resource = await result.response.json();

console.log(JSON.stringify({
  http_status: result.response.status,
  payment_response: result.paymentResponse,
  resource
}, null, 2));
