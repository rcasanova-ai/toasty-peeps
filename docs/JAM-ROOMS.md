# Peeps Protected Jams

Canonical lifecycle:

`Book Jam -> participant invite -> authorize -> protected Toasty/VDO room -> optional consented capture -> verified attendance -> Jam Record -> 30-minute attendance/time dispute window -> settlement -> Breadcrumb`

## Security
- A VDO room name is never a credential.
- Booking creates a cryptographically random room ID and separate room secret server-side.
- Each participant receives a separate high-entropy bearer invite.
- Only a valid participant invite can exchange for underlying media credentials.
- Public Peeps URLs never contain the VDO room ID/password.
- Room/event responses use `Cache-Control: no-store`.
- Jam creation requires server-only `PEEPS_JAM_BOOKING_KEY`.

## Capture
Default is `private`: no recording/transcription. `transcript` and `record` require explicit consent before capture. Mid-session changes require fresh consent. Capture consent is evidence; conversation content is not copied into the Breadcrumb.

## Branding
A Jam can be Peeps branded, clean/unbranded, or organization branded. Preserve a clean master and create branded derivatives separately.

## Jam Record
The authenticated Jam Record is the home for recording when enabled, transcript, source-linked AI summary, notes and controlled sharing. Email is notification/link delivery, not media transport. Sharing/downloads are permissioned and auditable.

## Evidence
Persist only participant authorization, join/leave, verified overlap, capture consent, completion, dispute deadline, settlement receipt and artifact access. Do not retain conversation media for private Jams.
