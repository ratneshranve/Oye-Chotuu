import crypto from 'crypto';

import Razorpay from 'razorpay';

import { config } from '../../../../config/env.js';

const KEY_ID = config.razorpayKeyId || process.env.RAZORPAY_KEY_ID || '';
const KEY_SECRET = config.razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET || '';

export function isRazorpayConfigured() {
    return Boolean(KEY_ID && KEY_SECRET && Razorpay);
}

export function getRazorpayKeyId() {
    return KEY_ID;
}

export function getRazorpayInstance() {
    if (!isRazorpayConfigured()) return null;
    return new Razorpay({ key_id: KEY_ID, key_secret: KEY_SECRET });
}

export function createRazorpayOrder(amountPaise, currency = 'INR', receipt = '') {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    return instance.orders.create({
        amount: Math.round(amountPaise),
        currency,
        receipt: receipt || undefined
    });
}

export function createPaymentLink({ amountPaise, currency = 'INR', description, orderId, customerName, customerEmail, customerPhone }) {
    const instance = getRazorpayInstance();
    if (!instance) return Promise.reject(new Error('Razorpay not configured'));
    return instance.paymentLink.create({
        amount: Math.round(amountPaise),
        currency,
        description: description || `Order ${orderId}`,
        customer: {
            name: customerName || 'Customer',
            email: customerEmail || 'customer@example.com',
            contact: customerPhone ? String(customerPhone).replace(/\D/g, '').slice(-10) : '9999999999'
        }
    });
}

export async function createDynamicQrCode({ amountPaise, description, orderId, customerName, customerPhone, closeBy }) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    const orderRef = String(orderId || '').trim();
    const nowSeconds = Math.floor(Date.now() / 1000);
    const closeBySeconds = Number(closeBy) || (nowSeconds + 30 * 60);
    const body = {
        type: 'upi_qr',
        name: customerName ? `${customerName} - ${orderRef}`.slice(0, 40) : `Order ${orderRef}`.slice(0, 40),
        usage: 'single_use',
        fixed_amount: true,
        payment_amount: Math.round(amountPaise),
        description: description || `Order ${orderRef}`,
        close_by: closeBySeconds,
        notes: {
            foodOrderId: orderRef,
            orderId: orderRef,
            purpose: 'delivery_cod_collect',
            customerPhone: customerPhone ? String(customerPhone).replace(/\D/g, '').slice(-10) : ''
        }
    };

    try {
        return await instance.qrCode.create(body);
    } catch (error) {
        const message = error?.error?.description || error?.description || error?.message;
        throw new Error(message || 'Razorpay dynamic QR creation failed');
    }
}

export async function fetchDynamicQrCode(qrCodeId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!qrCodeId) throw new Error('qrCodeId is required');

    try {
        return await instance.qrCode.fetch(String(qrCodeId));
    } catch (error) {
        const message = error?.error?.description || error?.description || error?.message;
        throw new Error(message || 'Razorpay dynamic QR fetch failed');
    }
}
export function verifyPaymentSignature(orderId, paymentId, signature) {
    if (!KEY_SECRET) return false;
    const body = `${orderId}|${paymentId}`;
    const expected = crypto.createHmac('sha256', KEY_SECRET).update(body).digest('hex');
    return expected === signature;
}

/**
 * Fetch Razorpay payment (server-side) for additional validation (amount/status/order match).
 * @param {string} paymentId
 */
export async function fetchRazorpayPayment(paymentId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!paymentId) throw new Error('paymentId is required');
    return instance.payments.fetch(String(paymentId));
}

/**
 * Fetch Razorpay payment-link to check status (used for Razorpay QR auto verification).
 * @param {string} paymentLinkId
 */
export async function fetchRazorpayPaymentLink(paymentLinkId) {
    const instance = getRazorpayInstance();
    if (!instance) throw new Error('Razorpay not configured');
    if (!paymentLinkId) throw new Error('paymentLinkId is required');
    return instance.paymentLink.fetch(String(paymentLinkId));
}

/**
 * ✅ NEW: Initiate a refund for a successful payment.
 * NON-BREAKING Extension for automated cancellation refunds.
 * @param {string} paymentId - Original Razorpay payment_id (captured)
 * @param {number} amount - Amount to refund (in major unit, e.g., INR 123.45)
 */
export async function initiateRazorpayRefund(paymentId, amount) {
    if (!isRazorpayConfigured()) {
        throw new Error('Razorpay is not configured on this server');
    }
    
    try {
        const auth = Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString('base64');
        const response = await fetch(`https://api.razorpay.com/v1/payments/${paymentId}/refund`, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                amount: Math.round(Number(amount) * 100), // convert to paise
                notes: {
                    reason: 'Order cancelled by system flow'
                }
            })
        });

        const refund = await response.json();

        if (!response.ok) {
            throw new Error(refund.error?.description || 'Razorpay refund failed');
        }

        return {
            success: true,
            refundId: refund.id,
            status: refund.status || 'processed',
            raw: refund
        };
    } catch (err) {
        console.error(`Razorpay Refund API Failure [PaymentId: ${paymentId}]:`, err?.message || err);
        return {
            success: false,
            error: err?.message || 'Razorpay refund API error',
            status: 'failed'
        };
    }
}

