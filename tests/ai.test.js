import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeLicense } from '../server/ai.js';

const source = 'You may use the asset in non-commercial games. Redistribution of the raw asset is prohibited.';
test('AI extraction stays a draft and requires verbatim evidence', async () => {
  const fetcher = async () => ({ ok: true, json: async () => ({ message: { content: JSON.stringify({ commercialGame: false, redistribution: false, confidence: 'high', evidence: 'non-commercial games', explanation: '仅允许非商业用途' }) } }) });
  const result = await analyzeLicense(source, fetcher);
  assert.equal(result.reviewed, false);
  assert.equal(result.commercialGame, false);
  assert.equal(result.redistribution, false);
});
test('invented evidence is rejected', async () => {
  const fetcher = async () => ({ ok: true, json: async () => ({ message: { content: JSON.stringify({ commercialGame: true, redistribution: true, confidence: 'high', evidence: 'unlimited commercial license', explanation: '' }) } }) });
  await assert.rejects(analyzeLicense(source, fetcher), /证据/);
});
