// Confidential Jam settlement adapter.
// Intentionally transport-agnostic: inject a Zcash wallet client (Zallet-compatible)
// so spending keys never enter the Peeps browser/application layer.

export class ZcashShieldedAdapter {
  constructor({walletClient, network='testnet', minConfirmations=1}={}) {
    if (network === 'mainnet') throw new Error('Zcash shielded adapter is testnet/regtest only');
    this.walletClient = walletClient;
    this.network = network;
    this.minConfirmations = minConfirmations;
  }

  quoteSettlement({amount, asset='ZEC'}={}) {
    if (asset !== 'ZEC') throw new Error('Zcash shielded settlement only supports ZEC');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('Valid ZEC amount required');
    return {
      rail: 'zcash-shielded',
      asset: 'ZEC',
      amount,
      network: this.network,
      privacyPolicy: 'FullPrivacy',
      estimatedFeeAsset: 'ZEC'
    };
  }

  async validateRecipient(recipient) {
    if (!this.walletClient) throw new Error('Zcash wallet client not configured');
    if (!recipient) throw new Error('Shielded Zcash recipient required');
    if (typeof this.walletClient.validateRecipient === 'function') {
      return this.walletClient.validateRecipient(recipient);
    }
    return {valid:true, receiverTypes:['unknown-shielded']};
  }

  async createSettlement(request) {
    return this.settle(request);
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
      privacyPolicy: 'FullPrivacy',
      network: this.network,
      shielded: true
    };
  }

  async getSettlementStatus({txid}={}) {
    if (!this.walletClient) throw new Error('Zcash wallet client not configured');
    if (!txid) throw new Error('txid required');
    if (typeof this.walletClient.getTransaction !== 'function') {
      return {status:'unknown', txid};
    }
    const transaction = await this.walletClient.getTransaction(txid);
    return {
      status: transaction?.blockheight ? 'confirmed' : 'pending',
      txid,
      confirmations: transaction?.confirmations ?? null,
      transaction
    };
  }

  createComplianceReceipt(input) {
    return createComplianceReceipt(input);
  }

  getDisclosureArtifact() {
    throw new Error('Disclosure artifacts require an explicit authorized compliance workflow');
  }
}

export function createComplianceReceipt({jamId, requesterRef, peepRef, scope, conflictsStatus, settlement, disclosurePolicy='authorized-only'}={}) {
  return {
    id: crypto.randomUUID(),
    jamId,
    requesterRef,
    peepRef,
    scope,
    conflictsStatus,
    settlement: settlement ? {
      status: settlement.status,
      asset: settlement.asset,
      amount: settlement.amount,
      txid: settlement.txid,
      privacyPolicy: settlement.privacyPolicy,
      network: settlement.network
    } : undefined,
    disclosurePolicy,
    createdAt: new Date().toISOString(),
    // Store this record in the permissioned compliance domain, never a public Breadcrumb.
    visibility: 'private-compliance'
  };
}
