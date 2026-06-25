import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const orderController = read('../src/modules/quick-commerce/controllers/order.controller.js');
const checkoutPage = read('../../Frontend/src/modules/quickCommerce/user/pages/CheckoutPage.jsx');

test('quick-commerce order creation does not trust client discount totals', () => {
  assert.ok(orderController.includes("import { getQuickCoupons } from '../services/content.service.js';"));
  assert.ok(orderController.includes('const calculateQuickCouponDiscount = async'));
  assert.ok(orderController.includes('const requestedCouponCode = getRequestedCouponCode(req.body)'));
  assert.ok(orderController.includes('const { discount, coupon: appliedCoupon } = await calculateQuickCouponDiscount'));
  assert.match(orderController, /calculateQuickPricing\(\{\s*subtotal,\s*discount,\s*products,\s*\}\)/);
  assert.ok(!orderController.includes('const discount = Math.max(0, Number(req.body?.discountTotal || 0))'));
});

test('quick-commerce coupon discount is recomputed from server coupon fields', () => {
  for (const expected of [
    'const coupons = await getQuickCoupons()',
    "String(c.code || '').toUpperCase() === couponCode.toUpperCase()",
    'coupon.isActive === false',
    'const minOrder = Number(coupon.minOrderValue || coupon.minOrder || 0)',
    "const discountType = String(coupon.discountType || 'flat').toLowerCase()",
    'const discountValue = Math.max(0, Number(coupon.discountValue || coupon.discount || 0))',
    'const maxDiscount = Math.max(0, Number(coupon.maxDiscount || coupon.maxDiscountValue || 0))',
    "discountType === 'percent' || discountType === 'percentage'",
    'Math.min(Math.max(0, discountAmount), safeSubtotal)',
  ]) {
    assert.ok(orderController.includes(expected), `${expected} should be present`);
  }
});

test('quick-commerce order stores applied coupon code only after server validation', () => {
  assert.ok(orderController.includes('...(appliedCoupon ? { couponCode: appliedCoupon.code } : {})'));
  assert.ok(orderController.includes('const { pricing } = await calculateQuickPricing'));
  assert.ok(orderController.includes('payment: {'));
  assert.ok(orderController.includes('amountDue: Math.max(0, total)'));
});

test('quick-commerce checkout sends coupon code for server-side validation', () => {
  assert.ok(checkoutPage.includes('discountTotal: discountAmount'));
  assert.ok(checkoutPage.includes('couponCode: selectedCoupon?.code || null'));
});