# Human Presence Verification (scaffold)

Status: experimental, disabled by default. This is presence assurance, not identity proof or a definitive deepfake detector.

## Shared protocol v0
Challenge issuance: server generates cryptographically random challenge ID, nonce, action and expiration (60 seconds). Actions: head turn, finger count, spoken phrase. Never allow clients to select the challenge or supply their own timestamps.

Client captures consent, media permissions and challenge response. Do not upload or store raw biometric media by default. A server-side verifier validates challenge binding, expiry, replay protection, participant/session binding and evidence provenance. Client-reported success is **never** sufficient for a pass.

Result: `passed | failed | inconclusive`; include methods, assurance level, issuedAt, expiresAt, verifier version, nonce hash and signed receipt ID. Until a trusted liveness verifier is integrated, every result must be `inconclusive`.

## Integration
Studio: optional host-triggered challenge, participant consent, status UI, re-challenge on media source changes. Never interrupt recording or auto-ban on inconclusive results.

Peeps: Jam participant verification, explicit consent, attach short-lived receipt reference as a Breadcrumb to a Dub. Never reuse an old receipt as current liveness proof.

## Security and privacy
Rate limit challenges; authenticate all endpoints; bind challenge to authenticated session and participant; expire and atomically consume nonce; audit events; redact personal data; allow revocation and deletion; define retention policy. Avoid persistent face templates. Account for virtual cameras, injected media, accessibility alternatives and false positives.

## Next implementation milestone
Add server challenge and verification endpoints, persistence and replay tests, feature flag, minimal participant challenge UI, then connect a vetted active-liveness vendor/model and red-team with real-time face swap, synthetic speech, replay and genuine users. No production claims before independent evaluation.

## Implementation status (first functional version)

Production behaviour lives in `rcasanova-ai/toasty-media` (`scripts/human-presence/`, `js/human-presence-ui.js`, `docs/human-presence-verification.md`): server issued challenges, expiry, replay protection, signed receipts, host controls, consent, audit and retention, all behind `HUMAN_PRESENCE_ENABLED` (default off). No liveness verifier ships, so every result is `inconclusive`.

This repo carries the Peeps side of the contract in `packages/presence`:

- `createReceiptRef` accepts only a small receipt reference and downgrades any pass that lacks the server's verified flag and a real assurance level.
- `presenceStatus` is the only way a participant becomes "verified": a fresh, server verified, assured pass. References expire; an expired one is "not current".
- `requestJamPresence`, `recordJamPresenceResult`, `declineJamPresence`: Jam participants are checked before or during a Jam. `canParticipateInJam` is always true, so a check never gates or removes anyone.
- `createPresenceBreadcrumb` and `dubPresenceSummary`: a Breadcrumb holds a receipt reference. The newest reference wins and an old receipt never counts as current liveness proof. `breadcrumbWeight` returns 0 for presence Breadcrumbs, so they cannot affect matching or reputation.
- `verifyReceiptWithStudio` asks Studio to check a receipt token (signature, revocation, scope); Peeps never holds signing keys.

Tests: `node --test test/presence.test.js`.
