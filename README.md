# Toasty Peeps

**Find your peeps. Ask their Dubs. Start a Jam.**

Toasty Peeps is an agent-native people marketplace that matches people by demonstrated relevance to a specific need rather than credentials alone.

## The language

**Peeps** are people. **Dubs** are bounded digital doubles. **Jams** are engagements. **Dough** is the payment/budget layer. **Breadcrumbs** are evidence and reputation created through real interactions.

## Demo loop

Describe who you need → Find Peeps → set a Dough budget → interview Dubs → shortlist → escalate to a human → start a Jam → settle in Solana USDC → create Breadcrumbs.

## Current foundation

The initial web prototype extracts the useful people-finding and evidence-boundary ideas from the earlier Toasty Media Experts/Guest Finder work without importing Toasty Studio's broadcast/production baggage.

The Dough architecture reuses the earlier x402/Solana concepts: payment requirements, spend policy, human approval thresholds, wallet abstraction, payment proof, and audit events. Wallet secrets are never stored in this repository.

See `docs/ARCHITECTURE.md` for the product and technical boundaries.

## Run the prototype

Serve `apps/web` with any static server and open `index.html`.