# Zcash Compatibility Track

## Product requirement

Toasty Peeps must treat privacy as a first-class compliance capability for sensitive expert-network Jams.

Principle: **Private by default. Auditable by design. Disclosable when required.**

This is not a mechanism for evading KYC, AML, conflicts, securities, lobbying, sanctions, tax, disclosure, or institutional policies. The goal is to avoid unnecessarily publishing commercially sensitive expert/client relationship graphs while retaining permissioned evidence for authorized compliance review.

## Dough settlement routing

Dough should expose a provider-neutral settlement interface:

- `solana-x402`: default for high-frequency agent/Dub micropayments.
- `zcash-shielded`: compatibility track for confidential human expert/advisory settlement.

A Jam selects a privacy class before settlement:

- `standard`: existing Solana/x402 flow.
- `confidential`: shielded-compatible settlement preferred.
- `restricted`: confidential settlement plus explicit compliance approval before payment.

The Jam owns policy; callers should not hard-code a chain.

## Zcash target architecture

Use the current Zcash stack rather than deprecated zcashd:

- Zebra for chain/node services.
- Zallet-compatible wallet/RPC boundary for wallet operations.
- Unified/shielded addresses where supported.
- Prefer `FullPrivacy` transaction policy for confidential Jams; never silently weaken privacy policy.
- Full viewing keys are compliance-sensitive secrets. They may permit transaction visibility without spending authority and must never be placed in application logs, Breadcrumbs, browser storage, or public profiles.

Zallet is currently beta. The first implementation must therefore be an adapter boundary and test harness, not a production-custody commitment.

## Adapter contract

Create `packages/dough/src/adapters/zcash-shielded/` implementing the same conceptual Dough contract as the Solana adapter:

- `quoteSettlement()`
- `validateRecipient()`
- `createSettlement()`
- `getSettlementStatus()`
- `createComplianceReceipt()`
- `getDisclosureArtifact()` — explicit authorized operation only

No private key or viewing key is accepted from browser clients.

## Compliance receipt

The public chain must not be the system of record for engagement compliance. Peeps should retain a permissioned receipt containing:

- Jam ID and internal parties
- identity/KYC status references
- consent and engagement terms
- conflict-check result and timestamp
- approved/restricted topic boundaries
- settlement state and internal amount/currency record
- chain transaction reference where appropriate
- privacy policy used
- approval trail
- disclosure/access log

Sensitive counterparty identity must not become a public Breadcrumb by default.

## Breadcrumb policy

A confidential Jam can emit a sanitized Breadcrumb such as:

`Verified institutional advisory engagement · AI infrastructure · completed`

It must not reveal client, employer, payment amount, question content, or transaction linkage unless the parties explicitly permit that disclosure.

## Dub compliance gate

Before a Dub answers in a confidential/restricted Jam, evaluate:

1. Is the question within the approved engagement scope?
2. Is the answer supported by authorized Breadcrumb/evidence sources?
3. Could the request involve MNPI, confidential employer/client information, conflicts, or another restricted topic?
4. Does the Peep's authority policy allow auto-answer?

Out-of-bound or uncertain requests escalate to the human/compliance path. The Dub does not invent or infer restricted information.

## Implementation phases

### Phase 0 — now

- Keep Solana/x402 production path unchanged.
- Add Zcash as a Dough compatibility target and privacy class to product architecture.
- Keep chain selection out of public discovery UX.

### Phase 1 — test harness

- Run Zebra + Zallet-compatible environment on test infrastructure.
- Generate isolated test accounts/addresses.
- Execute shielded test settlements.
- Confirm transaction status and receipt persistence.
- Test viewing-key-based audit visibility with a deliberately separated compliance role.
- Verify public observers cannot derive the private Jam relationship from Peeps metadata.

### Phase 2 — Peeps integration

`Jam -> privacy policy -> Dough router -> zcash-shielded adapter -> receipt -> permissioned Breadcrumb`

Add role-gated compliance UI for conflicts, approvals, receipts, and disclosures.

### Phase 3 — institutional hardening

Before real-money institutional use: custody decision, key management/HSM strategy, KYC/AML/sanctions controls, jurisdictional review, incident response, backups, access logging, reconciliation, accounting/tax exports, and independent security review.

## Current technical caution

Zallet is beta and its documentation warns that breaking changes remain possible. Its wallet database contains privacy-sensitive transaction history and viewing-key material; deployment therefore requires strict filesystem isolation, encrypted backups, least-privilege service access, and no shared application host storage.
