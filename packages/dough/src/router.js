export const SETTLEMENT_RAILS = Object.freeze({
  SOLANA_X402: 'solana-x402',
  ZCASH_SHIELDED: 'zcash-shielded'
});

export const PRIVACY_CLASSES = Object.freeze({
  STANDARD: 'standard',
  CONFIDENTIAL: 'confidential',
  RESTRICTED: 'restricted'
});

export function selectSettlementRail({privacyClass=PRIVACY_CLASSES.STANDARD, interaction='dub'}={}) {
  if (privacyClass === PRIVACY_CLASSES.CONFIDENTIAL || privacyClass === PRIVACY_CLASSES.RESTRICTED) {
    return SETTLEMENT_RAILS.ZCASH_SHIELDED;
  }
  return SETTLEMENT_RAILS.SOLANA_X402;
}

export class DoughRouter {
  constructor({solanaX402, zcashShielded}={}) {
    this.adapters = {
      [SETTLEMENT_RAILS.SOLANA_X402]: solanaX402,
      [SETTLEMENT_RAILS.ZCASH_SHIELDED]: zcashShielded
    };
  }

  async settle(request) {
    const rail = request.rail || selectSettlementRail(request);
    const adapter = this.adapters[rail];
    if (!adapter || typeof adapter.settle !== 'function') {
      throw new Error(`Dough settlement rail not configured: ${rail}`);
    }
    const result = await adapter.settle(request);
    return {
      rail,
      privacyClass: request.privacyClass || PRIVACY_CLASSES.STANDARD,
      ...result
    };
  }
}
