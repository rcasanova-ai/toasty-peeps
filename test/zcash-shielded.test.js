import test from 'node:test';
import assert from 'node:assert/strict';

import { createConfidentialJam, approveCompliance, canSettleConfidentialJam } from '../packages/jams/src/index.js';
import { createConfidentialJamBreadcrumb } from '../packages/breadcrumbs/src/index.js';
import { DoughRouter, SETTLEMENT_RAILS } from '../packages/dough/src/router.js';
import { ZcashShieldedAdapter, createComplianceReceipt } from '../packages/dough/src/adapters/zcash-shielded/index.js';
import { ZalletRpcClient } from '../packages/dough/src/adapters/zcash-shielded/zallet-client.js';

test('confidential jams route through zcash shielded settlement', async () => {
  const calls = [];
  const adapter = new ZcashShieldedAdapter({
    network: 'regtest',
    walletClient: {
      async sendShielded(request) {
        calls.push(request);
        return { txid: 'regtest-txid-1' };
      }
    }
  });
  const router = new DoughRouter({ zcashShielded: adapter });

  const jam = approveCompliance(createConfidentialJam({
    requester: 'requester-internal-ref',
    peep: 'peep-internal-ref',
    intent: 'Expert advisory',
    brief: 'AI infrastructure market map',
    budget: 0.1
  }), { approvedBy: 'compliance-user' });

  assert.equal(canSettleConfidentialJam(jam), true);

  const result = await router.settle({
    privacyClass: jam.privacyClass,
    recipient: 'uregtest1recipient',
    amount: 0.001,
    memo: `jam:${jam.id}`,
    jamId: jam.id,
    complianceReceiptId: 'receipt-1'
  });

  assert.equal(result.rail, SETTLEMENT_RAILS.ZCASH_SHIELDED);
  assert.equal(result.privacyClass, 'confidential');
  assert.equal(result.privacyPolicy, 'FullPrivacy');
  assert.equal(result.publicCounterparty, null);
  assert.equal(result.publicAmount, null);
  assert.equal(calls[0].privacyPolicy, 'FullPrivacy');
});

test('confidential settlement receipt is private and public breadcrumb is sanitized', () => {
  const settlement = {
    status: 'settled',
    asset: 'ZEC',
    amount: 0.001,
    txid: 'regtest-txid-2',
    privacyPolicy: 'FullPrivacy',
    network: 'regtest'
  };
  const receipt = createComplianceReceipt({
    jamId: 'jam-sensitive',
    requesterRef: 'client-acme-secret',
    peepRef: 'expert-jane-secret',
    scope: 'AI infrastructure',
    conflictsStatus: 'cleared',
    settlement
  });
  const breadcrumb = createConfidentialJamBreadcrumb({
    peepId: 'public-peep-id',
    jamId: 'jam-sensitive',
    topic: 'AI infrastructure'
  });

  assert.equal(receipt.visibility, 'private-compliance');
  assert.equal(receipt.settlement.txid, 'regtest-txid-2');
  assert.equal(receipt.settlement.amount, 0.001);
  assert.equal(breadcrumb.paymentSignature, null);
  assert.deepEqual(breadcrumb.evidence, []);

  const publicJson = JSON.stringify(breadcrumb);
  assert.match(publicJson, /Verified institutional advisory engagement/);
  assert.doesNotMatch(publicJson, /client-acme-secret/);
  assert.doesNotMatch(publicJson, /expert-jane-secret/);
  assert.doesNotMatch(publicJson, /0\.001/);
  assert.doesNotMatch(publicJson, /regtest-txid/);
});

test('adapter rejects mainnet and invalid settlement amounts', async () => {
  assert.throws(() => new ZcashShieldedAdapter({ network: 'mainnet' }), /testnet\/regtest only/);

  const adapter = new ZcashShieldedAdapter({
    network: 'regtest',
    walletClient: { async sendShielded() {} }
  });

  assert.throws(() => adapter.quoteSettlement({ amount: 0 }), /Valid ZEC amount/);
  await assert.rejects(
    adapter.settle({ recipient: 'uregtest1recipient', amount: -1 }),
    /Valid ZEC amount/
  );
});

test('zallet client uses account-based z_sendfromaccount when a source account is configured', async () => {
  const calls = [];
  const client = new ZalletRpcClient({
    rpcUrl: 'http://127.0.0.1:8181',
    sourceAccount: 'account-uuid',
    fundSource: 'orchard',
    fetchImpl: async (url, request) => {
      const body = JSON.parse(request.body);
      calls.push({ url, body });
      return {
        ok: true,
        async json() {
          return { result: 'txid-from-account' };
        }
      };
    }
  });

  const result = await client.sendShielded({
    recipient: 'uregtest1recipient',
    amount: 0.001,
    memo: 'jam:test',
    privacyPolicy: 'FullPrivacy'
  });

  assert.equal(result.txid, 'txid-from-account');
  assert.equal(calls[0].body.method, 'z_sendfromaccount');
  assert.deepEqual(calls[0].body.params.slice(0, 2), ['account-uuid', 'orchard']);
  assert.equal(calls[0].body.params[2][0].memo, Buffer.from('jam:test', 'utf8').toString('hex'));
  assert.equal(calls[0].body.params[4], 'FullPrivacy');
});

test('zallet client falls back to source-address z_sendmany for beta zallet account sends', async () => {
  const calls = [];
  const client = new ZalletRpcClient({
    sourceAccount: 'account-uuid',
    sourceAddress: 'uregtest1source',
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      calls.push(body);
      if (body.method === 'z_sendfromaccount') {
        return {
          ok: true,
          async json() {
            return { error: { code: -32601, message: 'Method not found' } };
          }
        };
      }
      if (body.method === 'z_sendmany') {
        return { ok: true, async json() { return { result: 'opid-source-ua' }; } };
      }
      return {
        ok: true,
        async json() {
          return {
            result: [{
              status: 'success',
              result: { txid: 'txid-source-ua' }
            }]
          };
        }
      };
    }
  });

  const result = await client.sendShielded({
    recipient: 'uregtest1recipient',
    amount: 0.001,
    memo: 'jam:test'
  });

  assert.deepEqual(result, { txid: 'txid-source-ua', operationId: 'opid-source-ua' });
  assert.equal(calls[0].method, 'z_sendfromaccount');
  assert.equal(calls[1].method, 'z_sendmany');
  assert.equal(calls[1].params[0], 'uregtest1source');
  assert.equal(calls[1].params[4], 'FullPrivacy');
});

test('zallet client preserves legacy z_sendmany compatibility and reports failed operations', async () => {
  const methods = [];
  const client = new ZalletRpcClient({
    fetchImpl: async (_url, request) => {
      const body = JSON.parse(request.body);
      methods.push(body.method);
      if (body.method === 'z_sendmany') {
        return { ok: true, async json() { return { result: 'opid-1' }; } };
      }
      return {
        ok: true,
        async json() {
          return {
            result: [{
              status: 'failed',
              error: { message: 'insufficient shielded funds' }
            }]
          };
        }
      };
    }
  });

  await assert.rejects(
    client.sendShielded({ recipient: 'uregtest1recipient', amount: 0.001 }),
    /insufficient shielded funds/
  );
  assert.deepEqual(methods, ['z_sendmany', 'z_getoperationresult']);
});
