const requestedLanguage = new URLSearchParams(location.search).get('lang');
if (requestedLanguage === 'en' || requestedLanguage === 'zh') sessionStorage.setItem('node-language', requestedLanguage);
const english = (requestedLanguage || sessionStorage.getItem('node-language')) === 'en';
document.documentElement.lang = english ? 'en' : 'zh-CN';

const phrases = new Map(Object.entries({
  '港口夜班 · Harbor Shift': 'Harbor Shift',
  '导出分析': 'Export analysis', '导入场景': 'Import scene', '本地解析': 'local parsing',
  '重载示例场景': 'Reload demo scene', '场景对象': 'Scene objects', '场景物体': 'Scene objects', '共享资源': 'Shared assets',
  '用途环境': 'Use case', '商业游戏发布': 'Commercial game release',
  '许可必须覆盖商业使用及随作品再分发': 'Rights must allow commercial use and redistribution with the game',
  '看见每一个许可依赖': 'See every license dependency',
  '选择共享资源，查看它同时阻断了哪些物体。': 'Select a shared asset to see every object it blocks.',
  '场景资产分布预览': '3D scene asset preview', '拖动旋转 · 滚轮缩放': 'Drag to rotate · Scroll to zoom',
  '受影响物体': 'Affected objects', '其他物体': 'Other objects', '阻断交付': 'Delivery blocked',
  '一处缺口，逐层传导': 'One gap affects the whole scene', '物体 → 共享资源 → 许可': 'Objects → shared assets → licenses',
  '冲突/缺失': 'Conflict / missing', '当前选中': 'Selected', '已修复': 'Repaired',
  '氧化金属贴图': 'Oxidized metal texture', '警报音效': 'Alarm sound',
  '货柜编号贴花': 'Container decal', '水泥地面贴图': 'Concrete floor texture',
  '吊机': 'Crane', '货柜': 'Container', '信号塔': 'Signal tower', '码头': 'Dock',
  '许可缺失': 'License missing', '用途冲突': 'Use conflict', '已核验': 'Verified', '待核验': 'Needs review',
  '缺少许可凭据': 'License evidence missing', '未提供': 'Not provided',
  '最小成本修复': 'Minimum-cost repair', '港口共享节点修复包': 'Harbor shared-node repair pack',
  '修复前后对照': 'Before / after', '预览修复': 'Preview repair', '查看原始': 'View original',
  '预览修复后': 'After preview', '个阻断资源': 'blocking assets',
  '当前修复总额': 'Repair total', '通过 PayPal Sandbox 购买': 'Buy with PayPal Sandbox',
  '本地演示解锁 · 无交易': 'Local demo unlock · no transaction',
  '导出修复场景包': 'Export repaired scene pack',
  'Sandbox 未连接': 'Sandbox disconnected', 'Sandbox 已配置': 'Sandbox configured',
  'Sandbox 尚未配置。可先体验本地演示解锁。': 'Sandbox is not configured. Try the local demo unlock.',
  '演示权益：仅在此页面有效，不代表付款。': 'Demo unlock: valid on this page only; no payment occurred.',
  'Sandbox 已完成捕获并核对金额。': 'Sandbox capture completed and amount verified.',
  'Sandbox 订单仅针对未经修改的内置示例场景；导入或编辑后的场景暂不售卖。': 'Sandbox checkout is limited to the unchanged demo scene.',
  '本地演示权益已解锁；未创建 PayPal 订单。': 'Local demo unlocked; no PayPal order was created.',
  '场景包已生成：GLB、PNG、WAV、许可与映射清单。': 'Scene pack generated: GLB, PNG, WAV, license, and replacement manifest.',
  'AI 许可条款提取': 'AI license-term extraction', '本地 Qwen': 'Local Qwen',
  '粘贴许可原文。模型仅给出待核验草稿，明确证据必须能在原文定位；最终判定由你确认。': 'Paste license terms. The model produces a draft with source-matched evidence; you confirm the decision.',
  '分析当前资源的许可': 'Analyze selected asset license',
  '本地模型分析中…': 'Analyzing with local model…',
  '没有覆盖全部阻断的替换包。请补齐许可或目录。': 'No replacement covers all blockers. Add evidence or catalog entries.',
  '当前无阻断，无需替换。': 'No blockers remain; no replacement needed.',
  '当前方案尚未解除全部阻断。': 'The current plan does not clear every blocker.',
  '无资源': 'No asset', '未选择': 'Nothing selected',
  '许可': 'License', '证据': 'Evidence'
}));

function translate(value) {
  let result = value
    .replace(/覆盖 (\d+) 个阻断资源 · (\d+) 个物体/g, 'Covers $1 blocked assets · $2 objects')
    .replace(/一次替换组合同时解除 (\d+) 个共享资源阻断。/g, 'One replacement bundle clears $1 shared-asset blockers.');
  for (const [zh, en] of [...phrases].sort((a, b) => b[0].length - a[0].length)) result = result.replaceAll(zh, en);
  return result
    .replace(/关联 (\d+) 个物体/g, 'Used by $1 objects')
    .replace(/(\d+) 处引用/g, '$1 references')
    .replace(/(\d+) 处/g, '$1 uses')
    .replace(/引用这个共享节点的物体/g, 'Objects using this shared asset')
    .replace(/被 (.+?) 引用；/g, 'is used by $1; ')
    .replaceAll('或', 'or')
    .replaceAll('、', ', ')
    .replace(/\b1 references\b/g, '1 reference')
    .replaceAll('。', '.')
    .replaceAll('：', ': ');
}

export function localizePage() {
  if (!english) return;
  document.documentElement.lang = 'en';
  document.title = 'NODE — License Graph Studio';
  const walker = document.createTreeWalker(document.querySelector('#app'), NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.parentElement?.closest('textarea, script, style')) continue;
    node.nodeValue = translate(node.nodeValue);
  }
  document.querySelectorAll('#app [placeholder], #app [aria-label]').forEach(element => {
    for (const attr of ['placeholder', 'aria-label']) if (element.hasAttribute(attr)) element.setAttribute(attr, translate(element.getAttribute(attr)));
  });
}

export const translateMessage = value => english ? translate(value) : value;
