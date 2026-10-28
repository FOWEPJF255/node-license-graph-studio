/** A license verdict is evidence supplied by a human or a model and then reviewed. */
export function evaluateAsset(asset, useCase = 'commercial-game') {
  const license = asset.license;
  if (!license || license.status === 'missing') return { status: 'blocked', reason: '缺少许可凭据' };
  if (license.status === 'unknown' || !license.reviewed) return { status: 'review', reason: '许可结论待人工核验' };
  if (!license.allowedUses?.includes(useCase)) return { status: 'blocked', reason: '许可用途与商业游戏发布冲突' };
  if (!license.redistribution) return { status: 'blocked', reason: '许可未覆盖作品再分发' };
  return { status: 'clear', reason: '当前用途有已核验的许可凭据' };
}

export function inspectScene(scene, useCase = 'commercial-game') {
  const assets = scene.assets.map(asset => ({ ...asset, verdict: evaluateAsset(asset, useCase) }));
  const blockers = assets.filter(asset => asset.verdict.status !== 'clear');
  const affectedObjects = new Set(blockers.flatMap(asset => asset.usedBy));
  return { assets, blockers, affectedObjects: [...affectedObjects], ready: blockers.length === 0 };
}

/** Exact minimum-cost cover for a small scene's blocked shared dependencies. */
export function optimizeRepairs(scene, catalog, useCase = 'commercial-game') {
  const inspection = inspectScene(scene, useCase);
  const blockedIds = new Set(inspection.blockers.map(asset => asset.id));
  if (!blockedIds.size) return { options: [], totalCents: 0, covered: [], unresolved: [], count: 0 };
  const candidates = catalog.filter(item => item.covers.some(id => blockedIds.has(id)));
  let best = null;
  for (let mask = 1; mask < (1 << candidates.length); mask++) {
    const selected = candidates.filter((_, index) => mask & (1 << index));
    const covered = new Set(selected.flatMap(item => item.covers));
    if (![...blockedIds].every(id => covered.has(id))) continue;
    const totalCents = selected.reduce((sum, item) => sum + item.priceCents, 0);
    if (!best || totalCents < best.totalCents || (totalCents === best.totalCents && selected.length < best.options.length)) {
      best = { options: selected, totalCents, covered: [...blockedIds], unresolved: [], count: selected.length };
    }
  }
  if (best) return best;
  const possible = new Set(candidates.flatMap(item => item.covers));
  return { options: [], totalCents: 0, covered: [], unresolved: [...blockedIds].filter(id => !possible.has(id)), count: 0 };
}

export function applyRepairs(scene, options, useCase = 'commercial-game') {
  const covered = new Map(options.flatMap(item => item.covers.map(id => [id, item])));
  const repaired = structuredClone(scene);
  repaired.assets = repaired.assets.map(asset => {
    const item = covered.get(asset.id);
    return item ? { ...asset, replacementId: item.id, name: item.replacementNames?.[asset.id] || item.assetName, license: { status: 'valid', reviewed: true, allowedUses: [useCase], redistribution: true, evidence: `自营素材包 ${item.id}` } } : asset;
  });
  return repaired;
}

export function quoteFor(scene, plan) {
  const payload = JSON.stringify({ sceneId: scene.id, version: scene.version, items: plan.options.map(item => item.id).sort(), cents: plan.totalCents });
  return { payload, sceneId: scene.id, version: scene.version, itemIds: plan.options.map(item => item.id).sort(), amountCents: plan.totalCents, currency: 'USD' };
}
