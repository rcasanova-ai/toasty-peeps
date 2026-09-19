export function createBreadcrumb({peepId,jamId,type,claim,evidence=[],paymentSignature=null,approvedByHuman=false}){
  return{id:crypto.randomUUID(),peepId,jamId,type,claim,evidence,paymentSignature,approvedByHuman,createdAt:new Date().toISOString()};
}

export function createConfidentialJamBreadcrumb({peepId,jamId,topic='advisory engagement',approvedByHuman=true}){
  return createBreadcrumb({
    peepId,
    jamId,
    type:'jam.completed',
    claim:`Verified institutional advisory engagement - ${topic} - completed`,
    evidence:[],
    paymentSignature:null,
    approvedByHuman
  });
}

export function breadcrumbWeight(b){let weight=1;if(b.approvedByHuman)weight+=2;if(b.paymentSignature)weight+=1;if((b.evidence||[]).length)weight+=Math.min(2,b.evidence.length);return weight;}
