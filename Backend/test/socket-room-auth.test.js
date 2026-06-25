import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const socketConfig = readFileSync(new URL('../src/config/socket.js', import.meta.url), 'utf8');

test('socket tracking rooms use order ownership authorization', () => {
  assert.ok(socketConfig.includes("import { FoodOrder } from '../modules/food/orders/models/order.model.js';"));
  assert.ok(socketConfig.includes('async function canAccessTrackingRoom(socket, orderId)'));
  assert.ok(socketConfig.includes("if (role === 'ADMIN' || role === 'SUB_ADMIN') return true"));
  assert.ok(socketConfig.includes("if (role === 'USER') return sameId(order.userId, userId)"));
  assert.ok(socketConfig.includes("if (role === 'RESTAURANT') return sameId(order.restaurantId, userId)"));
  assert.ok(socketConfig.includes("if (role === 'DELIVERY_PARTNER') return sameId(order.dispatch?.deliveryPartnerId, userId)"));
  assert.ok(socketConfig.includes("if (role === 'SELLER') return orderHasSeller(order, userId)"));
  assert.ok(socketConfig.includes("const query = isValidObjectId(id) ? { $or: [{ _id: id }, { orderId: id }] } : { orderId: id }"));
});

test('tracking join event names are preserved but gated by ownership checks', () => {
  assert.ok(socketConfig.includes("socket.on('join-tracking', async (orderId) =>"));
  assert.ok(socketConfig.includes("socket.on('join_order', async (orderId) =>"));

  for (const marker of ["socket.on('join-tracking'", "socket.on('join_order'"]) {
    const index = socketConfig.indexOf(marker);
    assert.notEqual(index, -1, `${marker} should exist`);
    const block = socketConfig.slice(index, socketConfig.indexOf("});", index) + 3);
    assert.ok(block.includes('await canAccessTrackingRoom(socket, orderId)'), `${marker} should check ownership`);
    assert.ok(block.includes("socket.emit('tracking-room-joined', { room, orderId: String(orderId) })"), `${marker} should keep response event`);
  }
});

test('existing restaurant and delivery private room ownership checks remain in place', () => {
  assert.ok(socketConfig.includes("socket.on('join-restaurant', (restaurantId) =>"));
  assert.ok(socketConfig.includes("if (String(socket.user?.userId) !== String(restaurantId)) return"));
  assert.ok(socketConfig.includes("socket.on('join-delivery', (deliveryPartnerId) =>"));
  assert.ok(socketConfig.includes("if (String(socket.user?.userId) !== String(deliveryPartnerId))"));
});