export function createJam({requester,peep,intent,brief,budget=20,asset='USDC',privacyClass='standard',compliance={}}){return{id:crypto.randomUUID(),requester,peep,intent,brief,budget,asset,spent:0,status:'screening',privacyClass,compliance:{conflictsStatus:'pending',scopeStatus:'pending',disclosurePolicy:'authorized-only',...compliance},createdAt:new Date().toISOString()};}
export function createConfidentialJam(input={}){return createJam({...input,asset:input.asset||'ZEC',privacyClass:'confidential',compliance:{conflictsStatus:'pending',scopeStatus:'pending',disclosurePolicy:'authorized-only',...(input.compliance||{})}});}
export function recordSpend(jam,amount){if(jam.spent+amount>jam.budget)throw new Error('Jam budget exceeded');return{...jam,spent:Number((jam.spent+amount).toFixed(6))};}
export function approveCompliance(jam,{conflictsStatus='cleared',scopeStatus='approved',approvedBy,approvedAt=new Date().toISOString()}={}){return{...jam,compliance:{...jam.compliance,conflictsStatus,scopeStatus,approvedBy,approvedAt}};}
export function canSettleConfidentialJam(jam){return jam.privacyClass!=='confidential'||(jam.compliance?.conflictsStatus==='cleared'&&jam.compliance?.scopeStatus==='approved');}
export function escalateJam(jam){return{...jam,status:'human-review'};}
export function acceptJam(jam){return{...jam,status:'accepted'};}
export function completeJam(jam){return{...jam,status:'completed'};}
