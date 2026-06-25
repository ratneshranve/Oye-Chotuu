import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

test('financial models define sparse unique idempotency keys', () => {
    const models = [
        'Backend/src/core/payments/models/payment.model.js',
        'Backend/src/core/payments/models/refund.model.js',
        'Backend/src/core/payments/models/settlement.model.js',
        'Backend/src/core/payments/models/transaction.model.js'
    ];

    for (const modelPath of models) {
        const source = read(modelPath);
        assert.match(source, /idempotencyKey:\s*\{\s*type:\s*String,\s*trim:\s*true,\s*default:\s*''/u, `${modelPath} stores an optional idempotency key`);
        assert.match(source, /\.index\(\{\s*idempotencyKey:\s*1\s*\},\s*\{\s*unique:\s*true,\s*sparse:\s*true\s*\}\)/u, `${modelPath} enforces unique non-empty idempotency keys`);
    }
});

test('transaction service reuses idempotent transactions and handles duplicate key races', () => {
    const source = read('Backend/src/core/payments/transaction.service.js');

    assert.match(source, /normalizeIdempotencyKey/u);
    assert.match(source, /Transaction\.findOne\(\{\s*idempotencyKey:\s*normalizedIdempotencyKey\s*\}\)/u);
    assert.match(source, /idempotent:\s*true/u);
    assert.match(source, /idempotent:\s*false/u);
    assert.match(source, /err\?\.code\s*===\s*11000/u);
});

test('wallet helpers pass optional idempotency keys into transaction recording', () => {
    const source = read('Backend/src/core/payments/wallet.service.js');

    assert.match(source, /export async function creditWallet\(\{[\s\S]*idempotencyKey/u);
    assert.match(source, /export async function debitWallet\(\{[\s\S]*idempotencyKey/u);
    assert.match(source, /type:\s*'credit'[\s\S]*idempotencyKey/u);
    assert.match(source, /type:\s*'debit'[\s\S]*idempotencyKey/u);
});

test('payment creation is idempotent and wallet debit uses deterministic keys', () => {
    const source = read('Backend/src/core/payments/payment.service.js');

    assert.match(source, /Payment\.findOne\(\{\s*idempotencyKey:\s*normalizedIdempotencyKey\s*\}\)/u);
    assert.match(source, /err\?\.code\s*===\s*11000/u);
    assert.match(source, /idempotencyKey:\s*normalizedIdempotencyKey \|\| undefined/u);
    assert.match(source, /`\$\{normalizedIdempotencyKey\}:wallet-debit`/u);
    assert.match(source, /`wallet-payment:\$\{doc\._id\}`/u);
});

test('refund processing is idempotent across refund record, central wallet, and legacy wallet', () => {
    const source = read('Backend/src/core/payments/refund.service.js');

    assert.match(source, /initiateRefund\(\{[\s\S]*idempotencyKey/u);
    assert.match(source, /Refund\.findOne\(\{\s*idempotencyKey:\s*normalizedIdempotencyKey\s*\}\)/u);
    assert.match(source, /idempotencyKey:\s*normalizedIdempotencyKey \|\| undefined/u);
    assert.match(source, /`\$\{normalizedIdempotencyKey\}:wallet-credit`/u);
    assert.match(source, /`refund:\$\{refund\._id\}:wallet-credit`/u);
    assert.match(source, /metadata\?\.refundId/u);
    assert.match(source, /idempotencyKey:\s*`gateway-refund-fallback:\$\{refund\._id\}`/u);
});

test('settlement creation and processing are guarded against duplicate payouts', () => {
    const source = read('Backend/src/core/payments/settlement.service.js');
    const controller = read('Backend/src/core/payments/payment.controller.js');

    assert.match(source, /createSettlement\(\{[\s\S]*idempotencyKey/u);
    assert.match(source, /Settlement\.findOne\(\{\s*idempotencyKey:\s*normalizedIdempotencyKey\s*\}\)/u);
    assert.match(source, /err\?\.code\s*===\s*11000/u);
    assert.match(source, /Settlement\.findOneAndUpdate\(\s*\n\s*\{\s*_id:\s*settlementId,\s*status:\s*'pending'\s*\}/u);
    assert.match(source, /idempotencyKey:\s*`settlement:\$\{settlement\._id\}:payout`/u);
    assert.match(controller, /req\.get\?\.\('Idempotency-Key'\) \|\| bodyIdempotencyKey/u);
});

test('payment processor uses deterministic keys for retried financial jobs', () => {
    const source = read('Backend/src/queues/processors/payment.processor.js');

    assert.match(source, /findOrCreatePayment/u);
    assert.match(source, /delivery-completed:\$\{orderMongoId \|\| orderId\}:restaurant/u);
    assert.match(source, /delivery-completed:\$\{orderMongoId \|\| orderId\}:delivery/u);
    assert.match(source, /delivery-completed:\$\{orderMongoId \|\| orderId\}:platform/u);
    assert.match(source, /if \(!creditResult\?\.idempotent\)/u);
    assert.match(source, /order-cancelled:\$\{orderMongoId\}:\$\{paymentId\}/u);
    assert.match(source, /payment-verified:\$\{orderMongoId \|\| orderId\}/u);
});

test('delivery withdrawal debit uses deterministic idempotency key', () => {
    const source = read('Backend/src/modules/food/admin/services/admin.service.js');

    assert.match(source, /idempotencyKey:\s*`delivery-withdrawal:\$\{existing\._id\}:debit`/u);
});

