import React, { useState } from 'react';
import { ChevronDown, ChevronUp, User, Store, MapPin, Phone } from 'lucide-react';

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
};

const joinAddress = (...parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');

const dialNumberFrom = (phone) => String(phone || '').replace(/[^+\d]/g, '');

const canDial = (phone) => dialNumberFrom(phone).replace(/\D/g, '').length >= 3;

const ContactCallButton = ({ phone, label }) => {
  const dialNumber = dialNumberFrom(phone);
  const enabled = canDial(phone);

  return (
    <a
      href={enabled ? `tel:${dialNumber}` : undefined}
      aria-label={label}
      className={`shrink-0 inline-flex h-9 w-9 items-center justify-center rounded-full border transition-all ${
        enabled
          ? 'border-green-100 bg-green-50 text-green-600 active:scale-95 hover:bg-green-100'
          : 'pointer-events-none border-gray-100 bg-gray-50 text-gray-300'
      }`}
    >
      <Phone className="w-4 h-4" />
    </a>
  );
};

export const OrderDetailsDropdown = ({ order }) => {
  const [isOpen, setIsOpen] = useState(false);

  if (!order) return null;

  const restaurantRef = typeof order.restaurantId === 'object' && order.restaurantId ? order.restaurantId : {};
  const restaurantObj = order.restaurant || {};
  const sellerObj = order.seller || {};

  const customerName = firstText(
    order.userName,
    order.user?.name,
    order.user?.firstName,
    order.userId?.name,
    order.userId?.firstName,
    order.customer?.name,
    order.customerName,
    'Customer',
  );
  const customerPhone = firstText(order.userPhone, order.user?.phone, order.userId?.phone, order.customer?.phone, order.customerPhone, 'Not available');
  const customerAddress = firstText(
    order.deliveryAddress?.address,
    order.deliveryAddress?.street,
    order.deliveryAddress?.formattedAddress,
    order.deliveryLocation?.address,
    order.user?.address,
    'Address not available',
  );

  const isQuickOrder = String(order?.orderType || order?.serviceType || order?.type || '').trim().toLowerCase() === 'quick';
  const restaurantName = isQuickOrder
    ? firstText(order.storeName, order.sellerName, sellerObj.shopName, sellerObj.name, 'Seller store')
    : firstText(order.restaurantName, order.restaurant_name, restaurantRef.restaurantName, restaurantRef.name, restaurantObj.restaurantName, restaurantObj.name, 'Restaurant');

  const restaurantPhone = isQuickOrder
    ? firstText(order.storePhone, order.sellerPhone, sellerObj.phone, sellerObj.ownerPhone, sellerObj.contactPhone, 'Not available')
    : firstText(
        order.restaurantPhone,
        order.restaurant_phone,
        restaurantRef.phone,
        restaurantRef.ownerPhone,
        restaurantRef.mobile,
        restaurantRef.contactPhone,
        restaurantObj.phone,
        restaurantObj.ownerPhone,
        restaurantObj.mobile,
        restaurantObj.contactPhone,
        'Not available',
      );

  const restaurantAddress = isQuickOrder
    ? firstText(
        order.storeAddress,
        order.sellerAddress,
        sellerObj.location?.address,
        sellerObj.location?.formattedAddress,
        sellerObj.address,
        joinAddress(sellerObj.addressLine1, sellerObj.area, sellerObj.city, sellerObj.state),
        'Address not available',
      )
    : firstText(
        order.restaurantAddress,
        order.restaurant_address,
        order.restaurantLocation?.address,
        order.restaurantLocation?.formattedAddress,
        restaurantRef.location?.address,
        restaurantRef.location?.formattedAddress,
        restaurantObj.location?.address,
        restaurantObj.location?.formattedAddress,
        restaurantRef.address,
        restaurantObj.address,
        joinAddress(restaurantRef.addressLine1, restaurantRef.area, restaurantRef.city, restaurantRef.state),
        joinAddress(restaurantObj.addressLine1, restaurantObj.area, restaurantObj.city, restaurantObj.state),
        'Address not available',
      );

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
          <div className="space-y-2">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest border-b pb-1 mb-2">Customer</h4>
            <div className="flex items-start gap-2">
              <User className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{customerName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium text-gray-800 flex-1 min-w-0 break-words">{customerPhone}</span>
              <ContactCallButton phone={customerPhone} label="Call customer" />
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{customerAddress}</span>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t">
            <h4 className="font-bold text-gray-900 text-xs uppercase tracking-widest border-b pb-1 mb-2">Restaurant</h4>
            <div className="flex items-start gap-2">
              <Store className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
              <span className="font-medium text-gray-800">{restaurantName}</span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-gray-400 shrink-0" />
              <span className="font-medium text-gray-800 flex-1 min-w-0 break-words">{restaurantPhone}</span>
              <ContactCallButton phone={restaurantPhone} label="Call restaurant" />
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