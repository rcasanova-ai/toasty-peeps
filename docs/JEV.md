# Jev decision engine

Peeps uses Jev only for bounded, machine-readable decisions such as candidate relevance, routing, and later breadcrumb confidence. It is not used as a general chat or generation model.

## Environment

- `JEV_API_KEY`: TypeSafe AI API key. If absent, Peeps uses the deterministic matcher.
- `JEV_MODEL`: optional model alias, default `jev-latest`.
- `JEV_BASE_URL`: optional API base URL, default `https://api.typesafe.ai`.

## Matching

`packages/matching/src/index.js` exports `rankPeeps()`.

The function:
1. Sends the user's need/outcome plus candidate evidence to Jev.
2. Requests one yes/no probability per candidate.
3. Sorts candidates by Jev probability.
4. Falls back to the local deterministic matcher if Jev is unconfigured or unavailable.

API keys remain server-side. Never expose `JEV_API_KEY` to the browser.
