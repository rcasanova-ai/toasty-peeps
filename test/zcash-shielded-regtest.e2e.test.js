import test from 'node:test';
import assert from 'node:assert/strict';

import { createConfidentialJam, approveCompliance, canSettleConfidentialJam } from '../packages/jams/src/index.js';
import { createConfidentialJamBreadcrumb } from '../packages/breadcrumbs/src/index.js';
import { DoughRouter, SETTLEMENT_RAILS } from '../packages/dough/src/router.js';
import { ZcashShieldedAdapter, createComplianceReceipt } from '../packages/dough/src/adapters/zcash-shielded/index.js';
import { ZalletRpcClient } from '../packages/dough/src/adapters/zcash-shielded/zallet-client.js';

const enabled = process.env.ZCASH_REGTEST_E2E === '1';

test('live regtest zcash shielded settlement through Dough', { skip: enabled ? false : 'set ZCASH_REGTEST_E2E=1 with funded Zallet account env vars' }, async () => {
  const required = [
    'ZALLET_RPC_URL',
    'ZALLET_RPC_USER',
    'ZALLET_RPC_PASSWORD',
    'ZCASH_SOURCE_ACCOUNT',
    'ZCASH_RECIPIENT'
  ];
  for (const name of required) {
    assert.ok(process.env[name], `${name} is required`);
  }

  const walletClient = new ZalletRpcClient({
    rpcUrl: process.env.ZALLET_RPC_URL,
    rpcUser: process.env.ZALLET_RPC_USER,
    rpcPassword: process.env.ZALLET_RPC_PASSWORD,
    sourceAccount: process.env.ZCASH_SOURCE_ACCOUNT,
    fundSource: process.env.ZCASH_FUND_SOURCE || 'orchard'
  });
  const adapter = new ZcashShieldedAdapter({ network: process.env.ZCASH_NETWORK || 'regtest', walletClient });
  const router = new DoughRouter({ zcashShielded: adapter });

  const jam = approveCompliance(createConfidentialJam({
    requester: 'institution-private-ref',
    peep: 'expert-private-ref',
    intent: 'Colosseum Zcash integration verification',
    brief: 'Confidential Jam live regtest settlement',
    budget: Number(process.env.ZCASH_E2E_AMOUNT || '0.0001')
  }), { approvedBy: 'compliance-regtest' });
  assert.equal(canSettleConfidentialJam(jam), true);

  await adapter.validateRecipient(process.env.ZCASH_RECIPIENT);
  const settlement = await router.settle({
    privacyClass: jam.privacyClass,
    recipient: process.env.ZCASH_RECIPIENT,
    amount: Number(process.env.ZCASH_E2E_AMOUNT || '0.0001'),
    memo: `jam:${jam.id}`,
    jamId: jam.id,
    complianceReceiptId: 'receipt-live-regtest'
  });

  assert.equal(settlement.rail, SETTLEMENT_RAILS.ZCASH_SHIELDED);
  assert.equal(settlement.privacyPolicy, 'FullPrivacy');
  assert.ok(settlement.txid);

  const receipt = createComplianceReceipt({
    jamId: jam.id,
    requesterRef: jam.requester,
    peepRef: jam.peep,
    scope: jam.brief,
    conflictsStatus: 'cleared',
    settlement
  });
  const breadcrumb = createConfidentialJamBreadcrumb({
    peepId: 'public-expert-profile',
    jamId: jam.id,
    topic: 'Colosseum Zcash integration'
  });

  const publicJson = JSON.stringify(breadcrumb);
  assert.equal(receipt.visibility, 'private-compliance');
  assert.equal(receipt.settlement.txid, settlement.txid);
  assert.doesNotMatch(publicJson, /institution-private-ref/);
  assert.doesNotMatch(publicJson, /expert-private-ref/);
  assert.doesNotMatch(publicJson, new RegExp(settlement.txid));
  assert.doesNotMatch(publicJson, new RegExp(String(settlement.amount)));
});
