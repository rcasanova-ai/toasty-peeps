// Zallet JSON-RPC client for Confidential Jam settlement.
// Keep this server-side. Never expose the RPC endpoint, auth, wallet seed,
// spending keys, viewing keys, or raw private compliance data to the browser.

export class ZalletRpcClient {
  constructor({rpcUrl='http://127.0.0.1:28232', rpcUser, rpcPassword, fetchImpl=fetch}={}) {
    this.rpcUrl = rpcUrl;
    this.rpcUser = rpcUser;
    this.rpcPassword = rpcPassword;
    this.fetchImpl = fetchImpl;
    this.id = 0;
  }

  async rpc(method, params=[]) {
    const headers = {'content-type':'application/json'};
    if (this.rpcUser || this.rpcPassword) {
      headers.authorization = `Basic ${Buffer.from(`${this.rpcUser||''}:${this.rpcPassword||''}`).toString('base64')}`;
    }
    const res = await this.fetchImpl(this.rpcUrl, {
      method:'POST', headers,
      body:JSON.stringify({jsonrpc:'2.0', id:++this.id, method, params})
    });
    if (!res.ok) throw new Error(`Zallet RPC HTTP ${res.status}`);
    const body = await res.json();
    if (body.error) throw new Error(`Zallet ${method}: ${body.error.message || JSON.stringify(body.error)}`);
    return body.result;
  }

  async sendShielded({recipient, amount, memo, privacyPolicy='FullPrivacy'}={}) {
    if (!recipient) throw new Error('recipient required');
    if (!Number.isFinite(amount) || amount <= 0) throw new Error('positive ZEC amount required');
    // z_sendmany defaults to FullPrivacy, but pass it explicitly so Peeps cannot
    // silently weaken privacy if wallet defaults change.
    const recipients = [{address:recipient, amount, ...(memo ? {memo:Buffer.from(memo,'utf8').toString('hex')} : {})}];
    const opid = await this.rpc('z_sendmany', ['ANY_TADDR', recipients, 1, null, privacyPolicy]);
    return this.waitForOperation(opid);
  }

  async waitForOperation(opid,{timeoutMs=120000,pollMs=1500}={}) {
    const deadline=Date.now()+timeoutMs;
    while(Date.now()<deadline){
      const rows=await this.rpc('z_getoperationresult', [[opid]]);
      if(rows?.length){
        const row=rows[0];
        if(row.status==='success') return {txid:row.result?.txid, operationId:opid};
        if(row.status==='failed') throw new Error(`Zcash settlement failed: ${row.error?.message || 'unknown error'}`);
      }
      await new Promise(r=>setTimeout(r,pollMs));
    }
    throw new Error(`Zcash settlement timed out: ${opid}`);
  }
}
