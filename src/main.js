import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { zipSync, strToU8 } from 'fflate';
import { demoScene, catalog as demoCatalog } from './demo-data.js';
import { inspectScene, optimizeRepairs, applyRepairs } from './engine.js';
import { localizePage, translateMessage } from './i18n.js';
import './style.css';

const app = document.querySelector('#app');
let sceneData = structuredClone(demoScene);
let catalog = demoCatalog;
let selectedId = 'metal-tex';
let previewRepair = false;
let unlocked = false;
let demoUnlocked = false;
let imported3D = null;
let modelRoot = null;
let currentQuote = null;
let paypalReady = false;
let message = '';
const money = cents => `$${(cents / 100).toFixed(2)}`;
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const verdictLabel = verdict => verdict.status === 'clear' ? '已核验' : verdict.status === 'review' ? '待核验' : verdict.reason.includes('缺少') ? '许可缺失' : '用途冲突';
const inspection = () => inspectScene(sceneData);
const plan = () => optimizeRepairs(sceneData, catalog);

function shell() {
  app.innerHTML = `<header class="topbar"><a class="brand" href="./" aria-label="NODE 首页"><span class="brand-mark">N<span>·</span></span><span>NODE <small>LICENSE STUDIO</small></span></a><div class="top-center"><span class="top-kicker">WORKSPACE / 001</span><span class="scene-name" id="scene-name"></span></div><div class="top-actions"><a class="lang-link" href="${document.documentElement.lang === 'en' ? '?lang=zh' : '?lang=en'}">${document.documentElement.lang === 'en' ? '中文' : 'EN'}</a><span id="connection" class="connection">检查连接中</span><button id="export-plan-top" class="header-button">导出分析 ↗</button></div></header>
  <div class="layout"><aside class="sidebar"><div class="sidebar-head"><span class="eyebrow">SCENE FILES</span><span class="side-count" id="object-count"></span></div><div class="upload-zone"><label class="upload-label" for="scene-upload"><span class="upload-symbol">↥</span><strong>导入场景</strong><small>.glb 或 .json · 本地解析</small></label><input id="scene-upload" type="file" accept=".glb,.gltf,.json,model/gltf-binary,application/json"><button id="reset-demo" class="text-button">重载示例场景 ↗</button></div><div class="side-section"><div class="side-title">场景对象 <span id="object-total"></span></div><div id="object-list"></div></div><div class="side-section"><div class="side-title">共享资源 <span id="asset-total"></span></div><div id="asset-list"></div></div><div class="side-foot"><div class="mini-rule"></div><p>用途环境</p><strong>商业游戏发布</strong><span>许可必须覆盖商业使用及随作品再分发</span></div></aside>
  <main class="workspace"><div class="workspace-title"><div><div class="eyebrow">01 / SCENE INTELLIGENCE</div><h1>看见每一个许可依赖<span class="title-period">.</span></h1><p>选择共享资源，查看它同时阻断了哪些物体。</p></div><div class="scene-tag">3D ASSET MAP <span class="tag-dot"></span> LOCAL</div></div>
  <section class="viewport-card" aria-label="场景资产分布预览"><div class="viewport-top"><span><span class="live-dot"></span> 场景资产分布预览</span><span>拖动旋转 · 滚轮缩放</span></div><div id="scene-canvas"></div><div class="viewport-overlay"><div class="overlay-kicker">SELECTED RESOURCE</div><strong id="overlay-name"></strong><span id="overlay-impact"></span></div><div class="viewport-legend"><span><i class="legend-box affected"></i> 受影响物体</span><span><i class="legend-box safe"></i> 其他物体</span></div></section>
  <div class="stats" id="stats"></div><section class="graph-section"><div class="section-heading"><div><div class="eyebrow">02 / DEPENDENCY MAP</div><h2>一处缺口，逐层传导</h2></div><span class="section-note">物体 → 共享资源 → 许可</span></div><div id="graph" class="graph-card"></div></section></main>
  <aside class="inspector"><div class="inspector-top"><span class="eyebrow">03 / REPAIR STRATEGY</span><span class="inspector-number">/ 01</span></div><div class="inspector-body"><div class="risk-heading"><span class="risk-mark">!</span><div><span class="eyebrow">FOCUS NODE</span><h2 id="focus-name"></h2><p id="focus-type"></p></div></div><div id="focus-verdict"></div><div id="focus-details"></div><div class="divider"></div><div class="section-heading compact"><div><div class="eyebrow">OPTIMAL COVER</div><h2>最小成本修复</h2></div></div><div id="repair-list"></div><div id="comparison"></div><div id="license-ai"></div></div><div class="inspector-bottom"><div class="purchase-summary"><span>当前修复总额</span><strong id="total-price"></strong></div><button id="checkout" class="primary-button">通过 PayPal Sandbox 购买 <span>↗</span></button><button id="demo-unlock" class="demo-button">本地演示解锁 · 无交易</button><button id="export-repaired" class="export-button">导出修复场景包 ↓</button><p id="checkout-note"></p></div></aside></div><div id="toast" role="status" aria-live="polite"></div>`;
  document.querySelector('#scene-upload').addEventListener('change', onUpload);
  document.querySelector('#reset-demo').addEventListener('click', resetDemo);
  document.querySelector('#export-plan-top').addEventListener('click', exportAnalysis);
  document.querySelector('#checkout').addEventListener('click', checkout);
  document.querySelector('#demo-unlock').addEventListener('click', () => { demoUnlocked = true; unlocked = true; notify('本地演示权益已解锁；未创建 PayPal 订单。'); render(); });
  document.querySelector('#export-repaired').addEventListener('click', exportRepaired);
  initThree();
  render();
  handleReturn();
  restoreEntitlement();
  fetch('/api/status').then(r => r.json()).then(data => { paypalReady = data.paypalConfigured; render(); }).catch(() => { paypalReady = false; render(); });
}

function render() {
  const result = inspection(); const repair = plan();
  const selected = result.assets.find(asset => asset.id === selectedId) || result.assets[0];
  if (selected) selectedId = selected.id;
  document.querySelector('#scene-name').textContent = sceneData.title;
  document.querySelector('#object-count').textContent = `${sceneData.objects.length} OBJECTS`;
  document.querySelector('#object-total').textContent = String(sceneData.objects.length).padStart(2, '0');
  document.querySelector('#asset-total').textContent = String(sceneData.assets.length).padStart(2, '0');
  document.querySelector('#connection').innerHTML = `<i></i>${paypalReady ? 'Sandbox 已配置' : 'Sandbox 未连接'}`;
  document.querySelector('#connection').classList.toggle('connected', paypalReady);
  document.querySelector('#object-list').innerHTML = sceneData.objects.map(object => `<button class="object-row ${selected?.usedBy.includes(object.id) ? 'affected' : ''}" data-object="${escapeHtml(object.id)}"><span class="object-symbol">◇</span><span>${escapeHtml(object.name)}</span><small>${object.assetIds.length}</small></button>`).join('');
  document.querySelector('#asset-list').innerHTML = result.assets.map(asset => `<button class="asset-row ${asset.id === selectedId ? 'active' : ''}" data-asset="${escapeHtml(asset.id)}"><span class="asset-glyph">${asset.type === 'audio' ? '◉' : '▦'}</span><span><strong>${escapeHtml(asset.name)}</strong><small>${asset.usedBy.length} 处引用</small></span><i class="status-dot ${asset.verdict.status}"></i></button>`).join('');
  document.querySelectorAll('[data-asset]').forEach(button => button.addEventListener('click', () => { selectedId = button.dataset.asset; render(); }));
  document.querySelectorAll('[data-object]').forEach(button => button.addEventListener('click', () => { const object = sceneData.objects.find(item => item.id === button.dataset.object); selectedId = object?.assetIds[0] || selectedId; render(); }));
  document.querySelector('#overlay-name').textContent = selected?.name || '无资源';
  document.querySelector('#overlay-impact').textContent = selected ? `关联 ${selected.usedBy.length} 个物体 · ${verdictLabel(selected.verdict)}` : '';
  document.querySelector('#stats').innerHTML = `<div><small>SCENE OBJECTS</small><strong>${sceneData.objects.length.toString().padStart(2, '0')}</strong><span>场景物体</span></div><div><small>SHARED ASSETS</small><strong>${sceneData.assets.length.toString().padStart(2, '0')}</strong><span>共享资源</span></div><div class="stat-risk"><small>BLOCKING ISSUES</small><strong>${(previewRepair ? inspectScene(applyRepairs(sceneData, repair.options)).blockers.length : result.blockers.length).toString().padStart(2, '0')}</strong><span>${previewRepair ? '预览修复后' : '阻断交付'}</span></div><div><small>AFFECTED OBJECTS</small><strong>${result.affectedObjects.length.toString().padStart(2, '0')}</strong><span>受影响物体</span></div>`;
  renderGraph(result, selected, repair);
  document.querySelector('#focus-name').textContent = selected?.name || '未选择';
  document.querySelector('#focus-type').textContent = `${selected?.type === 'audio' ? 'AUDIO RESOURCE' : 'TEXTURE RESOURCE'} / ${selected?.id || ''}`;
  document.querySelector('#focus-verdict').innerHTML = selected ? `<div class="verdict ${selected.verdict.status}"><strong>${verdictLabel(selected.verdict)}</strong><span>${escapeHtml(selected.verdict.reason)}</span></div>` : '';
  document.querySelector('#focus-details').innerHTML = selected ? `<div class="impact-caption">引用这个共享节点的物体 <b>${selected.usedBy.length}</b></div><div class="impact-list">${selected.usedBy.map(id => `<span>${escapeHtml(sceneData.objects.find(object => object.id === id)?.name || id)}</span>`).join('')}</div><div class="evidence">证据：${escapeHtml(selected.license?.evidence || '未提供')}</div>` : '';
  document.querySelector('#repair-list').innerHTML = repair.options.length ? repair.options.map((item, index) => `<div class="repair-item"><div class="repair-icon">${index + 1}</div><div><strong>${escapeHtml(item.name)}</strong><span>覆盖 ${item.covers.length} 个阻断资源 · ${item.covers.reduce((set, id) => { sceneData.assets.find(asset => asset.id === id)?.usedBy.forEach(objectId => set.add(objectId)); return set; }, new Set()).size} 个物体</span></div><b>${money(item.priceCents)}</b></div>`).join('') : `<div class="no-repair">${result.ready ? '当前无阻断，无需替换。' : '没有覆盖全部阻断的替换包。请补齐许可或目录。'}</div>`;
  const after = inspectScene(applyRepairs(sceneData, repair.options));
  document.querySelector('#comparison').innerHTML = `<div class="compare-head"><span>修复前后对照</span><button id="compare-toggle" aria-pressed="${previewRepair}">${previewRepair ? '查看原始' : '预览修复'} →</button></div><div class="compare-values"><div><small>BEFORE</small><strong>${result.blockers.length}</strong><span>个阻断资源</span></div><div class="compare-arrow">→</div><div><small>AFTER</small><strong>${after.blockers.length}</strong><span>个阻断资源</span></div></div><p class="compare-caption">${repair.options.length ? `一次替换组合同时解除 ${result.blockers.length - after.blockers.length} 个共享资源阻断。` : '当前方案尚未解除全部阻断。'}</p>`;
  document.querySelector('#compare-toggle').addEventListener('click', () => { previewRepair = !previewRepair; render(); });
  renderAI(selected);
  document.querySelector('#total-price').textContent = money(repair.totalCents);
  const canPurchase = sceneData.id === demoScene.id && sceneData.version === demoScene.version && paypalReady && repair.options.length && !unlocked;
  document.querySelector('#checkout').disabled = !canPurchase;
  document.querySelector('#demo-unlock').disabled = unlocked || !repair.options.length;
  document.querySelector('#export-repaired').disabled = !after.ready || (!unlocked && repair.options.length > 0);
  document.querySelector('#checkout-note').textContent = unlocked ? (demoUnlocked ? '演示权益：仅在此页面有效，不代表付款。' : 'Sandbox 已完成捕获并核对金额。') : paypalReady ? 'Sandbox 订单仅针对未经修改的内置示例场景；导入或编辑后的场景暂不售卖。' : 'Sandbox 尚未配置。可先体验本地演示解锁。';
  update3D(selected);
  localizePage();
}

function renderGraph(result, selected, repair) {
  const assets = result.assets;
  const nodes = sceneData.objects;
  const width = 880, height = Math.max(290, assets.length * 52 + 80, nodes.length * 46 + 70);
  const objY = id => 60 + nodes.findIndex(item => item.id === id) * 46;
  const assetY = id => 60 + assets.findIndex(item => item.id === id) * 52;
  const paths = assets.flatMap(asset => asset.usedBy.map(id => {
    const active = asset.id === selected?.id;
    const status = previewRepair && repair.covered.includes(asset.id) ? 'clear' : asset.verdict.status;
    return `<path class="graph-edge ${status} ${active ? 'active' : ''}" d="M 255 ${objY(id)} C 365 ${objY(id)}, 400 ${assetY(asset.id)}, 515 ${assetY(asset.id)}"/>`;
  })).join('');
  const objectSvg = nodes.map(object => `<g class="graph-object ${selected?.usedBy.includes(object.id) ? 'active' : ''}" data-object="${escapeHtml(object.id)}" transform="translate(55 ${objY(object.id) - 15})"><rect width="200" height="30" rx="7"/><text x="14" y="20">◇  ${escapeHtml(object.name)}</text></g>`).join('');
  const assetSvg = assets.map(asset => `<g class="graph-asset ${asset.id === selected?.id ? 'active' : ''} ${asset.verdict.status}" data-asset="${escapeHtml(asset.id)}" transform="translate(515 ${assetY(asset.id) - 17})"><rect width="282" height="36" rx="8"/><text x="14" y="23">${asset.type === 'audio' ? '◉' : '▦'}  ${escapeHtml(asset.name)}</text><text class="graph-count" x="270" y="23" text-anchor="end">${asset.usedBy.length} 处</text></g>`).join('');
  document.querySelector('#graph').innerHTML = `<div class="graph-top"><span>DEPENDENCY GRAPH</span><span><i class="graph-key red"></i> 冲突/缺失 <i class="graph-key violet"></i> 当前选中 <i class="graph-key mint"></i> 已修复</span></div><div class="graph-scroll"><svg viewBox="0 0 ${width} ${height}" role="img" aria-label="依赖关系图，左侧场景物体指向右侧共享资源"><text class="graph-col-title" x="55" y="30">SCENE OBJECTS</text><text class="graph-col-title" x="515" y="30">SHARED ASSETS / LICENSE</text>${paths}${objectSvg}${assetSvg}</svg></div><p class="graph-accessible">${assets.map(asset => `${asset.name} 被 ${asset.usedBy.map(id => nodes.find(object => object.id === id)?.name || id).join('、')} 引用；${verdictLabel(asset.verdict)}。`).join(' ')}</p>`;
  document.querySelectorAll('#graph [data-asset]').forEach(node => node.addEventListener('click', () => { selectedId = node.dataset.asset; render(); }));
  document.querySelectorAll('#graph [data-object]').forEach(node => node.addEventListener('click', () => { const object = nodes.find(item => item.id === node.dataset.object); selectedId = object.assetIds[0]; render(); }));
}

function renderAI(selected) {
  document.querySelector('#license-ai').innerHTML = `<details class="ai-panel"><summary>AI 许可条款提取 <span>本地 Qwen</span></summary><p>粘贴许可原文。模型仅给出待核验草稿，明确证据必须能在原文定位；最终判定由你确认。</p><textarea id="license-text" placeholder="粘贴 20–8000 字符的许可条款…"></textarea><button id="analyze-license" class="secondary-button">分析当前资源的许可</button><div id="ai-result"></div></details>`;
  document.querySelector('#analyze-license').addEventListener('click', async () => {
    const text = document.querySelector('#license-text').value;
    const button = document.querySelector('#analyze-license'); button.disabled = true; button.textContent = '本地模型分析中…';
    try {
      const response = await fetch('/api/analyze-license', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error);
      document.querySelector('#ai-result').innerHTML = `<div class="ai-draft"><strong>模型草稿 · ${escapeHtml(data.confidence)} 信心</strong><p>商业使用：${data.commercialGame ? '明确允许' : '未明确允许'}；随游戏再分发：${data.redistribution ? '明确允许' : '未明确允许'}</p><blockquote>${escapeHtml(data.evidence)}</blockquote><p>${escapeHtml(data.explanation)}</p><button id="confirm-license" class="secondary-button">我已核对原文，应用结论</button></div>`;
      document.querySelector('#confirm-license').addEventListener('click', () => {
        const asset = sceneData.assets.find(item => item.id === selected.id);
        asset.license = { status: 'valid', reviewed: true, allowedUses: data.commercialGame ? ['commercial-game'] : [], redistribution: data.redistribution, evidence: data.evidence, sourceText: text, model: data.model };
        sceneData.version += 1; unlocked = false; demoUnlocked = false; render(); notify('已应用人工核验的许可结论。');
      });
    } catch (error) { document.querySelector('#ai-result').textContent = error.message; }
    finally { button.disabled = false; button.textContent = '分析当前资源的许可'; }
  });
}

function download(name, data) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function exportAnalysis() {
  const result = inspection(); const repair = plan();
  download(`${sceneData.id}-license-analysis.json`, { generatedAt: new Date().toISOString(), useCase: 'commercial-game', scene: sceneData, verdicts: result.assets.map(({ id, verdict }) => ({ id, verdict })), proposedRepairs: repair.options.map(item => ({ id: item.id, covers: item.covers, priceCents: item.priceCents })), unresolved: repair.unresolved, note: '分析报告，不是法律意见或已付款权益凭据。' });
}
async function exportRepaired() {
  const repair = plan(); const repaired = applyRepairs(sceneData, repair.options);
  if (!unlocked && repair.options.length) return notify('请先解锁替换权益。');
  if (!inspectScene(repaired).ready) return notify('仍有未解决的许可阻断。');
  const button = document.querySelector('#export-repaired'); button.disabled = true; button.textContent = '打包场景与素材中…';
  try {
    const textureCanvas = document.createElement('canvas'); textureCanvas.width = textureCanvas.height = 128;
    const ctx = textureCanvas.getContext('2d'); ctx.fillStyle = '#536e77'; ctx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 14; i++) { ctx.fillStyle = i % 3 ? '#7e9498' : '#334f5c'; ctx.fillRect(i * 10, 0, 2, 128); }
    ctx.fillStyle = '#9cafb0'; for (const y of [12, 116]) for (let x = 8; x < 128; x += 20) { ctx.beginPath(); ctx.arc(x, y, 1.3, 0, Math.PI * 2); ctx.fill(); }
    const textureBlob = await new Promise(resolve => textureCanvas.toBlob(resolve, 'image/png'));
    const textureBytes = new Uint8Array(await textureBlob.arrayBuffer());
    const replacementTexture = new THREE.CanvasTexture(textureCanvas); replacementTexture.colorSpace = THREE.SRGBColorSpace;
    const exportRoot = new THREE.Group();
    const purchasedAssetIds = new Set(repair.options.flatMap(item => item.covers));
    for (const object of sceneData.objects) {
      const original = objectMeshes.get(object.id);
      if (!original) continue;
      const clone = original.clone(true);
      const sourceMeshes = []; original.traverse(mesh => { if (mesh.isMesh) sourceMeshes.push(mesh); });
      let meshIndex = 0;
      clone.traverse(mesh => { mesh.userData = {}; if (!mesh.isMesh) return;
        const sourceMesh = sourceMeshes[meshIndex++];
        const base = sourceMesh.userData.originalMaterial || sourceMesh.material;
        const source = Array.isArray(base) ? base[0] : base;
        const mat = source.clone(); mat.emissive = new THREE.Color('#000000'); mat.emissiveIntensity = 0;
        if (object.assetIds.includes('metal-tex') && purchasedAssetIds.has('metal-tex')) { mat.map = replacementTexture; mat.color.set('#ffffff'); mat.needsUpdate = true; }
        mesh.material = mat; mesh.userData = {};
      });
      exportRoot.add(clone);
    }
    const glb = await new GLTFExporter().parseAsync(exportRoot, { binary: true, onlyVisible: true });
    const files = { 'scene-repaired.glb': new Uint8Array(glb) };
    if (purchasedAssetIds.has('metal-tex')) files['industrial-metal.png'] = textureBytes;
    if (purchasedAssetIds.has('alarm-audio')) files['signal-alert.wav'] = makeAlarmWav();
    const evidence = { generatedAt: new Date().toISOString(), scene: repaired, replacementMapping: repair.options.map(item => ({ packId: item.id, replaces: item.covers })), entitlement: demoUnlocked ? 'LOCAL_DEMO_ONLY_NO_PAYMENT' : repair.options.length ? 'PAYPAL_SANDBOX_CAPTURE_VERIFIED' : 'NO_PURCHASE_REQUIRED', files: [...Object.keys(files), 'manifest.json', 'LICENSE.txt'], note: '程序生成的替换素材；GLB 包含替换材质，WAV 为独立音效文件。请按实际项目核对使用范围。' };
    const license = 'License Graph Studio generated demo assets\nYou may use and redistribute these generated assets inside a game, including a commercial game. Do not sell the raw assets as a standalone pack. No warranty.\n';
    const zip = zipSync({ ...files, 'manifest.json': strToU8(JSON.stringify(evidence, null, 2)), 'LICENSE.txt': strToU8(license) }, { level: 6 });
    const url = URL.createObjectURL(new Blob([zip], { type: 'application/zip' })); const link = document.createElement('a'); link.href = url; link.download = `${sceneData.id}-repaired-pack.zip`; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    notify('场景包已生成：GLB、PNG、WAV、许可与映射清单。');
  } catch (error) { notify(`导出失败：${error.message}`); }
  finally { button.disabled = false; button.textContent = '导出修复场景包 ↓'; }
}
function makeAlarmWav() {
  const rate = 22050, seconds = 1.2, count = Math.floor(rate * seconds);
  const buffer = new ArrayBuffer(44 + count * 2), view = new DataView(buffer);
  const text = (offset, value) => [...value].forEach((character, index) => view.setUint8(offset + index, character.charCodeAt(0)));
  text(0, 'RIFF'); view.setUint32(4, 36 + count * 2, true); text(8, 'WAVE'); text(12, 'fmt '); view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true); view.setUint32(24, rate, true); view.setUint32(28, rate * 2, true); view.setUint16(32, 2, true); view.setUint16(34, 16, true); text(36, 'data'); view.setUint32(40, count * 2, true);
  for (let i = 0; i < count; i++) { const t = i / rate; const beat = Math.floor(t * 5) % 2; const envelope = Math.min(1, t * 20) * Math.min(1, (seconds - t) * 12); const wave = Math.sin(2 * Math.PI * (beat ? 690 : 510) * t) * .28 * envelope; view.setInt16(44 + i * 2, Math.round(wave * 32767), true); }
  return new Uint8Array(buffer);
}
async function checkout() {
  const button = document.querySelector('#checkout'); button.disabled = true; button.textContent = '创建 Sandbox 订单中…';
  try {
    const quoteResponse = await fetch('/api/quote'); const { quote } = await quoteResponse.json(); currentQuote = quote;
    const response = await fetch('/api/checkout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ payload: quote.payload }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error);
    sessionStorage.setItem('pendingOrderId', data.orderId);
    location.href = data.approvalUrl;
  } catch (error) { notify(error.message); render(); }
}
async function handleReturn() {
  const params = new URLSearchParams(location.search); if (params.get('payment') === 'cancel') { notify('已取消 Sandbox 结算。'); history.replaceState({}, '', '/'); return; }
  if (params.get('payment') !== 'return') return;
  const orderId = params.get('token');
  if (!orderId || sessionStorage.getItem('pendingOrderId') !== orderId) { notify('订单与当前会话不匹配，未解锁。'); return; }
  try {
    const response = await fetch('/api/capture', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ orderId }) });
    const data = await response.json(); if (!response.ok || !data.unlocked) throw new Error(data.error || '未完成捕获');
    unlocked = true; demoUnlocked = false; sessionStorage.removeItem('pendingOrderId'); sessionStorage.setItem('completedOrderId', orderId); notify('Sandbox 捕获已核对，替换权益已解锁。'); render();
    history.replaceState({}, '', '/');
  } catch (error) { notify(`未解锁：${error.message}`); }
}
async function restoreEntitlement() {
  if (new URLSearchParams(location.search).get('payment') === 'return') return;
  const orderId = sessionStorage.getItem('completedOrderId'); if (!orderId) return;
  try { const response = await fetch(`/api/entitlement?orderId=${encodeURIComponent(orderId)}`); const data = await response.json();
    if (data.unlocked && sceneData.id === demoScene.id && sceneData.version === demoScene.version) { unlocked = true; demoUnlocked = false; render(); }
    else sessionStorage.removeItem('completedOrderId');
  } catch { /* API is offline; no entitlement is inferred */ }
}
function notify(text) { message = translateMessage(text); const toast = document.querySelector('#toast'); toast.textContent = message; toast.classList.add('visible'); setTimeout(() => toast.classList.remove('visible'), 5000); }
function resetDemo() { sceneData = structuredClone(demoScene); catalog = demoCatalog; selectedId = 'metal-tex'; previewRepair = false; unlocked = false; demoUnlocked = false; imported3D = null; buildDemo3D(); render(); notify('已重载示例场景。'); }

async function onUpload(event) {
  const file = event.target.files?.[0]; if (!file) return;
  try {
    if (/\.json$/i.test(file.name)) {
      const data = JSON.parse(await file.text()); const scene = data.scene || data;
      validateScene(scene); sceneData = scene; catalog = []; imported3D = null; buildDemo3D();
    } else if (/\.glb$/i.test(file.name)) {
      const buffer = await file.arrayBuffer();
      const gltf = await new GLTFLoader().parseAsync(buffer, '');
      const objects = [], assetMap = new Map(); let index = 0;
      gltf.scene.traverse(node => { if (!node.isMesh) return; const id = `mesh-${++index}`; const material = Array.isArray(node.material) ? node.material[0] : node.material; const assetId = `material-${material?.uuid || 'default'}`; const assetName = material?.name || `材质 ${assetMap.size + 1}`;
        objects.push({ id, name: node.name || `物体 ${index}`, kind: 'mesh', position: node.position.toArray(), assetIds: [assetId] });
        if (!assetMap.has(assetId)) assetMap.set(assetId, { id: assetId, name: assetName, type: 'texture', usedBy: [], license: { status: 'unknown', reviewed: false } });
        assetMap.get(assetId).usedBy.push(id);
      });
      if (!objects.length) throw new Error('GLB 中没有可分析的网格物体。');
      sceneData = { id: `import-${Date.now()}`, version: 1, title: file.name, objects, assets: [...assetMap.values()] }; catalog = []; imported3D = gltf.scene; buildImported3D();
    } else throw new Error('目前支持 .glb 和项目场景清单 .json。');
    selectedId = sceneData.assets[0]?.id; unlocked = false; demoUnlocked = false; previewRepair = false; render(); notify('已本地导入。缺少许可凭据的资源均标为待核验。');
  } catch (error) { notify(`导入失败：${error.message}`); }
  event.target.value = '';
}
function validateScene(scene) {
  if (!scene || !Array.isArray(scene.objects) || !Array.isArray(scene.assets) || !scene.id || !scene.title) throw new Error('JSON 缺少 scene、objects 或 assets 字段。');
  const objectIds = new Set(scene.objects.map(item => item.id));
  if (scene.assets.some(asset => !asset.id || !Array.isArray(asset.usedBy) || asset.usedBy.some(id => !objectIds.has(id)))) throw new Error('资源依赖引用了不存在的场景物体。');
  scene.version ||= 1;
}

let renderer, camera, controls, threeScene, objectMeshes = new Map(), frameId;
function initThree() {
  const container = document.querySelector('#scene-canvas');
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.outputColorSpace = THREE.SRGBColorSpace;
  container.appendChild(renderer.domElement);
  threeScene = new THREE.Scene(); threeScene.background = new THREE.Color('#0e1218');
  camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100); camera.position.set(8, 7, 10);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.maxPolarAngle = Math.PI / 2.05;
  threeScene.add(new THREE.AmbientLight(0xcdd7ed, 2)); const light = new THREE.DirectionalLight(0xffffff, 3); light.position.set(5, 10, 8); threeScene.add(light);
  const grid = new THREE.GridHelper(22, 22, 0x2c3745, 0x1b232d); grid.position.y = -0.07; threeScene.add(grid);
  new ResizeObserver(() => { const { clientWidth: w, clientHeight: h } = container; if (!w || !h) return; renderer.setSize(w, h); camera.aspect = w / h; camera.updateProjectionMatrix(); }).observe(container);
  buildDemo3D();
  function loop() { frameId = requestAnimationFrame(loop); controls.update(); renderer.render(threeScene, camera); } loop();
}
function material(color) { return new THREE.MeshStandardMaterial({ color, metalness: 0.22, roughness: 0.55 }); }
function meshBox(w, h, d, color, x, y, z, group) { const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color)); mesh.position.set(x, y, z); group.add(mesh); return mesh; }
function clearModel() { if (modelRoot) threeScene.remove(modelRoot); modelRoot = new THREE.Group(); threeScene.add(modelRoot); objectMeshes = new Map(); }
function buildDemo3D() {
  if (!threeScene) return; clearModel();
  for (const object of sceneData.objects) {
    const group = new THREE.Group(); const [x, y, z] = object.position || [0, 0, 0]; group.position.set(x, y, z);
    if (object.kind === 'crane') { meshBox(.24, 2.8, .24, '#8794a6', 0, 1.4, 0, group); meshBox(2.1, .18, .25, '#b0bcc9', .7, 2.7, 0, group); meshBox(.05, 1.0, .05, '#cdd6e1', 1.65, 2.1, 0, group); meshBox(.65, .14, .4, '#6d7e90', 1.65, 1.6, 0, group); }
    else if (object.kind === 'container') { meshBox(2.5, 1.2, 1.2, '#5f7987', 0, .6, 0, group); for (let i = -1; i <= 1; i += .4) meshBox(.035, 1.16, 1.23, '#8095a1', i, .6, 0, group); }
    else if (object.kind === 'signal') { meshBox(.28, 2.4, .28, '#738596', 0, 1.2, 0, group); meshBox(.75, .42, .52, '#c09b69', 0, 2.35, 0, group); const glow = new THREE.Mesh(new THREE.SphereGeometry(.15, 14, 12), new THREE.MeshBasicMaterial({ color: '#ff9472' })); glow.position.set(0, 2.35, .3); group.add(glow); }
    else { meshBox(3.7, .16, 1.8, '#52666b', 0, 0, 0, group); for (let i = -1.5; i < 2; i += .8) meshBox(.08, .03, 1.83, '#92aaa9', i, .1, 0, group); }
    modelRoot.add(group); objectMeshes.set(object.id, group);
  }
  if (sceneData.objects.length && sceneData.id !== demoScene.id) { camera.position.set(8, 7, 10); controls.target.set(0, 0, 0); }
}
function buildImported3D() {
  clearModel(); if (!imported3D) return; modelRoot.add(imported3D);
  const box = new THREE.Box3().setFromObject(imported3D); const size = box.getSize(new THREE.Vector3()); const center = box.getCenter(new THREE.Vector3());
  const max = Math.max(size.x, size.y, size.z, 0.1); imported3D.scale.multiplyScalar(5 / max); imported3D.position.sub(center.multiplyScalar(5 / max));
  const meshes = []; imported3D.traverse(node => { if (node.isMesh) meshes.push(node); });
  sceneData.objects.forEach((object, index) => objectMeshes.set(object.id, meshes[index]));
  camera.position.set(8, 7, 10); controls.target.set(0, 0, 0);
}
function update3D(selected) {
  for (const [id, object] of objectMeshes) {
    const affected = selected?.usedBy.includes(id);
    object.traverse(node => { if (!node.isMesh) return;
      if (!node.userData.originalMaterial) node.userData.originalMaterial = node.material;
      if (affected) { const mat = Array.isArray(node.userData.originalMaterial) ? node.userData.originalMaterial[0] : node.userData.originalMaterial; node.material = mat.clone(); node.material.emissive = new THREE.Color(previewRepair ? '#247d62' : '#5b4ab0'); node.material.emissiveIntensity = .75; }
      else node.material = node.userData.originalMaterial;
    });
  }
}
shell();
