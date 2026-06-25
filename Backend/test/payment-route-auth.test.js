import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const paymentRoutes = read('../src/core/payments/payment.routes.js');
const paymentController = read('../src/core/payments/payment.controller.js');

test('payment finance routes have role-based route guards', () => {
  assert.ok(paymentRoutes.includes("import { requireRoles } from '../roles/role.middleware.js';"));
  assert.ok(paymentRoutes.includes("const userOnly = [requireRoles('USER')]"));
  assert.ok(paymentRoutes.includes("const restaurantWalletAccess = [requireRoles('RESTAURANT', 'ADMIN', 'SUB_ADMIN')]"));
  assert.ok(paymentRoutes.includes("const deliveryWalletAccess = [requireRoles('DELIVERY_PARTNER', 'ADMIN', 'SUB_ADMIN')]"));
  assert.ok(paymentRoutes.includes("const adminOnly = [requireRoles('ADMIN', 'SUB_ADMIN')]"));

  for (const route of [
    "router.get('/wallet/balance', ...userOnly, getUserWalletBalanceController)",
    "router.get('/wallet/transactions', ...userOnly, getUserWalletTransactionsController)",
    "router.get('/restaurant/:restaurantId/wallet', ...restaurantWalletAccess, getRestaurantWalletController)",
    "router.get('/delivery/:deliveryPartnerId/wallet', ...deliveryWalletAccess, getDeliveryWalletController)",
    "router.get('/admin/wallet', ...adminOnly, getAdminWalletController)",
    "router.get('/admin/finance/summary', ...adminOnly, getAdminFinanceSummaryController)",
    "router.get('/admin/settlements', ...adminOnly, listSettlementsController)",
    "router.post('/admin/settlements', ...adminOnly, createSettlementController)",
    "router.post('/admin/settlements/:id/process', ...adminOnly, processSettlementController)",
    "router.get('/admin/refunds', ...adminOnly, listRefundsController)",
  ]) {
    assert.ok(paymentRoutes.includes(route), `${route} should be guarded`);
  }
});

test('order-linked payment history endpoints enforce order ownership before reading finance data', () => {
  assert.ok(paymentController.includes("import { sendResponse, sendError } from '../../utils/response.js';"));
  assert.ok(paymentController.includes("import { FoodOrder } from '../../modules/food/orders/models/order.model.js';"));
  assert.ok(paymentController.includes('const assertOrderPaymentAccess = async'));
  assert.ok(paymentController.includes("role === 'USER' && sameId(order.userId, actorId)"));
  assert.ok(paymentController.includes("role === 'RESTAURANT' && sameId(order.restaurantId, actorId)"));
  assert.ok(paymentController.includes("role === 'DELIVERY_PARTNER' && sameId(order.dispatch?.deliveryPartnerId, actorId)"));

  for (const serviceCall of [
    'const payments = await getPaymentsByOrder(orderId)',
    'const transactions = await getTransactionsByOrder(orderId)',
    'const refunds = await getRefundsByOrder(orderId)',
  ]) {
    const index = paymentController.indexOf(serviceCall);
    assert.notEqual(index, -1, `${serviceCall} should exist`);
    const previous = paymentController.slice(Math.max(0, index - 120), index);
    assert.ok(previous.includes('assertOrderPaymentAccess(req, res, orderId)'), `${serviceCall} should follow ownership check`);
  }
});

test('restaurant and delivery wallet controllers validate path ownership for non-admin roles', () => {
  assert.ok(paymentController.includes("const restaurantId = req.params.restaurantId"));
  assert.ok(paymentController.includes("assertEntityWalletAccess(req, res, restaurantId, 'RESTAURANT'"));
  assert.ok(paymentController.includes("const deliveryPartnerId = req.params.deliveryPartnerId"));
  assert.ok(paymentController.includes("assertEntityWalletAccess(req, res, deliveryPartnerId, 'DELIVERY_PARTNER'"));
});