import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const returnService = readFileSync(new URL('../src/modules/quick-commerce/services/return.service.js', import.meta.url), 'utf8');
const returnRoutes = readFileSync(new URL('../src/modules/quick-commerce/routes/return.routes.js', import.meta.url), 'utf8');
const returnController = readFileSync(new URL('../src/modules/quick-commerce/controllers/return.controller.js', import.meta.url), 'utf8');

test('quick return creation route is user-authenticated', () => {
  assert.ok(returnRoutes.includes("router.post('/user/returns', requireAuth, requireRoles('USER'), returnController.createReturnRequest)"));
  assert.ok(returnController.includes('const userId = req.user.userId'));
  assert.ok(returnController.includes('returnService.createReturnRequest(userId, req.body, settings.returnWindowDays)'));
});

test('quick return eligibility validates authenticated order ownership', () => {
  assert.ok(returnService.includes("const sameId = (left, right) => String(left || '') === String(right || '')"));
  assert.ok(returnService.includes('export const validateReturnEligibility = async (orderId, productId, returnQuantity, returnWindowDays, userId = null)'));
  assert.ok(returnService.includes('if (userId && !sameId(order.userId, userId))'));
  assert.ok(returnService.includes("throw new Error('Not authorized to create a return for this order')"));
});

test('quick return creation passes authenticated user id into eligibility validation', () => {
  assert.ok(returnService.includes('validateReturnEligibility(orderId, productId, quantity, returnWindowDays, userId)'));
  assert.ok(!returnService.includes('validateReturnEligibility(orderId, productId, quantity, returnWindowDays);'));
});