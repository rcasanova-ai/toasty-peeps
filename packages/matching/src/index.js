import { JevClient } from './jev.js';

const tokenize = (value = '') =>
  new Set(String(value).toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(x => x.length > 2));

export function deterministicMatchScore(candidate, request) {
  const query = tokenize([
    request?.need,
    request?.outcome,
    request?.context
  ].filter(Boolean).join(' '));
  const corpus = tokenize([
    candidate.role,
    ...(candidate.topics || []),
    ...(candidate.evidence || []),
    ...(candidate.breadcrumbs || [])
  ].join(' '));

  let hits = 0;
  for (const term of query) {
    if (corpus.has(term) || [...corpus].some(x => x.includes(term) || term.includes(x))) hits += 1;
  }

  return Math.max(0.05, Math.min(0.96, 0.35 + hits * 0.08 + Math.min((candidate.evidence || []).length, 5) * 0.03));
}

export function rankDeterministically({ request, candidates }) {
  return [...candidates]
    .map(candidate => ({
      ...candidate,
      matchProbability: deterministicMatchScore(candidate, request),
      matchEngine: 'deterministic'
    }))
    .sort((a, b) => b.matchProbability - a.matchProbability);
}

export async function rankPeeps({
  request,
  candidates,
  jev = new JevClient(),
  useJev = true,
  onJevError
}) {
  if (useJev && jev.available) {
    try {
      const result = await jev.rankCandidates({ request, candidates });
      return {
        ...result,
        engine: 'jev',
        ranked: result.ranked.map(candidate => ({ ...candidate, matchEngine: 'jev' }))
      };
    } catch (error) {
      onJevError?.(error);
    }
  }

  return {
    engine: 'deterministic',
    model: null,
    usage: null,
    ranked: rankDeterministically({ request, candidates })
  };
}

export { JevClient };
