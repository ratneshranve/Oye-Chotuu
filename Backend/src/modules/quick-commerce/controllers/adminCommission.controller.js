import { QuickSellerCommission } from '../admin/models/sellerCommission.model.js';
import { Seller } from '../seller/models/seller.model.js';
import mongoose from 'mongoose';

export const getSellerCommissionBootstrap = async (req, res) => {
    try {
        const [commissions, sellers] = await Promise.all([
            QuickSellerCommission.find({}).lean(),
            Seller.find({ approved: true }).select('_id name shopName').lean()
        ]);

        // Map commission to include seller details for UI
        const mappedCommissions = commissions.map((comm, index) => {
            const seller = sellers.find(s => String(s._id) === String(comm.sellerId));
            return {
                ...comm,
                sl: index + 1,
                sellerName: seller?.shopName || seller?.name || 'Unknown Seller',
                sellerIdDisplay: String(comm.sellerId).slice(-6).toUpperCase()
            };
        });

        // Identify sellers that don't have a commission setup yet
        const setupSellerIds = new Set(commissions.map(c => String(c.sellerId)));
        const availableSellers = sellers.map(s => ({
            ...s,
            hasCommissionSetup: setupSellerIds.has(String(s._id))
        }));

        return res.json({
            success: true,
            data: {
                commissions: mappedCommissions,
                sellers: availableSellers
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getSellerCommissions = async (req, res) => {
    try {
        const commissions = await QuickSellerCommission.find({}).lean();
        return res.json({ success: true, data: { commissions } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const getSellerCommissionById = async (req, res) => {
    try {
        const commission = await QuickSellerCommission.findById(req.params.id).lean();
        if (!commission) return res.status(404).json({ success: false, message: 'Commission rule not found' });
        
        const seller = await Seller.findById(commission.sellerId).select('_id name shopName').lean();
        return res.json({ success: true, data: { commission: { ...commission, seller } } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const createSellerCommission = async (req, res) => {
    try {
        const { sellerId, defaultCommission, notes } = req.body;
        
        const existing = await QuickSellerCommission.findOne({ sellerId });
        if (existing) return res.status(400).json({ success: false, message: 'Commission rule already exists for this seller' });

        const commission = await QuickSellerCommission.create({
            sellerId,
            defaultCommission,
            notes
        });

        return res.status(201).json({ success: true, data: { commission } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const updateSellerCommission = async (req, res) => {
    try {
        const { defaultCommission, notes, status } = req.body;
        const commission = await QuickSellerCommission.findByIdAndUpdate(
            req.params.id,
            { $set: { defaultCommission, notes, status } },
            { new: true }
        );
        if (!commission) return res.status(404).json({ success: false, message: 'Commission rule not found' });
        return res.json({ success: true, data: { commission } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const deleteSellerCommission = async (req, res) => {
    try {
        await QuickSellerCommission.findByIdAndDelete(req.params.id);
        return res.json({ success: true, message: 'Commission rule deleted' });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

export const toggleSellerCommissionStatus = async (req, res) => {
    try {
        const commission = await QuickSellerCommission.findById(req.params.id);
        if (!commission) return res.status(404).json({ success: false, message: 'Commission rule not found' });
        
        commission.status = !commission.status;
        await commission.save();
        
        return res.json({ success: true, data: { status: commission.status } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Get all products for a seller with their commission info */
export const getSellerProductCommissions = async (req, res) => {
    try {
        const { sellerId } = req.params;
        const SellerProduct = (await import('../seller/models/sellerProduct.model.js')).SellerProduct;

        const products = await SellerProduct.find({ sellerId })
            .select('_id name price salePrice mainImage status commission')
            .sort({ createdAt: -1 })
            .lean();

        const sellerCommission = await QuickSellerCommission.findOne({ sellerId, status: { $ne: false } }).lean();

        return res.json({
            success: true,
            data: {
                products: products.map((p, i) => ({
                    ...p,
                    sl: i + 1,
                    hasProductCommission: Boolean(p.commission?.value > 0),
                    commissionType: p.commission?.type || 'percentage',
                    commissionValue: p.commission?.value || 0,
                })),
                sellerCommission: sellerCommission?.defaultCommission || null,
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Update commission on a specific seller product */
export const updateProductCommission = async (req, res) => {
    try {
        const { productId } = req.params;
        const { commissionType, commissionValue } = req.body;
        const SellerProduct = (await import('../seller/models/sellerProduct.model.js')).SellerProduct;

        const product = await SellerProduct.findById(productId);
        if (!product) return res.status(404).json({ success: false, message: 'Product not found' });

        product.commission = {
            type: ['percentage', 'amount'].includes(commissionType) ? commissionType : 'percentage',
            value: Math.max(0, Number(commissionValue) || 0),
        };
        await product.save();

        return res.json({
            success: true,
            data: {
                product: {
                    _id: product._id,
                    name: product.name,
                    commission: product.commission,
                }
            }
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

/** Bulk update commission on multiple seller products */
export const bulkUpdateProductCommission = async (req, res) => {
    try {
        const { products } = req.body; // [{ productId, commissionType, commissionValue }]
        if (!Array.isArray(products) || products.length === 0) {
            return res.status(400).json({ success: false, message: 'products array is required' });
        }

        const SellerProduct = (await import('../seller/models/sellerProduct.model.js')).SellerProduct;

        const results = await Promise.all(
            products.map(async ({ productId, commissionType, commissionValue }) => {
                const product = await SellerProduct.findById(productId);
                if (!product) return { productId, success: false, message: 'Not found' };

                product.commission = {
                    type: ['percentage', 'amount'].includes(commissionType) ? commissionType : 'percentage',
                    value: Math.max(0, Number(commissionValue) || 0),
                };
                await product.save();
                return { productId, success: true, commission: product.commission };
            })
        );

        return res.json({ success: true, data: { results } });
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};
