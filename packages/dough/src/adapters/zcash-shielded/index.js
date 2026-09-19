// Confidential Jam settlement adapter.
// Intentionally transport-agnostic: inject a Zcash wallet client (Zallet-compatible)
// so spending keys never enter the Peeps browser/application layer.

export class ZcashShieldedAdapter {
  constructor({walletClient, network='testnet'}={}) {
    this.walletClient = walletClient;
    this.network = network;
  }

  async settle({recipient, amount, memo, jamId, complianceReceiptId}) {
    if (!this.walletClient) throw new Error('Zcash wallet client not configured');
    if (!recipient) throw new Error('Shielded Zcash recipient required');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valid ZEC amount required');

    const tx = await this.walletClient.sendShielded({
      network: this.network,
      recipient,
      amount,
      memo,
      privacyPolicy: 'FullPrivacy'
    });

    return {
      status: 'settled',
      asset: 'ZEC',
      amount,
      txid: tx.txid,
      jamId,
      complianceReceiptId,
      publicCounterparty: null,
      publicAmount: null,
      shielded: true
    };
  }
}

export function createComplianceReceipt({jamId, requesterRef, peepRef, scope, conflictsStatus, disclosurePolicy='authorized-only'}={}) {
  return {
    id: crypto.randomUUID(),
    jamId,
    requesterRef,
    peepRef,
    scope,
    conflictsStatus,
    disclosurePolicy,
    createdAt: new Date().toISOString(),
    // Store this record in the permissioned compliance domain, never a public Breadcrumb.
    visibility: 'private-compliance'
  };
}
