import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const fcmRoutes = readFileSync(new URL('../src/core/notifications/fcm.routes.js', import.meta.url), 'utf8');

test('phone-based FCM test endpoints require admin authorization', () => {
  assert.ok(fcmRoutes.includes("import { authMiddleware } from '../auth/auth.middleware.js';"));
  assert.ok(fcmRoutes.includes("import { requireRoles } from '../roles/role.middleware.js';"));
  assert.ok(fcmRoutes.includes("const adminOnly = [authMiddleware, requireRoles('ADMIN', 'SUB_ADMIN')]"));
  assert.ok(fcmRoutes.includes("router.get('/test-set-token/:phone/:token', ...adminOnly, async"));
  assert.ok(fcmRoutes.includes("router.get('/test-get-token/:phone', ...adminOnly, async"));
});

test('public FCM health check does not advertise phone-based admin test routes', () => {
  const checkRouteStart = fcmRoutes.indexOf("router.get('/check'");
  const checkRouteEnd = fcmRoutes.indexOf('// Temporary administrative test route to set token by phone');
  assert.notEqual(checkRouteStart, -1);
  assert.notEqual(checkRouteEnd, -1);

  const checkRoute = fcmRoutes.slice(checkRouteStart, checkRouteEnd);
  assert.ok(checkRoute.includes("endpoints: ['/save', '/mobile/save', '/remove', '/test']"));
  assert.ok(!checkRoute.includes('/test-set-token/:phone/:token'));
  assert.ok(!checkRoute.includes('/test-get-token/:phone'));
});

test('normal authenticated FCM routes keep existing auth behavior', () => {
  assert.ok(fcmRoutes.includes("router.post('/save', authMiddleware, async"));
  assert.ok(fcmRoutes.includes("router.post('/mobile/save', authMiddleware, async"));
  assert.ok(fcmRoutes.includes("router.delete('/remove', authMiddleware, handleRemoveToken)"));
  assert.ok(fcmRoutes.includes("router.delete('/remove/:token', authMiddleware, handleRemoveToken)"));
  assert.ok(fcmRoutes.includes("router.post('/test', authMiddleware, async"));
});