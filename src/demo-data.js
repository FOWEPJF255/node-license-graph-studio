export const demoScene = {
  id: 'harbor-night', version: 1, title: '港口夜班 · Harbor Shift',
  objects: [
    { id: 'crane', name: '吊机', kind: 'crane', position: [-2.6, 0, 0], assetIds: ['metal-tex', 'alarm-audio'] },
    { id: 'container', name: '货柜', kind: 'container', position: [0, 0, -1.3], assetIds: ['metal-tex', 'brand-decal'] },
    { id: 'signal', name: '信号塔', kind: 'signal', position: [2.8, 0, 0.6], assetIds: ['metal-tex', 'alarm-audio'] },
    { id: 'dock', name: '码头', kind: 'dock', position: [0, 0, 2.2], assetIds: ['ground-tex'] }
  ],
  assets: [
    { id: 'metal-tex', name: '氧化金属贴图', type: 'texture', usedBy: ['crane', 'container', 'signal'], license: { status: 'missing' } },
    { id: 'alarm-audio', name: '警报音效', type: 'audio', usedBy: ['crane', 'signal'], license: { status: 'valid', reviewed: true, allowedUses: ['personal'], redistribution: false, evidence: 'demo-license-2' } },
    { id: 'brand-decal', name: '货柜编号贴花', type: 'texture', usedBy: ['container'], license: { status: 'valid', reviewed: true, allowedUses: ['commercial-game'], redistribution: true, evidence: 'demo-license-3' } },
    { id: 'ground-tex', name: '水泥地面贴图', type: 'texture', usedBy: ['dock'], license: { status: 'valid', reviewed: true, allowedUses: ['commercial-game'], redistribution: true, evidence: 'demo-license-4' } }
  ]
};

export const catalog = [
  { id: 'pack-metal', name: '工业材质替换包', assetName: '自营工业金属材质', covers: ['metal-tex'], priceCents: 499, accent: '#72e5e0' },
  { id: 'pack-alarm', name: '信号音效替换包', assetName: '自营信号音效', covers: ['alarm-audio'], priceCents: 299, accent: '#b2a3ff' },
  { id: 'pack-complete', name: '港口共享节点修复包', assetName: '自营港口替换素材', replacementNames: { 'metal-tex': '自营工业金属材质', 'alarm-audio': '自营信号警报音效' }, covers: ['metal-tex', 'alarm-audio'], priceCents: 649, accent: '#dfff82' }
];
