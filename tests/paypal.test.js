import test from 'node:test';
import assert from 'node:assert/strict';
import { createOrderBody, verifyCapture } from '../server/paypal.js';

const quote = { sceneId: 'harbor-night', payload: '{"version":1}', amountCents: 649, currency: 'USD' };
const captured = { status: 'COMPLETED', purchase_units: [{ custom_id: quote.payload, payments: { captures: [{ id: 'CAPTURE-1', status: 'COMPLETED', amount: { currency_code: 'USD', value: '6.49' } }] } }] };

test('Sandbox order freezes the quote, currency and return URLs', () => {
  const body = createOrderBody(quote, 'http://127.0.0.1:5173');
  assert.equal(body.intent, 'CAPTURE');
  assert.equal(body.purchase_units[0].amount.value, '6.49');
  assert.equal(body.purchase_units[0].custom_id, quote.payload);
  assert.equal(body.payment_source.paypal.experience_context.user_action, 'PAY_NOW');
});

test('entitlement only follows a complete matching capture', () => {
  assert.equal(verifyCapture(captured, quote), true);
  assert.equal(verifyCapture({ ...captured, status: 'APPROVED' }, quote), false);
  assert.equal(verifyCapture({ ...captured, purchase_units: [{ ...captured.purchase_units[0], custom_id: 'tampered' }] }, quote), false);
  assert.equal(verifyCapture({ ...captured, purchase_units: [{ ...captured.purchase_units[0], payments: { captures: [{ ...captured.purchase_units[0].payments.captures[0], status: 'PENDING' }] } }] }, quote), false);
  assert.equal(verifyCapture(captured, { ...quote, amountCents: 199 }), false);
});
