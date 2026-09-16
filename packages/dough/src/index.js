export class DoughPolicy {
  constructor({maxTransaction=10,maxTaskBudget=20,dailyBudget=100,humanApprovalThreshold=5,allowedAsset='USDC'}={}){Object.assign(this,{maxTransaction,maxTaskBudget,dailyBudget,humanApprovalThreshold,allowedAsset});}
  evaluate({amount,asset='USDC',taskSpend=0,dailySpend=0}){
    if(!Number.isFinite(amount)||amount<=0)return{status:'denied',reason:'Invalid amount'};
    if(asset!==this.allowedAsset)return{status:'denied',reason:'Asset not allowed'};
    if(amount>this.maxTransaction)return{status:'denied',reason:'Transaction limit exceeded'};
    if(taskSpend+amount>this.maxTaskBudget)return{status:'denied',reason:'Jam budget exceeded'};
    if(dailySpend+amount>this.dailyBudget)return{status:'denied',reason:'Daily budget exceeded'};
    return{status:amount>=this.humanApprovalThreshold?'requires-approval':'approved',approvedAmount:amount};
  }
}

export async function x402Fetch(url,{fetchImpl=fetch,wallet,policy=new DoughPolicy(),taskSpend=0,dailySpend=0,init={}}={}){
  const first=await fetchImpl(url,init); if(first.status!==402)return first;
  const req=await first.json();
  const decision=policy.evaluate({amount:req.amount,asset:req.asset,taskSpend,dailySpend});
  if(decision.status==='denied')throw new Error(`Dough denied: ${decision.reason}`);
  if(decision.status==='requires-approval')throw new Error('Dough requires human approval');
  if(!wallet)throw new Error('No Dough wallet adapter configured');
  const payment=await wallet.pay({recipient:req.recipient,amount:decision.approvedAmount,asset:req.asset,purpose:req.purpose,reference:req.paymentUrl});
  return fetchImpl(url,{...init,headers:{...(init.headers||{}),'x-payment-signature':payment.signature,'x-payment-asset':payment.asset,'x-payment-amount':String(payment.paidAmount)}});
}
