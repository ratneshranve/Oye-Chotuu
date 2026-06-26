import { QuickSellerCommission } from '../models/sellerCommission.model.js';
import { SellerProduct } from '../../seller/models/sellerProduct.model.js';

const SELLER_COMMISSION_CACHE_MS = 60 * 1000;
let sellerCommissionRulesCache = null;
let sellerCommissionRulesLoadedAt = 0;

async function getActiveSellerCommissionRules() {
  const now = Date.now();
  if (
    sellerCommissionRulesCache &&
    now - sellerCommissionRulesLoadedAt < SELLER_COMMISSION_CACHE_MS
  ) {
    return sellerCommissionRulesCache;
  }

  const list = await QuickSellerCommission.find({
    status: { $ne: false },
  }).lean();
  sellerCommissionRulesCache = list || [];
  sellerCommissionRulesLoadedAt = now;
  return sellerCommissionRulesCache;
}

export function computeSellerCommissionAmount(baseAmount, rule) {
  const safeBase = Math.max(0, Number(baseAmount) || 0);
  if (!Number.isFinite(safeBase) || safeBase < 0) return 0;

  const commissionType = rule?.defaultCommission?.type || 'percentage';
  const commissionValue = Math.max(
    0,
    Number(rule?.defaultCommission?.value ?? 0) || 0
  );

  let commissionAmount = 0;
  if (commissionType === 'percentage') {
    commissionAmount = safeBase * (commissionValue / 100);
  } else if (commissionType === 'amount') {
    commissionAmount = commissionValue;
  }

  // Round to 2 decimals and clamp to [0, base]
  commissionAmount = Math.round((commissionAmount || 0) * 100) / 100;
  commissionAmount = Math.max(0, Math.min(commissionAmount, safeBase));

  return { commissionAmount, commissionType, commissionValue, baseAmount: safeBase };
}

/**
 * Compute commission from a product's own commission fields.
 * Returns null if the product has no commission override (value <= 0).
 */
export function computeProductCommissionAmount(baseAmount, product) {
  const commissionValue = Number(product?.commission?.value ?? 0);
  if (!commissionValue || commissionValue <= 0) return null;

  const safeBase = Math.max(0, Number(baseAmount) || 0);
  const commissionType = product?.commission?.type || 'percentage';

  let commissionAmount = 0;
  if (commissionType === 'percentage') {
    commissionAmount = safeBase * (commissionValue / 100);
  } else if (commissionType === 'amount') {
    commissionAmount = commissionValue;
  }

  commissionAmount = Math.round((commissionAmount || 0) * 100) / 100;
  commissionAmount = Math.max(0, Math.min(commissionAmount, safeBase));

  return { commissionAmount, commissionType, commissionValue, baseAmount: safeBase };
}

export async function getSellerCommissionSnapshot(sellerId, baseAmount) {
  if (!sellerId) {
    return {
      commissionAmount: 0,
      commissionType: 'percentage',
      commissionValue: 0,
      baseAmount,
    };
  }

  const rules = await getActiveSellerCommissionRules();
  const rule = rules.find((r) => String(r.sellerId) === String(sellerId)) || null;

  if (!rule) {
    return {
      commissionAmount: 0,
      commissionType: 'percentage',
      commissionValue: 0,
      baseAmount,
    };
  }

  return computeSellerCommissionAmount(baseAmount, rule);
}

/**
 * Get the commission for a single order item.
 * Priority: product commission (if set) > seller commission (fallback).
 */
export async function getItemCommissionSnapshot(sellerId, productId, itemTotal) {
  // 1. Try product-level commission
  if (productId) {
    try {
      const product = await SellerProduct.findById(productId)
        .select('commission')
        .lean();
      if (product) {
        const productResult = computeProductCommissionAmount(itemTotal, product);
        if (productResult) {
          return { ...productResult, source: 'product' };
        }
      }
    } catch (_) {
      // Ignore lookup errors, fall through to seller commission
    }
  }

  // 2. Fallback to seller-level commission
  const sellerResult = await getSellerCommissionSnapshot(sellerId, itemTotal);
  return { ...sellerResult, source: 'seller' };
}
