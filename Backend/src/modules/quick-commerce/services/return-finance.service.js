import { SellerTransaction } from '../seller/models/sellerTransaction.model.js';
import { FoodDeliveryWallet } from '../../food/delivery/models/deliveryWallet.model.js';
import { Transaction } from '../../../core/payments/models/transaction.model.js';

/**
 * Calculates the exact deductions for a specific returned item.
 * @param {Object} order The original QuickOrder
 * @param {Object} product The product being returned from order items
 * @param {Number} returnQuantity The quantity being returned
 */
export const calculateReturnDeductions = (order, product, returnQuantity) => {
  const targetProductId = (product?._id || product?.itemId || product?.productId || product)?.toString();
  
  const orderItem = order.items?.find(item => 
    (item.itemId && item.itemId.toString() === targetProductId) ||
    (item.productId && item.productId.toString() === targetProductId) ||
    (item.product && item.product.toString() === targetProductId)
  );
  
  if (!orderItem) {
    return {
      productValue: 0,
      sellerDeduction: 0,
      adminDeduction: 0,
    };
  }

  // Calculate the per-item value
  const unitPrice = orderItem.price || 0;
  const unitCommission = orderItem.commission || 0; // if commission is per item
  
  const productValue = unitPrice * returnQuantity;
  
  // Calculate seller earning deduction: what the seller originally earned for these specific items
  // Assuming seller earning = (price * qty) - commission
  // We need to approximate if commission is at order level, but if it's at item level it's easier.
  // For safety, let's use a proportional deduction if order-level commission is used.
  let sellerDeduction = productValue;
  if (order.pricing && order.pricing.restaurantCommission) {
    // Proportional commission
    const itemRatio = productValue / (order.pricing.subtotal || 1);
    const proportionalCommission = order.pricing.restaurantCommission * itemRatio;
    sellerDeduction = productValue - proportionalCommission;
  }
  
  // Admin deduction: what the admin originally earned for these specific items
  // Assuming admin earning = commission - discounts? Just roughly the proportional commission
  let adminDeduction = 0;
  if (order.pricing && order.pricing.restaurantCommission) {
    const itemRatio = productValue / (order.pricing.subtotal || 1);
    adminDeduction = order.pricing.restaurantCommission * itemRatio;
  }

  return {
    productValue,
    sellerDeduction,
    adminDeduction
  };
};

/**
 * Processes the financial deductions when a return is completed (Received by Seller).
 */
export const processReturnDeductions = async (returnRequest, adminId = 'SYSTEM') => {
  if (!returnRequest.sellerEarningDeduction) return;

  // 1. Deduct from Seller using SellerTransaction
  await SellerTransaction.create({
    sellerId: returnRequest.sellerId,
    type: 'Debit',
    category: 'Return_Deduction',
    amount: -Math.abs(returnRequest.sellerEarningDeduction),
    status: 'Settled',
    orderId: returnRequest.orderId.toString(),
    reference: returnRequest._id.toString(),
    adminNote: `Deduction for Returned Product: ${returnRequest.productId}`,
    processedAt: new Date()
  });

  // For Admin Transaction, we might call the core payments transaction service if needed.
  // Currently skipping explicit admin wallet debit as admin profit is often calculated dynamically, 
  // but if needed, we can log an admin transaction.
};

/**
 * Calculates delivery earning for return pickup based on distance.
 */
export const calculateReturnDeliveryEarning = (distanceKm) => {
  const baseCharge = 20;
  const perKmCharge = 5;
  let earning = baseCharge;
  if (distanceKm > 2) {
    earning += (distanceKm - 2) * perKmCharge;
  }
  return earning;
};

/**
 * Credits the return delivery partner.
 */
export const creditReturnDeliveryPartner = async (returnRequest) => {
  if (!returnRequest.deliveryPartnerId || !returnRequest.returnPickupEarning) return;

  const amount = returnRequest.returnPickupEarning;
  
  let wallet = await FoodDeliveryWallet.findOne({ deliveryPartnerId: returnRequest.deliveryPartnerId });
  if (!wallet) {
    wallet = new FoodDeliveryWallet({
      deliveryPartnerId: returnRequest.deliveryPartnerId,
      balance: 0,
      lockedAmount: 0,
      cashInHand: 0,
      status: 'active'
    });
  }

  wallet.balance += amount;
  await wallet.save();

  await Transaction.create({
    entityId: returnRequest.deliveryPartnerId,
    entityType: 'deliveryBoy',
    type: 'credit',
    amount: amount,
    balanceAfter: wallet.balance,
    reference: returnRequest._id.toString(),
    orderId: returnRequest.orderId.toString(),
    description: `Earnings for Return Pickup: ${returnRequest._id}`,
    category: 'delivery_earning',
    module: 'quickCommerce',
    status: 'completed'
  });
};
