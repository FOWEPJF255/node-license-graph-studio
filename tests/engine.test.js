import test from 'node:test';
import assert from 'node:assert/strict';
import { demoScene, catalog } from '../src/demo-data.js';
import { inspectScene, optimizeRepairs, applyRepairs, quoteFor } from '../src/engine.js';

test('shared nodes affect several objects and cheapest bundle clears them', () => {
  const before = inspectScene(demoScene);
  assert.deepEqual(before.blockers.map(asset => asset.id), ['metal-tex', 'alarm-audio']);
  assert.deepEqual(new Set(before.affectedObjects), new Set(['crane', 'container', 'signal']));
  const plan = optimizeRepairs(demoScene, catalog);
  assert.deepEqual(plan.options.map(item => item.id), ['pack-complete']);
  assert.equal(plan.totalCents, 649);
  assert.equal(inspectScene(applyRepairs(demoScene, plan.options)).ready, true);
  assert.equal(quoteFor(demoScene, plan).amountCents, 649);
});

test('unknown license stays blocked; unavailable replacement is unresolved', () => {
  const scene = structuredClone(demoScene);
  scene.assets[2].license = { status: 'unknown', reviewed: false };
  const plan = optimizeRepairs(scene, catalog);
  assert.deepEqual(plan.unresolved, ['brand-decal']);
  assert.equal(inspectScene(scene).ready, false);
});

test('unreviewed AI conclusion cannot clear a dependency', () => {
  const scene = structuredClone(demoScene);
  scene.assets[0].license = { status: 'valid', reviewed: false, allowedUses: ['commercial-game'], redistribution: true };
  assert.equal(inspectScene(scene).assets[0].verdict.status, 'review');
});
