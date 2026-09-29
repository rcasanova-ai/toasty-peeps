import test from 'node:test';
import assert from 'node:assert/strict';

import { JevClient, rankPeeps } from '../packages/matching/src/index.js';

const candidates = [
  {
    id: 'payments',
    name: 'Marcus Reed',
    role: 'Digital assets infrastructure operator',
    topics: ['payments', 'solana', 'ai agents'],
    evidence: ['Production agent payment systems experience']
  },
  {
    id: 'sports',
    name: 'Jonas Berg',
    role: 'Football commercial executive',
    topics: ['football', 'sponsorship'],
    evidence: ['Club-side commercial leadership']
  }
];

test('Jev ranks Peeps using returned calibrated probabilities', async () => {
  const calls = [];
  const jev = new JevClient({
    apiKey: 'test-key',
    fetchImpl: async (url, request) => {
      calls.push({ url, request });
      return {
        ok: true,
        async json() {
          return {
            model: 'jev-test',
            answers: {
              candidate_0: { type: 'noul', noul: 0.94 },
              candidate_1: { type: 'noul', noul: 0.11 }
            },
            usage: { input_tokens: 200, output_tokens: 2 }
          };
        }
      };
    }
  });

  const result = await rankPeeps({
    request: {
      need: 'Someone who understands agent payments',
      outcome: 'Design an x402 payment flow'
    },
    candidates,
    jev
  });

  assert.equal(result.engine, 'jev');
  assert.equal(result.ranked[0].id, 'payments');
  assert.equal(result.ranked[0].matchProbability, 0.94);
  assert.equal(result.usage.input_tokens, 200);

  const sent = JSON.parse(calls[0].request.body);
  assert.equal(calls[0].url, 'https://api.typesafe.ai/v1/systemone');
  assert.equal(calls[0].request.headers.authorization, 'Bearer test-key');
  assert.equal(sent.model, 'jev-latest');
  assert.equal(sent.questions.candidate_0.type, 'noul');
});

test('matching falls back safely when Jev is unavailable', async () => {
  const result = await rankPeeps({
    request: {
      need: 'Agent payments',
      outcome: 'Find relevant payment infrastructure expertise'
    },
    candidates,
    jev: new JevClient({ apiKey: '', fetchImpl: async () => { throw new Error('should not call'); } })
  });

  assert.equal(result.engine, 'deterministic');
  assert.equal(result.ranked[0].id, 'payments');
  assert.equal(result.ranked[0].matchEngine, 'deterministic');
});

test('matching falls back when the Jev API fails', async () => {
  const errors = [];
  const jev = new JevClient({
    apiKey: 'test-key',
    fetchImpl: async () => ({ ok: false, status: 503, async text() { return 'unavailable'; } })
  });

  const result = await rankPeeps({
    request: { need: 'payments' },
    candidates,
    jev,
    onJevError: error => errors.push(error)
  });

  assert.equal(result.engine, 'deterministic');
  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /Jev request failed/);
});
