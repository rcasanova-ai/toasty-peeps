const DEFAULT_BASE_URL = 'https://api.typesafe.ai';

export class JevClient {
  constructor({
    apiKey = process.env.JEV_API_KEY,
    model = process.env.JEV_MODEL || 'jev-latest',
    baseUrl = process.env.JEV_BASE_URL || DEFAULT_BASE_URL,
    fetchImpl = globalThis.fetch
  } = {}) {
    this.apiKey = apiKey;
    this.model = model;
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.fetchImpl = fetchImpl;
  }

  get available() {
    return Boolean(this.apiKey && this.fetchImpl);
  }

  async decide({ state, questions }) {
    if (!this.apiKey) throw new Error('JEV_API_KEY is not configured');
    if (!this.fetchImpl) throw new Error('fetch is not available');

    const response = await this.fetchImpl(`${this.baseUrl}/v1/systemone`, {
      method: 'POST',
      headers: {
        authorization: `Bearer ${this.apiKey}`,
        'content-type': 'application/json'
      },
      body: JSON.stringify({
        model: this.model,
        state,
        questions
      })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new Error(`Jev request failed (${response.status})${detail ? `: ${detail}` : ''}`);
    }

    return response.json();
  }

  async rankCandidates({ request, candidates }) {
    if (!Array.isArray(candidates) || candidates.length === 0) {
      return { ranked: [], model: this.model, usage: null };
    }

    const state = {
      request,
      candidates: candidates.map((candidate, index) => ({
        index,
        name: candidate.name,
        role: candidate.role,
        topics: candidate.topics || [],
        evidence: candidate.evidence || [],
        breadcrumbs: candidate.breadcrumbs || []
      }))
    };

    const questions = Object.fromEntries(
      candidates.map((candidate, index) => [
        `candidate_${index}`,
        {
          type: 'noul',
          instructions: 'Is this candidate a strong demonstrated-relevance match for the requested outcome?',
          criteria: {
            true: 'The candidate has concrete evidence, experience, or context that materially helps achieve the requested outcome.',
            false: 'The candidate is weakly related, unsupported, or unlikely to materially help achieve the requested outcome.'
          }
        }
      ])
    );

    const result = await this.decide({ state, questions });
    const ranked = candidates
      .map((candidate, index) => {
        const answer = result.answers?.[`candidate_${index}`];
        return {
          ...candidate,
          jevProbability: answer?.type === 'noul' ? answer.noul : null,
          matchProbability: answer?.type === 'noul' ? answer.noul : 0
        };
      })
      .sort((a, b) => b.matchProbability - a.matchProbability);

    return {
      ranked,
      model: result.model,
      usage: result.usage
    };
  }
}
