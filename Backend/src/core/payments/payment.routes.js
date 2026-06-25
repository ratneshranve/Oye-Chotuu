import express from 'express';
import {
    getPaymentHistoryController,
    getOrderTransactionsController,
    getUserWalletBalanceController,
    getUserWalletTransactionsController,
    getRestaurantWalletController,
    getDeliveryWalletController,
    getAdminWalletController,
    getAdminFinanceSummaryController,
    listSettlementsController,
    createSettlementController,
    processSettlementController,
    listRefundsController,
    getRefundsByOrderController
} from './payment.controller.js';
import { requireRoles } from '../roles/role.middleware.js';

const router = express.Router();
const userOnly = [requireRoles('USER')];
const restaurantWalletAccess = [requireRoles('RESTAURANT', 'ADMIN', 'SUB_ADMIN')];
const deliveryWalletAccess = [requireRoles('DELIVERY_PARTNER', 'ADMIN', 'SUB_ADMIN')];
const adminOnly = [requireRoles('ADMIN', 'SUB_ADMIN')];

// ─── Payment history for an order (user sees their payment trail) ───
router.get('/orders/:orderId/payments', getPaymentHistoryController);
router.get('/orders/:orderId/transactions', getOrderTransactionsController);
router.get('/orders/:orderId/refunds', getRefundsByOrderController);

// ─── User wallet (new transaction-based endpoints) ───
router.get('/wallet/balance', ...userOnly, getUserWalletBalanceController);
router.get('/wallet/transactions', ...userOnly, getUserWalletTransactionsController);

// ─── Restaurant wallet ───
router.get('/restaurant/:restaurantId/wallet', ...restaurantWalletAccess, getRestaurantWalletController);

// ─── Delivery partner wallet ───
router.get('/delivery/:deliveryPartnerId/wallet', ...deliveryWalletAccess, getDeliveryWalletController);

// ─── Admin / Finance ───
router.get('/admin/wallet', ...adminOnly, getAdminWalletController);
router.get('/admin/finance/summary', ...adminOnly, getAdminFinanceSummaryController);
router.get('/admin/settlements', ...adminOnly, listSettlementsController);
router.post('/admin/settlements', ...adminOnly, createSettlementController);
router.post('/admin/settlements/:id/process', ...adminOnly, processSettlementController);
router.get('/admin/refunds', ...adminOnly, listRefundsController);

export default router;
