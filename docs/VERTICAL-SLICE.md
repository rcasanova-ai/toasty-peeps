# Toasty Peeps vertical slice

## Demo promise
A requester describes who they need and why, gives the agent a Dough budget, and lets it screen Dubs before any human is interrupted.

`Need -> Peeps -> paid Dub screens -> shortlist -> human escalation -> Jam -> settlement -> Breadcrumb`

## Demo scenario
> Find people who understand AI agents and enterprise sales. Spend up to $20 USDC interviewing their Dubs. Do not spend more than $3 on any one Peep. Return the best two and explain why.

## Components
- **Peeps** ranks demonstrated relevance for the request and intent.
- **Dubs** use bounded authority: auto-answer, draft-for-approval, or escalate. Unknown stays unknown.
- **Dough** enforces per-payment, Jam, and daily budgets and handles x402 payment challenges.
- **Jams** track the engagement from Dub screening through human acceptance/completion.
- **Breadcrumbs** record approved/completed evidence and settlement proof for future matching.

## Solana integration
Do not create another wallet. The runtime adapter should connect to the already-funded Solana Devnet payer used by the existing Embody x402 implementation. Wallet secrets/keypairs remain deployment secrets and never enter this repository.

The `packages/dough` module is intentionally wallet-adapter based. The concrete Solana adapter is the next wiring step and should port the proven Embody implementation rather than create a third payment stack.

## Acceptance criteria
1. Requester can set a total Dough budget and per-Peep cap.
2. Agent can screen multiple Dubs without human interruption.
3. Paid screens settle in Devnet USDC and retain transaction signatures.
4. Unsupported questions escalate instead of hallucinating.
5. Human escalation has an explicit price/consent boundary.
6. Completed or approved work creates a Breadcrumb.
7. Demo UI shows spend, remaining budget, humans interrupted, shortlist rationale, and settlement evidence.
