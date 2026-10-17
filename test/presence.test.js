import test from 'node:test';
import assert from 'node:assert/strict';
import { createReceiptRef, presenceStatus, verifyReceiptWithStudio, requestJamPresence, recordJamPresenceResult, declineJamPresence, jamParticipantPresence, canParticipateInJam, createPresenceBreadcrumb, presenceBreadcrumbWeight, dubPresenceSummary } from '../packages/presence/src/index.js';
import { createJam } from '../packages/jams/src/index.js';
import { breadcrumbWeight } from '../packages/breadcrumbs/src/index.js';

const now = Date.parse('2026-10-17T12:00:00Z');
const ref = (o = {}) => ({ receiptId: 'hpr_1', requestId: 'hpq_1', outcome: 'inconclusive', assurance: 'none', verified: false, validUntil: new Date(now + 600000).toISOString(), verifierId: 'none', ...o });

test('inconclusive results are never displayed as verified', () => {
  const s = presenceStatus({ ref: ref(), now });
  assert.equal(s.status, 'inconclusive');
  assert.equal(s.verified, false);
  assert.doesNotMatch(s.label, /verified human/i);
});

test('a pass claim without the verified flag or assurance is downgraded', () => {
  assert.equal(createReceiptRef(ref({ outcome: 'passed', verified: false, assurance: 'medium' })).outcome, 'inconclusive');
  assert.equal(createReceiptRef(ref({ outcome: 'passed', verified: true, assurance: 'none' })).verified, false);
  assert.equal(presenceStatus({ ref: ref({ outcome: 'passed', verified: true, assurance: 'none' }), now }).verified, false);
});

test('only a fresh, verified, assured pass is verified', () => {
  const pass = ref({ outcome: 'passed', verified: true, assurance: 'medium', verifierId: 'vendor' });
  assert.equal(presenceStatus({ ref: pass, now }).verified, true);
  assert.equal(presenceStatus({ ref: pass, now: now + 3600000 }).status, 'expired');
  assert.equal(presenceStatus({ ref: pass, now: now + 3600000 }).verified, false);
});

test('failed, declined, pending and not requested', () => {
  assert.equal(presenceStatus({ ref: ref({ outcome: 'failed' }), now }).status, 'failed');
  assert.equal(presenceStatus({ request: { status: 'declined' }, now }).status, 'declined');
  assert.equal(presenceStatus({ request: { status: 'pending' }, now }).status, 'pending');
  assert.equal(presenceStatus({ now }).status, 'not_requested');
});

test('invalid references are rejected', () => {
  assert.throws(() => createReceiptRef({ outcome: 'passed' }));
  assert.throws(() => createReceiptRef(ref({ validUntil: 'nope' })));
});

test('a Jam presence check never gates participation', () => {
  let jam = createJam({ requester: 'r', peep: 'p', intent: 'i', brief: 'b' });
  jam = requestJamPresence(jam, 'pt1', { timing: 'before' });
  assert.equal(jamParticipantPresence(jam, 'pt1', now).status, 'pending');
  assert.equal(canParticipateInJam(jam, 'pt1'), true);
  jam = declineJamPresence(jam, 'pt1');
  assert.equal(jamParticipantPresence(jam, 'pt1', now).status, 'declined');
  assert.equal(canParticipateInJam(jam, 'pt1'), true);
  jam = requestJamPresence(jam, 'pt2');
  jam = recordJamPresenceResult(jam, 'pt2', ref());
  assert.equal(jamParticipantPresence(jam, 'pt2', now).status, 'inconclusive');
  assert.throws(() => recordJamPresenceResult(jam, 'ghost', ref()));
});

test('Breadcrumbs carry a reference, no matching weight, and never claim verification when inconclusive', () => {
  const b = createPresenceBreadcrumb({ peepId: 'p', jamId: 'j', ref: ref() });
  assert.equal(b.type, 'presence.check');
  assert.match(b.claim, /inconclusive/);
  assert.equal(b.receiptRef.verified, false);
  assert.equal(presenceBreadcrumbWeight(b), 0);
  assert.equal(breadcrumbWeight(b), 0, 'presence breadcrumbs carry no reputation or matching weight');
});

test('a Dub never reuses an old receipt as current proof', () => {
  const pass = ref({ outcome: 'passed', verified: true, assurance: 'medium', verifierId: 'vendor' });
  const crumb = createPresenceBreadcrumb({ peepId: 'p', jamId: 'j', ref: pass });
  assert.equal(dubPresenceSummary([crumb], now).verified, true);
  assert.equal(dubPresenceSummary([crumb], now + 86400000).status, 'expired');
  assert.equal(dubPresenceSummary([], now).status, 'not_requested');
  const older = { ...crumb, createdAt: '2026-01-01T00:00:00Z', receiptRef: { ...pass, receiptId: 'old' } };
  const newer = createPresenceBreadcrumb({ peepId: 'p', jamId: 'j', ref: ref() });
  assert.equal(dubPresenceSummary([older, newer], now).status, 'inconclusive', 'the latest reference wins; an older pass cannot upgrade it');
});

test('verifyReceiptWithStudio only trusts a fresh server verified pass', async () => {
  const mk = (body, ok = true, status = 200) => async () => ({ ok, status, json: async () => body });
  const base = { baseUrl: 'https://studio.example', receipt: 'hpr1.x.y' };
  assert.deepEqual(await verifyReceiptWithStudio({ ...base, fetchImpl: mk({ valid: false, reason: 'bad_signature' }) }), { valid: false, reason: 'bad_signature' });
  assert.equal((await verifyReceiptWithStudio({ ...base, fetchImpl: mk({}, false, 404) })).valid, false);
  assert.equal((await verifyReceiptWithStudio({ ...base, fetchImpl: mk({ valid: true, fresh: true, verified: true, outcome: 'inconclusive', assurance: 'none' }) })).verified, false);
  assert.equal((await verifyReceiptWithStudio({ ...base, fetchImpl: mk({ valid: true, fresh: false, verified: true, outcome: 'passed', assurance: 'medium' }) })).verified, false);
  assert.equal((await verifyReceiptWithStudio({ ...base, fetchImpl: mk({ valid: true, fresh: true, verified: true, outcome: 'passed', assurance: 'medium' }) })).verified, true);
});
