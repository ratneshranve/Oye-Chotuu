import { QuickReturnRequest } from '../models/ReturnRequest.model.js';
import { QuickReturnSettings } from '../models/ReturnSettings.model.js';
import { returnStatuses } from '../../../constants/returnStatuses.js';
import * as returnService from '../services/return.service.js';
import * as returnAssignmentService from '../services/return-assignment.service.js';
import * as returnFinanceService from '../services/return-finance.service.js';

// ---- User Controllers ----

export const createReturnRequest = async (req, res) => {
  try {
    const userId = req.user.userId;
    const settings = await QuickReturnSettings.findOne() || { returnWindowDays: 3 };
    
    const returnReq = await returnService.createReturnRequest(userId, req.body, settings.returnWindowDays);
    res.status(201).json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const getUserReturns = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { orderId } = req.params;
    const filter = { userId };
    if (orderId) filter.orderId = orderId;

    const returns = await QuickReturnRequest.find(filter)
      .populate('productId', 'name image price')
      .populate('sellerId', 'name shopName phone location')
      .sort({ createdAt: -1 });
    
    res.json({ success: true, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getUserReturnDetails = async (req, res) => {
  try {
    const { id } = req.params;
    const returnReq = await QuickReturnRequest.findOne({ _id: id, userId: req.user.userId })
      .populate('productId', 'name image price')
      .populate('sellerId', 'name shopName phone location')
      .populate('deliveryPartnerId', 'name phone');
    
    if (!returnReq) return res.status(404).json({ success: false, message: 'Return request not found' });
    
    // Hide OTP unless status is approved
    const responseData = returnReq.toObject();
    if (responseData.status === returnStatuses.RETURN_REQUESTED || responseData.status === returnStatuses.RETURN_REJECTED) {
      delete responseData.pickupOtp;
    }

    res.json({ success: true, returnRequest: responseData });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// ---- Admin Controllers ----

export const getAdminSettings = async (req, res) => {
  try {
    let settings = await QuickReturnSettings.findOne();
    if (!settings) {
      settings = await QuickReturnSettings.create({ returnWindowDays: 3 });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const updateAdminSettings = async (req, res) => {
  try {
    const { returnWindowDays } = req.body;
    let settings = await QuickReturnSettings.findOne();
    if (settings) {
      settings.returnWindowDays = returnWindowDays;
      await settings.save();
    } else {
      settings = await QuickReturnSettings.create({ returnWindowDays });
    }
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getAdminReturns = async (req, res) => {
  try {
    const returns = await QuickReturnRequest.find()
      .populate('orderId')
      .populate('productId', 'name image price')
      .populate('userId', 'name email phone')
      .populate('sellerId', 'name shopName phone location')
      .populate('deliveryPartnerId', 'name phone')
      .sort({ createdAt: -1 });
    res.json({ success: true, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const approveReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount } = req.body;
    
    const returnReq = await QuickReturnRequest.findById(id);
    if (!returnReq) throw new Error('Return request not found');

    let remark = 'Return approved by Admin';
    if (refundAmount !== undefined && refundAmount !== null) {
      const parsedAmount = Number(refundAmount);
      if (!isNaN(parsedAmount)) {
        if (returnReq.refundAmount > 0) {
          const ratio = parsedAmount / returnReq.refundAmount;
          returnReq.sellerEarningDeduction = returnReq.sellerEarningDeduction * ratio;
          returnReq.adminEarningDeduction = returnReq.adminEarningDeduction * ratio;
        } else {
          returnReq.sellerEarningDeduction = parsedAmount;
          returnReq.adminEarningDeduction = 0;
        }
        returnReq.productValue = parsedAmount;
        returnReq.refundAmount = parsedAmount;
        remark += ` (Approved Refund Amount: ₹${parsedAmount})`;
      }
    }

    returnReq.status = returnStatuses.RETURN_APPROVED;
    returnReq.statusHistory.push({
      status: returnStatuses.RETURN_APPROVED,
      updatedBy: 'Admin',
      updatedById: req.user.userId,
      remarks: remark,
      timestamp: new Date()
    });

    await returnReq.save();
    
    const populated = await QuickReturnRequest.findById(id)
      .populate('orderId')
      .populate('productId', 'name image price')
      .populate('userId', 'name email phone')
      .populate('sellerId', 'name shopName phone location')
      .populate('deliveryPartnerId', 'name phone');

    res.json({ success: true, returnRequest: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const rejectReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const returnReq = await returnService.updateReturnStatus(id, returnStatuses.RETURN_REJECTED, 'Admin', req.user.userId, reason);
    res.json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const broadcastReturn = async (req, res) => {
  try {
    const { id } = req.params;
    const returnReq = await returnAssignmentService.broadcastReturnPickup(id);
    res.json({ success: true, message: 'Broadcast successful', returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const completeRefund = async (req, res) => {
  try {
    const { id } = req.params;
    const { refundAmount, refundMethod, transactionReferenceNumber, refundNotes } = req.body;

    const returnReq = await QuickReturnRequest.findById(id);
    if (!returnReq) throw new Error('Return request not found');

    if (returnReq.status !== returnStatuses.RETURN_RECEIVED_BY_SELLER) {
      throw new Error('Return must be received by seller before refund completion');
    }

    if (!refundAmount || !refundMethod || !transactionReferenceNumber) {
      throw new Error('Refund amount, method, and transaction reference are required');
    }

    returnReq.refundAmount = refundAmount;
    returnReq.refundMethod = refundMethod;
    returnReq.transactionReferenceNumber = transactionReferenceNumber;
    returnReq.refundNotes = refundNotes;
    returnReq.refundDate = new Date();
    
    // Status update
    returnReq.status = returnStatuses.REFUND_COMPLETED;
    returnReq.statusHistory.push({
      status: returnStatuses.REFUND_COMPLETED,
      updatedBy: 'Admin',
      updatedById: req.user.userId,
      remarks: refundNotes,
      timestamp: new Date()
    });

    await returnReq.save();
    res.json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---- Delivery Partner Controllers ----

export const getDeliveryReturnPickups = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.userId;
    // For list: Active assignments or available broadcasts
    // Usually broadcasts are real-time, but we can return active ones here
    const activePickups = await QuickReturnRequest.find({
      deliveryPartnerId,
      status: { $in: [returnStatuses.RETURN_PICKUP_ASSIGNED, returnStatuses.PICKED_UP] }
    })
      .populate('orderId')
      .populate('productId', 'name image')
      .populate('userId', 'name phone address')
      .populate('sellerId', 'name shopName phone location');

    res.json({ success: true, activePickups });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const getDeliveryReturnHistory = async (req, res) => {
  try {
    const deliveryPartnerId = req.user.userId;
    const history = await QuickReturnRequest.find({
      deliveryPartnerId,
      status: { $in: [returnStatuses.PICKED_UP, returnStatuses.RETURN_RECEIVED_BY_SELLER, returnStatuses.REFUND_COMPLETED] }
    })
      .populate('productId', 'name')
      .populate('sellerId', 'name shopName phone location')
      .sort({ updatedAt: -1 });

    res.json({ success: true, history });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const acceptDeliveryPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryPartnerId = req.user.userId;
    const returnReq = await returnAssignmentService.acceptReturnPickup(id, deliveryPartnerId);
    res.json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const confirmPickup = async (req, res) => {
  try {
    const { id } = req.params;
    const { otp, pickupImage } = req.body;
    const deliveryPartnerId = req.user.userId;

    const returnReq = await QuickReturnRequest.findOne({ _id: id, deliveryPartnerId });
    if (!returnReq) throw new Error('Return request not found or not assigned to you');

    if (returnReq.status !== returnStatuses.RETURN_PICKUP_ASSIGNED) {
      throw new Error('Invalid status for confirmation');
    }

    if (returnReq.pickupOtp !== otp) {
      throw new Error('Invalid OTP');
    }

    if (!pickupImage) {
      throw new Error('Pickup image is required');
    }

    returnReq.pickupImage = pickupImage;
    returnReq.status = returnStatuses.PICKED_UP;
    returnReq.statusHistory.push({
      status: returnStatuses.PICKED_UP,
      updatedBy: 'Delivery Partner',
      updatedById: deliveryPartnerId,
      remarks: 'Product picked up from user',
      timestamp: new Date()
    });

    await returnReq.save();

    const populated = await QuickReturnRequest.findById(id)
      .populate('orderId')
      .populate('productId', 'name image')
      .populate('userId', 'name phone address')
      .populate('sellerId', 'name shopName phone location');

    res.json({ success: true, returnRequest: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const rejectDeliveryBroadcast = async (req, res) => {
  try {
    const { id } = req.params;
    const deliveryPartnerId = req.user.userId;
    const returnReq = await returnAssignmentService.rejectReturnPickup(id, deliveryPartnerId);
    res.json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const updateDeliveryReturnStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const deliveryPartnerId = req.user.userId;

    const returnReq = await QuickReturnRequest.findOne({ _id: id, deliveryPartnerId });
    if (!returnReq) throw new Error('Return request not found or not assigned to you');

    const currentStatus = returnReq.status;

    if (status === returnStatuses.PICKED_UP) {
      if (currentStatus !== returnStatuses.RETURN_PICKUP_ASSIGNED) {
        throw new Error('Can only mark as Picked Up when current status is Assigned');
      }
    } else if (status === returnStatuses.RETURN_RECEIVED_BY_SELLER) {
      if (currentStatus !== returnStatuses.PICKED_UP) {
        throw new Error('Can only mark as Received by Seller when current status is Picked Up');
      }
    } else {
      throw new Error('Invalid status update path. Only sequential line-by-line updates (Assigned -> Picked Up -> Received by Seller) are allowed.');
    }

    returnReq.status = status;
    returnReq.statusHistory.push({
      status,
      updatedBy: 'Delivery Partner (Manual)',
      updatedById: deliveryPartnerId,
      remarks: `Status updated manually to ${status}`,
      timestamp: new Date()
    });

    await returnReq.save();

    // If marked as received by seller, process deductions and credit delivery partner
    if (status === returnStatuses.RETURN_RECEIVED_BY_SELLER) {
      await returnFinanceService.processReturnDeductions(returnReq);
      await returnFinanceService.creditReturnDeliveryPartner(returnReq);
    }

    const populated = await QuickReturnRequest.findById(id)
      .populate('orderId')
      .populate('productId', 'name image')
      .populate('userId', 'name phone address')
      .populate('sellerId', 'name shopName phone location');

    res.json({ success: true, returnRequest: populated });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// ---- Seller Controllers ----

export const getSellerReturns = async (req, res) => {
  try {
    const sellerId = req.user.userId;
    const returns = await QuickReturnRequest.find({ sellerId })
      .populate('productId', 'name image price')
      .populate('userId', 'name')
      .populate('deliveryPartnerId', 'name phone')
      .sort({ updatedAt: -1 });
    res.json({ success: true, returns });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

export const receiveSellerProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const sellerId = req.user.userId;
    
    const returnReq = await QuickReturnRequest.findOne({ _id: id, sellerId });
    if (!returnReq) throw new Error('Return request not found');

    if (returnReq.status !== returnStatuses.PICKED_UP) {
      throw new Error('Product must be picked up before receiving');
    }

    returnReq.status = returnStatuses.RETURN_RECEIVED_BY_SELLER;
    returnReq.statusHistory.push({
      status: returnStatuses.RETURN_RECEIVED_BY_SELLER,
      updatedBy: 'Seller',
      updatedById: sellerId,
      remarks: 'Product received by seller',
      timestamp: new Date()
    });

    await returnReq.save();

    // Process the finance deductions now that seller has accepted it
    await returnFinanceService.processReturnDeductions(returnReq);
    
    // Credit delivery partner
    await returnFinanceService.creditReturnDeliveryPartner(returnReq);

    res.json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

export const raiseSellerIssue = async (req, res) => {
  try {
    const { id } = req.params;
    const { remark, images } = req.body;
    const sellerId = req.user.userId;

    const returnReq = await QuickReturnRequest.findOne({ _id: id, sellerId });
    if (!returnReq) throw new Error('Return request not found');

    returnReq.statusHistory.push({
      status: returnReq.status, // Does not change
      updatedBy: 'Seller',
      updatedById: sellerId,
      remarks: `ISSUE RAISED: ${remark}`,
      timestamp: new Date()
    });
    
    if (images && images.length) {
      returnReq.sellerVerificationImages.push(...images);
    }

    await returnReq.save();
    
    // In a real system, you'd send an email/notification to Admin here.
    
    res.json({ success: true, returnRequest: returnReq });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};
