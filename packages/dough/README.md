# Dough

Dough is Toasty Peeps' payment and budget layer.

The initial implementation should adapt, not blindly copy, the earlier Solana/x402 work. The reusable behavior is:

- detect an HTTP `402 Payment Required` response;
- parse and validate provider, recipient, asset, amount, and purpose;
- enforce per-transaction, task, and daily budgets;
- require human approval above a configurable threshold;
- execute through an injectable wallet/payment adapter;
- retry with payment proof;
- record settlement/audit events;
- support Solana USDC for real settlement.

For Peeps, the domain purposes include `DUB_INTERVIEW`, `HUMAN_JUDGMENT`, and `JAM_SETTLEMENT`.

## Wallet rule

No private key, seed phrase, payer keypair, or funded-wallet secret belongs in Git. Existing wallet credentials must stay in the deployment environment/secret store. This package receives only runtime configuration and wallet interfaces.

## Peeps-specific policy example

A user can say: “Spend up to $20 interviewing Dubs. Never spend more than $3 on one Dub. Ask me before paying a human.”

That maps naturally onto transaction limit, task budget, and human-approval threshold policy.