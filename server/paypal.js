import { randomUUID } from 'node:crypto';

const baseUrl = 'https://api-m.sandbox.paypal.com';
const credentials = () => ({ id: process.env.PAYPAL_CLIENT_ID, secret: process.env.PAYPAL_CLIENT_SECRET });
export const paypalConfigured = () => Boolean(credentials().id && credentials().secret);

async function accessToken(fetcher = fetch) {
  const { id, secret } = credentials();
  if (!id || !secret) throw new Error('PayPal Sandbox 凭据未配置');
  const response = await fetcher(`${baseUrl}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString('base64')}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials'
  });
  const data = await response.json();
  if (!response.ok || !data.access_token) throw new Error('无法取得 PayPal Sandbox 访问令牌');
  return data.access_token;
}

export async function paypalRequest(path, { method = 'GET', body, requestId = randomUUID(), fetcher = fetch } = {}) {
  const token = await accessToken(fetcher);
  const response = await fetcher(`${baseUrl}${path}`, {
    method,
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json', Prefer: 'return=representation', 'PayPal-Request-Id': requestId },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`PayPal Sandbox 请求失败 (${response.status}): ${data.name || '未知错误'}`);
  return data;
}

export function createOrderBody(quote, origin) {
  const value = (quote.amountCents / 100).toFixed(2);
  return {
    intent: 'CAPTURE',
    purchase_units: [{ reference_id: quote.sceneId, custom_id: quote.payload, description: 'License Graph Studio 自营数字替换素材包', amount: { currency_code: 'USD', value } }],
    payment_source: { paypal: { experience_context: {
      return_url: `${origin}/?payment=return`, cancel_url: `${origin}/?payment=cancel`,
      user_action: 'PAY_NOW', shipping_preference: 'NO_SHIPPING'
    } } }
  };
}

export function verifyCapture(order, quote) {
  const unit = order.purchase_units?.[0];
  const capture = unit?.payments?.captures?.find(item => item.status === 'COMPLETED');
  return Boolean(order.status === 'COMPLETED' && unit?.custom_id === quote.payload &&
    capture?.amount?.currency_code === quote.currency &&
    capture?.amount?.value === (quote.amountCents / 100).toFixed(2));
}
