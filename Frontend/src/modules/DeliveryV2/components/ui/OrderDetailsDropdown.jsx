import React, { useState } from 'react';
import { ChevronDown, ChevronUp, User, Store, MapPin, Phone } from 'lucide-react';

export const OrderDetailsDropdown = ({ order }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!order) return null;

  // Extract customer details
  const customerName = order.userName || order.user?.name || order.user?.firstName || order.userId?.name || order.userId?.firstName || order.customer?.name || order.customerName || 'Customer';
  const customerPhone = order.userPhone || order.user?.phone || order.userId?.phone || order.customer?.phone || order.customerPhone || 'Not available';
  const customerAddress = order.deliveryAddress?.address || order.deliveryAddress?.street || order.deliveryLocation?.address || order.user?.address || 'Address not available';

  // Extract restaurant details
  const isQuickOrder = String(order?.orderType || order?.serviceType || order?.type || '').trim().toLowerCase() === 'quick';
  const restaurantName = isQuickOrder
    ? order?.storeName || order?.sellerName || order?.seller?.shopName || order?.seller?.name || 'Seller store'
    : order?.restaurantName || order?.restaurant_name || order?.restaurantId?.restaurantName || order?.restaurantId?.name || order?.restaurant?.name || 'Restaurant';
  const restaurantPhone = isQuickOrder
    ? order?.storePhone || order?.sellerPhone || order?.seller?.phone || 'Not available'
    : order?.restaurantPhone || order?.restaurant_phone || order?.restaurantId?.phone || order?.restaurant?.phone || 'Not available';
  const restaurantAddress = isQuickOrder
    ? order?.storeAddress || order?.sellerAddress || order?.seller?.location?.address || order?.seller?.location?.formattedAddress || 'Address not available'
    : order?.restaurantAddress || order?.restaurant_address || order?.restaurantLocation?.address || order?.restaurant?.address || 'Address not available';

  return (
    <div className="w-full mb-4">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors border border-gray-100"
      >
        <div className="flex items-center gap-2 text-gray-900 font-bold text-xs uppercase tracking-widest">
          <User className="w-4 h-4 text-gray-500" />
          <span>Show Details</span>
        </div>
        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
      </button>

      {isOpen && (
        <div className="mt-2 space-y-3 bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-sm">
          {/* Customer Section */}
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest border-b pb-1 mb-2">Customer</h4>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{customerName}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{customerPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{customerAddress}</span>
            </div>
          </div>

          {/* Restaurant Section */}
          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest border-b pb-1 mb-2">Restaurant</h4>
            <div className="flex items-start gap-2">
              <Store className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{restaurantName}</span>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{restaurantPhone}</span>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{restaurantAddress}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetailsDropdown;
