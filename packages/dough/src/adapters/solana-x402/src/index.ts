import { x402Client, x402HTTPClient } from "@x402/core/client";
import { wrapFetchWithPayment } from "@x402/fetch";
import { registerExactSvmScheme } from "@x402/svm/exact/client";

/**
 * Toasty Peeps Dough Solana/x402 economic adapter.
 *
 * Purpose:
 * This file is the narrow protocol boundary between Toasty Peeps Dough and the official
 * x402 Solana/SVM implementation. Toasty Peeps must not reimplement x402 challenge
 * parsing, payment payload construction, SVM exact-scheme validation, or HTTP
 * settlement semantics. Those responsibilities remain inside the official
 * @x402 packages.
 *
 * Story:
 * A Toasty Peeps agent decides that local intelligence is insufficient and chooses to buy a
 * remote capability. The caller supplies an already-authorized SVM signer and
 * invokes an ordinary HTTP resource. If the server returns a compatible 402,
 * the official x402 HTTP client parses the challenge, the official SVM scheme
 * constructs the payment payload, the signer authorizes it, and Embody retries
 * the original request with the protocol payment header. The purchased resource
 * and settlement evidence are returned together.
 *
 * Trust and economic boundary:
 * This adapter can cause a token payment. It MUST be invoked only after Dough's
 * deterministic spend/provider policy has approved the purchase. The adapter
 * never loads private keys, seed phrases, or wallet credentials. Wallet custody
 * belongs outside this package, allowing a temporary devnet signer now and a
 * Seeker/Mobile Wallet Adapter signer later.
 */

export type SolanaX402RegistrationOptions = Parameters<typeof registerExactSvmScheme>[1];
export type SolanaX402Signer = SolanaX402RegistrationOptions["signer"];

export interface SolanaX402PurchaseRequest {
  resourceUrl: string;
  init?: RequestInit;
}

export interface SolanaX402PurchaseResult {
  response: Response;
  paymentResponse: unknown | null;
}

/**
 * Build the canonical x402 client with the official SVM exact scheme.
 *
 * Keeping construction in one function prevents the convenience-fetch path and
 * the explicit diagnostic path from accidentally registering different schemes
 * or network behavior.
 */
function createClient(signer: SolanaX402Signer): x402Client {
  const client = new x402Client();
  registerExactSvmScheme(client, { signer });
  return client;
}

/**
 * Create a fetch-compatible client backed by the official x402 SVM exact
 * scheme.
 *
 * This helper remains useful for callers that want transparent 402 handling.
 * The Peeps vertical slice deliberately uses the explicit handshake below because a paid
 * robotics capability must expose exactly where challenge parsing, signing,
 * verification, settlement, or resource delivery failed.
 */
export function createSolanaX402PaidFetch(
  signer: SolanaX402Signer,
  fetchImpl: typeof fetch = fetch
): typeof fetch {
  return wrapFetchWithPayment(fetchImpl, createClient(signer));
}

/**
 * Read an x402 v2 rejection in the same canonical way that a normal challenge is
 * read: from the PAYMENT-REQUIRED response header first, with the response body
 * only as a fallback.
 *
 * Why this exists:
 * x402 v2 commonly returns an empty JSON body (`{}`) while putting the useful
 * reason for a rejected payment into a fresh PAYMENT-REQUIRED header. Logging
 * only the body collapses facilitator verification failures into an unhelpful
 * generic HTTP 402. Dough needs the protocol-level reason so orchestration can
 * distinguish signer, balance, token-account, network, and settlement failures.
 */
function describePaymentRequiredFailure(
  httpClient: x402HTTPClient,
  response: Response,
  body: unknown
): string | null {
  try {
    const rejection = httpClient.getPaymentRequiredResponse(
      name => response.headers.get(name),
      body
    );

    return JSON.stringify(rejection);
  } catch {
    return null;
  }
}

/**
 * Purchase one HTTP resource through Solana x402 and preserve settlement
 * evidence alongside the returned resource.
 *
 * Runtime story:
 * 1. Send the normal application request with no payment header.
 * 2. If it is not a 402, return it as the ordinary resource response.
 * 3. Parse the protocol's PAYMENT-REQUIRED challenge with x402HTTPClient.
 * 4. Ask the registered official SVM scheme to create and sign the payment.
 * 5. Encode PAYMENT-SIGNATURE using the official protocol helper.
 * 6. Replay the same application request with that payment header.
 * 7. Parse PAYMENT-RESPONSE settlement evidence from the successful response.
 *
 * Why this is explicit instead of relying only on wrapFetchWithPayment:
 * Dough is Toasty Peeps' economic orchestration layer. A generic final HTTP 402 is not an
 * adequate failure classification. The explicit sequence lets malformed
 * challenges, signer failures, insufficient balance, facilitator rejection,
 * settlement errors, and final application errors surface at their actual step.
 * We still delegate every x402-specific encoding and SVM operation to the
 * official libraries rather than implementing protocol mechanics ourselves.
 *
 * Invariants:
 * - The caller has already approved the economic action.
 * - The signer was constructed by an external custody layer.
 * - Request bodies used here must be replayable. The Peeps vertical slice uses a string
 *   JSON body, so replay is deterministic.
 * - A final non-2xx response is a purchase failure and is never hidden.
 */
export async function purchaseSolanaX402Resource(
  signer: SolanaX402Signer,
  request: SolanaX402PurchaseRequest,
  fetchImpl: typeof fetch = fetch
): Promise<SolanaX402PurchaseResult> {
  const client = createClient(signer);
  const httpClient = new x402HTTPClient(client);

  const initialResponse = await fetchImpl(request.resourceUrl, request.init);

  if (initialResponse.status !== 402) {
    if (!initialResponse.ok) {
      throw new Error(
        `Solana x402 resource request failed before payment with HTTP ${initialResponse.status} ${initialResponse.statusText}.`
      );
    }

    return { response: initialResponse, paymentResponse: null };
  }

  let challengeBody: unknown;
  try {
    challengeBody = await initialResponse.clone().json();
  } catch {
    challengeBody = undefined;
  }

  const paymentRequired = httpClient.getPaymentRequiredResponse(
    name => initialResponse.headers.get(name),
    challengeBody
  );

  const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
  const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

  const retryHeaders = new Headers(request.init?.headers);
  for (const [name, value] of Object.entries(paymentHeaders)) {
    retryHeaders.set(name, value);
  }

  const paidResponse = await fetchImpl(request.resourceUrl, {
    ...request.init,
    headers: retryHeaders
  });

  if (!paidResponse.ok) {
    let failureText = "";
    let failureBody: unknown;

    try {
      failureText = await paidResponse.clone().text();
    } catch {
      // The HTTP status and PAYMENT-REQUIRED header still carry the primary failure evidence.
    }

    try {
      failureBody = failureText ? JSON.parse(failureText) : undefined;
    } catch {
      failureBody = failureText || undefined;
    }

    const protocolFailure =
      paidResponse.status === 402
        ? describePaymentRequiredFailure(httpClient, paidResponse, failureBody)
        : null;

    throw new Error(
      `Solana x402 paid retry failed with HTTP ${paidResponse.status} ${paidResponse.statusText}` +
      (protocolFailure
        ? `: ${protocolFailure}`
        : failureText
          ? `: ${failureText}`
          : ".")
    );
  }

  const paymentResponse = httpClient.getPaymentSettleResponse(
    name => paidResponse.headers.get(name)
  );

  return { response: paidResponse, paymentResponse };
}
