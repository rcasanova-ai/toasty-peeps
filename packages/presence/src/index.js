// Human presence contract for Toasty Peeps (protocol hp-v0.1, shared with Toasty Studio).
//
// Studio issues challenges and signed receipts. Peeps only ever handles RECEIPT REFERENCES: small, non-biometric
// summaries. Rules enforced here:
//   - Only an explicit trusted pass is ever "verified". Everything else is labelled honestly.
//   - A receipt reference is short lived. An old reference is never current proof.
//   - A presence check never blocks a Jam, never removes anyone and never adds matching weight.
export const PRESENCE_PROTOCOL = 'hp-v0.1';
export const BREADCRUMB_TYPE = 'presence.check';

const LABELS = {
  not_requested: 'Not checked',
  pending: 'Check requested',
  inconclusive: 'Check completed, result inconclusive',
  failed: 'Check did not pass',
  declined: 'Participant declined the check',
  expired: 'Check expired, not current',
  verified: 'Verified human presence'
};

export function createReceiptRef(input = {}) {
  const ref = {
    receiptId: String(input.receiptId || ''),
    requestId: String(input.requestId || ''),
    outcome: ['passed', 'failed', 'inconclusive'].includes(input.outcome) ? input.outcome : 'inconclusive',
    assurance: ['none', 'low', 'medium', 'high'].includes(input.assurance) ? input.assurance : 'none',
    verified: input.verified === true,
    validUntil: String(input.validUntil || ''),
    verifierId: String(input.verifierId || 'none'),
    protocol: input.protocol || PRESENCE_PROTOCOL
  };
  if (!ref.receiptId || Number.isNaN(Date.parse(ref.validUntil))) throw new Error('Invalid presence receipt reference');
  // A pass claim without the server's verified flag and a real assurance level is downgraded, never trusted.
  if (ref.outcome === 'passed' && (!ref.verified || ref.assurance === 'none')) {
    return { ...ref, outcome: 'inconclusive', assurance: 'none', verified: false };
  }
  if (ref.outcome !== 'passed') return { ...ref, verified: false };
  return ref;
}

export function isCurrent(ref, now = Date.now()) {
  return Boolean(ref) && Date.parse(ref.validUntil) > now;
}

export function presenceStatus({ request = null, ref = null, now = Date.now() } = {}) {
  const out = (status, extra = {}) => ({ status, label: LABELS[status], verified: false, ...extra });
  if (!ref) {
    if (request?.status === 'declined') return out('declined');
    if (request?.status === 'pending' || request?.status === 'in_progress') return out('pending');
    return out('not_requested');
  }
  const safe = createReceiptRef(ref);
  if (!isCurrent(safe, now)) return out('expired', { receiptId: safe.receiptId });
  if (safe.verified && safe.outcome === 'passed') return { status: 'verified', label: LABELS.verified, verified: true, receiptId: safe.receiptId, assurance: safe.assurance };
  return out(safe.outcome === 'failed' ? 'failed' : 'inconclusive', { receiptId: safe.receiptId });
}

// Asks Studio to verify a receipt token (signature, revocation, scope). The Peeps side never holds signing keys.
export async function verifyReceiptWithStudio({ fetchImpl = fetch, baseUrl, receipt, headers = {} }) {
  const response = await fetchImpl(`${baseUrl}/api/human-presence/receipts/verify`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Toasty-CSRF': '1', ...headers }, body: JSON.stringify({ receipt })
  });
  if (!response.ok) return { valid: false, reason: `http_${response.status}` };
  const data = await response.json();
  if (!data.valid) return { valid: false, reason: data.reason || 'invalid' };
  return { valid: true, fresh: Boolean(data.fresh), verified: data.verified === true && data.outcome === 'passed' && data.assurance !== 'none' && Boolean(data.fresh) };
}

// ---- Jams ----

export function requestJamPresence(jam, participantId, { timing = 'during', now = new Date().toISOString() } = {}) {
  if (!participantId) throw new Error('participantId required');
  const presence = { ...(jam.presence || {}) };
  presence[participantId] = { request: { timing: timing === 'before' ? 'before' : 'during', status: 'pending', requestedAt: now }, ref: null };
  return { ...jam, presence };
}

export function recordJamPresenceResult(jam, participantId, input) {
  const entry = jam.presence?.[participantId];
  if (!entry) throw new Error('No presence check was requested for this participant');
  const ref = createReceiptRef(input);
  return { ...jam, presence: { ...jam.presence, [participantId]: { request: { ...entry.request, status: 'completed' }, ref } } };
}

export function declineJamPresence(jam, participantId) {
  const entry = jam.presence?.[participantId];
  if (!entry) throw new Error('No presence check was requested for this participant');
  return { ...jam, presence: { ...jam.presence, [participantId]: { ...entry, request: { ...entry.request, status: 'declined' } } } };
}

export function jamParticipantPresence(jam, participantId, now = Date.now()) {
  const entry = jam.presence?.[participantId];
  return presenceStatus({ request: entry?.request || null, ref: entry?.ref || null, now });
}

// Presence never gates participation. Inconclusive, failed, declined and expired all still return true.
export function canParticipateInJam() {
  return true;
}

// ---- Breadcrumbs and Dubs ----

export function createPresenceBreadcrumb({ peepId, jamId, ref }) {
  const safe = createReceiptRef(ref);
  return {
    id: globalThis.crypto.randomUUID(), peepId, jamId, type: BREADCRUMB_TYPE,
    claim: safe.verified ? 'Human presence check passed with an approved liveness provider' : 'Human presence check completed, result inconclusive',
    evidence: [], paymentSignature: null, approvedByHuman: false, receiptRef: safe, createdAt: new Date().toISOString()
  };
}

export function presenceBreadcrumbWeight() {
  // Deliberately zero: presence must not influence matching or reputation until independently evaluated.
  return 0;
}

export function dubPresenceSummary(breadcrumbs = [], now = Date.now()) {
  const latest = breadcrumbs.filter((b) => b.type === BREADCRUMB_TYPE && b.receiptRef)
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))[0];
  if (!latest) return presenceStatus({ now });
  // Only the freshest reference can ever be "current". Older ones never upgrade the status.
  return presenceStatus({ ref: latest.receiptRef, now });
}
