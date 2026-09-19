import express from "express";
import { HTTPFacilitatorClient, x402ResourceServer } from "@x402/core/server";
import { paymentMiddleware } from "@x402/express";
import { registerExactSvmScheme } from "@x402/svm/exact/server";

const SOLANA_DEVNET =
  "solana:EtWTRABZaYq6iMfeYKouRu166VU2xqa1";

const FACILITATOR_URL =
  process.env.X402_FACILITATOR_URL ??
  "https://x402.org/facilitator";

const PORT = Number(process.env.PORT ?? 4022);
const payTo = process.env.SVM_PAY_TO;

if (!payTo) {
  throw new Error("SVM_PAY_TO is required.");
}

const facilitator = new HTTPFacilitatorClient({
  url: FACILITATOR_URL
});

const resourceServer = new x402ResourceServer(facilitator);
registerExactSvmScheme(resourceServer);

const app = express();
app.use(express.json());

app.use(
  paymentMiddleware(
    {
      "POST /dub/interview": {
        accepts: [
          {
            scheme: "exact",
            price: "$0.001",
            network: SOLANA_DEVNET,
            payTo
          }
        ],
        description:
          "Paid screening interaction with a Toasty Peeps Dub.",
        mimeType: "application/json"
      }
    },
    resourceServer
  )
);

app.post("/dub/interview", (req, res) => {
  const question =
    typeof req.body?.question === "string"
      ? req.body.question
      : "";

  res.json({
    peep: {
      id: "marcus-reed",
      name: "Marcus Reed"
    },

    question,

    dub: {
      support: "supported",
      confidence: 0.92,
      authority: "auto-answer",
      answer:
        "Marcus has demonstrated experience with digital-asset infrastructure, payments, distributed systems and AI-agent payment systems.",

      evidence: [
        "Production infrastructure experience",
        "Agent/payment systems focus",
        "Conference speaker"
      ]
    },

    human_interrupted: false,

    rail: "solana-x402",
    network: SOLANA_DEVNET
  });
});

app.listen(PORT, () => {
  console.log(
    `Toasty Peeps paid Dub provider listening on http://127.0.0.1:${PORT}`
  );
});
