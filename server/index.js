import http from 'node:http';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { join, extname, resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { demoScene, catalog } from '../src/demo-data.js';
import { optimizeRepairs, quoteFor } from '../src/engine.js';
import { createOrderBody, paypalConfigured, paypalRequest, verifyCapture } from './paypal.js';
import { analyzeLicense } from './ai.js';

const port = Number(process.env.PORT || 4174);
const host = '127.0.0.1';
const publicOrigin = process.env.PUBLIC_ORIGIN || `http://${host}:${port}`;
const dataDir = resolve('.data');
const ledgerPath = join(dataDir, 'orders.json');
let orders = {};
try { orders = JSON.parse(await readFile(ledgerPath, 'utf8')); } catch { /* first local run */ }

async function save() {
  await mkdir(dataDir, { recursive: true });
  await writeFile(`${ledgerPath}.tmp`, JSON.stringify(orders, null, 2));
  await import('node:fs/promises').then(fs => fs.rename(`${ledgerPath}.tmp`, ledgerPath));
}
function json(res, status, data) {
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(data));
}
async function bodyOf(req) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > 100_000) throw new Error('请求过大');
  }
  return raw ? JSON.parse(raw) : {};
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, publicOrigin);
    if (url.pathname === '/api/status' && req.method === 'GET') return json(res, 200, { paypalConfigured: paypalConfigured(), mode: 'sandbox-only' });
    if (url.pathname === '/api/quote' && req.method === 'GET') {
      const plan = optimizeRepairs(demoScene, catalog);
      return json(res, 200, { quote: quoteFor(demoScene, plan), options: plan.options });
    }
    if (url.pathname === '/api/entitlement' && req.method === 'GET') {
      const orderId = url.searchParams.get('orderId');
      const record = orderId && orders[orderId];
      return json(res, 200, record?.state === 'COMPLETED' ? { unlocked: true, itemIds: record.quote.itemIds, orderId } : { unlocked: false });
    }
    if (url.pathname === '/api/analyze-license' && req.method === 'POST') {
      try { return json(res, 200, await analyzeLicense((await bodyOf(req)).text)); }
      catch (error) { return json(res, 422, { error: error.message }); }
    }
    if (url.pathname === '/api/checkout' && req.method === 'POST') {
      if (!paypalConfigured()) return json(res, 503, { error: '尚未配置 PayPal Sandbox；可使用本地演示解锁，不产生交易。' });
      const input = await bodyOf(req);
      const plan = optimizeRepairs(demoScene, catalog);
      const quote = quoteFor(demoScene, plan);
      if (input.payload !== quote.payload) return json(res, 409, { error: '报价已变化，请刷新后重试。' });
      const localId = randomUUID();
      const order = await paypalRequest('/v2/checkout/orders', { method: 'POST', body: createOrderBody(quote, publicOrigin), requestId: localId });
      orders[order.id] = { quote, state: 'CREATED', createdAt: new Date().toISOString(), requestId: localId };
      await save();
      const approvalUrl = order.links?.find(link => ['payer-action', 'approve'].includes(link.rel))?.href;
      if (!approvalUrl) return json(res, 502, { error: 'PayPal 未返回买家批准链接。' });
      return json(res, 200, { orderId: order.id, approvalUrl });
    }
    if (url.pathname === '/api/capture' && req.method === 'POST') {
      const input = await bodyOf(req);
      const record = orders[input.orderId];
      if (!record) return json(res, 404, { error: '本地订单不存在。' });
      if (record.state === 'COMPLETED') return json(res, 200, { unlocked: true, itemIds: record.quote.itemIds, orderId: input.orderId });
      // A timeout may mean capture succeeded. Read the order before any retry.
      let order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(input.orderId)}`);
      if (!verifyCapture(order, record.quote)) {
        order = await paypalRequest(`/v2/checkout/orders/${encodeURIComponent(input.orderId)}/capture`, { method: 'POST', body: {}, requestId: `capture-${record.requestId}` });
      }
      if (!verifyCapture(order, record.quote)) return json(res, 409, { error: '支付尚未完成或金额不匹配，未解锁权益。' });
      record.state = 'COMPLETED';
      record.captureId = order.purchase_units[0].payments.captures.find(capture => capture.status === 'COMPLETED').id;
      record.completedAt = new Date().toISOString();
      await save();
      return json(res, 200, { unlocked: true, itemIds: record.quote.itemIds, orderId: input.orderId });
    }
    // Serving built output allows a one-port local demo after `npm run build`.
    if (req.method === 'GET' && !url.pathname.startsWith('/api/')) {
      const path = resolve('dist', `.${url.pathname === '/' ? '/index.html' : url.pathname}`);
      if (!path.startsWith(resolve('dist'))) return json(res, 403, { error: '禁止访问' });
      try {
        const file = await readFile(path);
        const type = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' }[extname(path)] || 'application/octet-stream';
        res.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` }); res.end(file); return;
      } catch { /* route or missing build */ }
    }
    json(res, 404, { error: '未找到资源' });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});
server.listen(port, host, () => console.log(`License Graph Studio API: http://${host}:${port}`));
