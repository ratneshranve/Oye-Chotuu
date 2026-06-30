import crypto from 'crypto';
import mongoose from 'mongoose';
import { FoodOrder } from '../../../modules/food/orders/models/order.model.js';
import { FoodTransaction } from '../../../modules/food/orders/models/foodTransaction.model.js';
import * as foodTransactionService from '../../../modules/food/orders/services/foodTransaction.service.js';
import { config } from '../../../config/env.js';
import { logger } from '../../../utils/logger.js';

/**
 * ✅ NEW: Centralized Razorpay Webhook Handler (Core Layer)
 * Manages atomic updates for order payments and refunds across all modules.
 */
export const handleRazorpayWebhook = async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = config.razorpayWebhookSecret;

    // 1. Verify Signature using raw body buffer
    if (!signature || !secret || !req.rawBody) {
        logger.warn('Razorpay Webhook: Missing signature or rawBody buffer.');
        return res.status(400).send('Invalid signature');
    }

    const expected = crypto
        .createHmac('sha256', secret)
        .update(req.rawBody)
        .digest('hex');

    if (expected !== signature) {
        logger.warn('Razorpay Webhook: Signature verification failed.');
        return res.status(400).send('Invalid signature');
    }

    const { event, payload } = req.body;
    logger.info(`Razorpay Webhook Received: ${event}`);

    try {
        // --- 🟢 Handle Payment Captured (Success) ---
        if (event === 'payment.captured') {
            const paymentObj = payload.payment.entity;
            const rzOrderId = paymentObj.order_id;
            const rzPaymentId = paymentObj.id;
            const notes = paymentObj.notes || {};
            const qrId = paymentObj.qr_code_id || paymentObj.receiver_id || paymentObj.qr_code?.id || paymentObj.receiver?.id || '';
            const noteOrderId = notes.foodOrderId || notes.orderId || notes.food_order_id || '';

            let order = null;

            if (rzOrderId) {
                order = await FoodOrder.findOneAndUpdate(
                    {
                        "payment.razorpay.orderId": rzOrderId,
                        "payment.status": { $ne: 'paid' }
                    },
                    {
                        $set: {
                            "payment.status": 'paid',
                            "payment.razorpay.paymentId": rzPaymentId
                        }
                    },
                    { new: true }
                );
            }

            if (!order) {
                const dynamicQrFilters = [];
                if (noteOrderId && mongoose.Types.ObjectId.isValid(String(noteOrderId))) {
                    dynamicQrFilters.push({ _id: new mongoose.Types.ObjectId(String(noteOrderId)) });
                }
                if (noteOrderId) dynamicQrFilters.push({ orderId: String(noteOrderId) });
                if (qrId) dynamicQrFilters.push({ "payment.qr.qrId": String(qrId) });

                for (const filter of dynamicQrFilters) {
                    order = await FoodOrder.findOneAndUpdate(
                        {
                            ...filter,
                            "payment.status": { $ne: 'paid' }
                        },
                        {
                            $set: {
                                "payment.status": 'paid',
                                "payment.razorpay.paymentId": rzPaymentId,
                                "payment.qr.status": 'paid',
                                ...(qrId ? { "payment.qr.qrId": String(qrId) } : {})
                            }
                        },
                        { new: true }
                    );
                    if (order) break;
                }
            }

            if (!order && (qrId || noteOrderId)) {
                const txFilters = [];
                if (qrId) txFilters.push({ "payment.qr.qrId": String(qrId) });
                if (noteOrderId && mongoose.Types.ObjectId.isValid(String(noteOrderId))) {
                    txFilters.push({ orderId: new mongoose.Types.ObjectId(String(noteOrderId)) });
                }

                let tx = null;
                for (const filter of txFilters) {
                    tx = await FoodTransaction.findOne(filter).lean();
                    if (tx) break;
                }

                if (tx?.orderId) {
                    order = await FoodOrder.findOneAndUpdate(
                        {
                            _id: tx.orderId,
                            "payment.status": { $ne: 'paid' }
                        },
                        {
                            $set: {
                                "payment.status": 'paid',
                                "payment.razorpay.paymentId": rzPaymentId,
                                "payment.qr.status": 'paid',
                                ...(qrId ? { "payment.qr.qrId": String(qrId) } : {})
                            }
                        },
                        { new: true }
                    ) || await FoodOrder.findById(tx.orderId);
                }
            }

            if (order) {
                try {
                    await FoodTransaction.updateOne(
                        { orderId: order._id },
                        {
                            $set: {
                                status: 'captured',
                                'payment.status': 'paid',
                                'payment.razorpay.paymentId': rzPaymentId,
                                'payment.qr.status': 'paid',
                                ...(qrId ? { 'payment.qr.qrId': String(qrId) } : {}),
                                'gateway.razorpayPaymentId': rzPaymentId
                            }
                        }
                    );
                    await foodTransactionService.updateTransactionStatus(order._id, 'captured', {
                        status: 'captured',
                        razorpayPaymentId: rzPaymentId,
                        note: 'Payment status synced via Webhook (payment.captured)'
                    });
                } catch (ledgerErr) {
                    logger.error(`Webhook Ledger Error (Order ${order.orderId}): ${ledgerErr.message}`);
                }
                logger.info(`Webhook [payment.captured]: Synced Order ${order.orderId} (Status=paid)`);
            } else {
                logger.warn(`Webhook [payment.captured]: Order not found or already paid for RZ-Order: ${rzOrderId || 'n/a'}, QR: ${qrId || 'n/a'}`);
            }
        }
        // --- 🔴 Handle Refund Processed ---
        if (event === 'refund.processed') {
            const refundObj = payload.refund.entity;
            const rzPaymentId = refundObj.payment_id;
            const rzRefundId = refundObj.id;
            const refundAmount = refundObj.amount / 100; // to major unit

            // Sync refund fields in the order
            const order = await FoodOrder.findOneAndUpdate(
                { 
                    "payment.razorpay.paymentId": rzPaymentId,
                    "payment.refund.status": { $ne: 'processed' }
                },
                { 
                    $set: { 
                        "payment.status": 'refunded',
                        "payment.refund": {
                            status: 'processed',
                            amount: refundAmount,
                            refundId: rzRefundId,
                            processedAt: new Date()
                        }
                    } 
                },
                { new: true }
            );

            if (order) {
                logger.info(`Webhook [refund.processed]: Synced Order ${order.orderId} (Refunded)`);
            } else {
                // ✅ ADDED: Log warn if order not found for refund
                logger.warn(`Webhook [refund.processed]: Order not found or already refunded for RZ-Payment: ${rzPaymentId}`);
            }
        }

        res.status(200).json({ status: 'ok' });
    } catch (err) {
        logger.error(`Razorpay Webhook Logic Error: ${err.message}`);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};

