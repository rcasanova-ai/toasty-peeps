export function decideDubAuthority({support='unknown',confidence=0,representsPerson=false,sensitive=false}={}){
  if(sensitive||support==='unknown'||confidence<0.7)return{action:'escalate',reason:'Novel, ambiguous, sensitive, or unsupported'};
  if(representsPerson||support==='inferred'||confidence<0.9)return{action:'draft-for-approval',reason:'Strong evidence but human approval required'};
  return{action:'auto-answer',reason:'Directly supported approved evidence'};
}

export function makeDubAnswer({peep,question}){
  const evidence=peep.evidence||[];
  const words=new Set(question.toLowerCase().split(/\W+/).filter(Boolean));
  const matches=evidence.filter(e=>[...words].some(w=>w.length>3&&e.toLowerCase().includes(w)));
  const support=matches.length?'supported':'unknown';
  const confidence=matches.length?Math.min(.98,.78+matches.length*.08):.25;
  const authority=decideDubAuthority({support,confidence});
  return{support,confidence,authority,evidence:matches,answer:matches.length?`Supported by ${matches.join('; ')}`:null};
}
