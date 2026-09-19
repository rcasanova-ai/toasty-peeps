# Toasty Peeps architecture

Toasty Peeps is an agent-native people marketplace built around demonstrated relevance rather than credentials.

## Product language

- **Peeps** — people and their profiles.
- **Dubs** — bounded digital doubles that answer from supported evidence and escalate ambiguity.
- **Jams** — engagements: calls, podcasts, research, advisory, collaboration, projects, or human judgment.
- **Dough** — budgets, pricing, wallet balances, and Solana/USDC settlement.
- **Breadcrumbs** — evidence and reputation left by completed work, approved answers, contributions, and outcomes.

## Core loop

1. User describes who they need and why.
2. Matching ranks Peeps by demonstrated relevance to that intent.
3. A user/agent sets a Dough budget.
4. The agent screens Dubs first so humans are not interrupted unnecessarily.
5. Strong matches can escalate to paid human judgment or a Jam.
6. Settlement occurs in USDC on Solana where payment is required.
7. The interaction leaves Breadcrumbs that improve future matching and the Dub's evidence boundary.

## Dub authority ladder

1. **Supported / auto-answer** — directly supported by approved evidence and within delegated authority.
2. **Draft for approval** — strong evidence exists, but the response represents the Peep personally.
3. **Escalate** — novel judgment, ambiguity, sensitivity, conflict, or weak evidence.
4. **Human handoff** — live calls, negotiations, advisory, interviews, and other human engagements.

A Dub must never invent expertise. Approvals, edits, and rejections become Breadcrumbs about what the Dub may safely represent in the future.

## Source extraction

The first UI foundation is extracted from `rcasanova-ai/toasty-media` rather than copying the Studio application wholesale. Reusable concepts are the intent-first finder, evidence-aware matching, professional-double profile, Supported/Inferred/Unknown boundary, qualification view, and consent-before-introduction flow.

Studio-specific broadcast, recording, production, and renderer code stays in Toasty Media.

## Solana / x402 boundary

We reuse the proven architectural pieces from the earlier Solana work, but Toasty Peeps owns its own product-facing names and integration layer.

Reusable concepts:

- HTTP 402 payment requirement handling.
- Provider/asset/amount/purpose validation.
- Per-transaction, per-task, and daily spend policy.
- Human approval threshold.
- Injectable wallet/payment executor.
- Retry with payment proof.
- Transaction audit events.
- Solana/SVM + USDC as the settlement rail.

Do **not** copy Seeker identity/mobile-specific assumptions into Peeps. Wallet private keys or secret material must never be committed to this repository. Existing funded wallet credentials remain deployment secrets and are referenced only through environment configuration.

## Initial package boundaries

- `apps/web` — Peeps UX and demo.
- `apps/api` — matching, Dubs, Jams, and settlement endpoints.
- `packages/matching` — intent-aware demonstrated-relevance ranking.
- `packages/dubs` — evidence boundary and delegated-response logic.
- `packages/jams` — engagement lifecycle.
- `packages/dough` — budgets, x402, Solana/USDC payment policy and settlement adapters.
- `packages/breadcrumbs` — evidence/reputation events.

## Colosseum demo path

Describe need → Find Peeps → set Dough budget → interview Dubs → shortlist → escalate to human → start Jam → settle USDC → create Breadcrumb.