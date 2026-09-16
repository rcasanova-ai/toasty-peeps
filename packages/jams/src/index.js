export function createJam({requester,peep,intent,brief,budget=20,asset='USDC'}){return{id:crypto.randomUUID(),requester,peep,intent,brief,budget,asset,spent:0,status:'screening',createdAt:new Date().toISOString()};}
export function recordSpend(jam,amount){if(jam.spent+amount>jam.budget)throw new Error('Jam budget exceeded');return{...jam,spent:Number((jam.spent+amount).toFixed(6))};}
export function escalateJam(jam){return{...jam,status:'human-review'};}
export function acceptJam(jam){return{...jam,status:'accepted'};}
export function completeJam(jam){return{...jam,status:'completed'};}
