const joinAddress = (...parts) => parts.map((part) => String(part || '').trim()).filter(Boolean).join(', ');

const firstText = (...values) => {
  for (const value of values) {
    const text = String(value || '').trim();
    if (text) return text;
  }
  return '';
};

const formatCoordinateAddress = (location) => {
  if (!location) return "";
  const lat = Number(location.lat);
  const lng = Number(location.lng);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return "";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
};

export const normalizeLocationPoint = (value) => {
  if (!value || typeof value !== "object") return null;

  if (Array.isArray(value.coordinates) && value.coordinates.length >= 2) {
    const lng = Number(value.coordinates[0]);
    const lat = Number(value.coordinates[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }

  if (value.location && typeof value.location === "object") {
    const nested = normalizeLocationPoint(value.location);
    if (nested) return nested;
  }

  const lat = Number(value.lat ?? value.latitude);
  const lng = Number(value.lng ?? value.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
};

const getFoodAddress = (order) => firstText(
  order?.restaurantAddress,
  order?.restaurant_address,
  order?.restaurantLocation?.address,
  order?.restaurantLocation?.formattedAddress,
  order?.restaurantId?.location?.address,
  order?.restaurantId?.location?.formattedAddress,
  order?.restaurant?.location?.address,
  order?.restaurant?.location?.formattedAddress,
  order?.restaurantId?.address,
  order?.restaurant?.address,
  joinAddress(order?.restaurantId?.addressLine1, order?.restaurantId?.area, order?.restaurantId?.city, order?.restaurantId?.state),
  joinAddress(order?.restaurant?.addressLine1, order?.restaurant?.area, order?.restaurant?.city, order?.restaurant?.state),
);

const getFoodPhone = (order) => firstText(
  order?.restaurantPhone,
  order?.restaurant_phone,
  order?.restaurantId?.phone,
  order?.restaurantId?.ownerPhone,
  order?.restaurantId?.mobile,
  order?.restaurantId?.contactPhone,
  order?.restaurant?.phone,
  order?.restaurant?.ownerPhone,
  order?.restaurant?.mobile,
  order?.restaurant?.contactPhone,
);

const getQuickAddress = (order) => firstText(
  order?.storeAddress,
  order?.sellerAddress,
  order?.seller?.location?.address,
  order?.seller?.location?.formattedAddress,
  order?.seller?.address,
  joinAddress(order?.seller?.addressLine1, order?.seller?.area, order?.seller?.city, order?.seller?.state),
);

const getQuickPhone = (order) => firstText(
  order?.storePhone,
  order?.sellerPhone,
  order?.seller?.phone,
  order?.seller?.ownerPhone,
  order?.seller?.contactPhone,
);

export const normalizePickupPoints = (order) => {
  const raw = Array.isArray(order?.pickupPoints) ? order.pickupPoints : [];
  const explicitOrderType = String(
    order?.orderType || order?.serviceType || order?.type || "",
  )
    .trim()
    .toLowerCase();
  const normalized = raw
    .map((point, index) => {
      const location = normalizeLocationPoint(point?.location);
      if (!location) return null;
      const pickupType = point?.pickupType === "quick" ? "quick" : "food";
      const sourceName = String(
        point?.sourceName ||
          point?.name ||
          (pickupType === "quick" ? "Seller store" : "Restaurant"),
      ).trim();
      const address = String(
        point?.address ||
          point?.formattedAddress ||
          point?.location?.address ||
          point?.location?.formattedAddress ||
          (pickupType === "quick" ? getQuickAddress(order) : getFoodAddress(order)) ||
          "",
      ).trim();
      return {
        id: point?.legId || `${pickupType || "pickup"}:${point?.sourceId || index}`,
        pickupType,
        sourceId: String(point?.sourceId || ""),
        sourceName,
        address: address || formatCoordinateAddress(location),
        phone: String(point?.phone || point?.contactPhone || (pickupType === "quick" ? getQuickPhone(order) : getFoodPhone(order)) || "").trim(),
        location,
      };
    })
    .filter(Boolean);

  if (normalized.length > 0) return normalized;

  const dispatchLegLocation = normalizeLocationPoint(
    order?.dispatchLeg?.location ||
      order?.pickupLocation ||
      order?.restaurantLocation ||
      order?.restaurantId,
  );
  const dispatchLegId = String(order?.dispatchLeg?.legId || "").trim();
  if (dispatchLegLocation && dispatchLegId) {
    const pickupType = order?.dispatchLeg?.pickupType === "quick" ? "quick" : "food";
    const sourceName = String(
      order?.dispatchLeg?.sourceName ||
        (pickupType === "quick"
          ? order?.storeName || order?.sellerName || "Seller store"
          : order?.restaurantName || order?.restaurantId?.restaurantName || "Restaurant"),
    ).trim();
    const address = String(
      order?.dispatchLeg?.address ||
        order?.pickupAddress ||
        (pickupType === "quick" ? getQuickAddress(order) : getFoodAddress(order)) ||
        "",
    ).trim();

    return [
      {
        id: dispatchLegId,
        pickupType,
        sourceId: String(order?.dispatchLeg?.sourceId || ""),
        sourceName,
        address: address || formatCoordinateAddress(dispatchLegLocation),
        phone: String(order?.dispatchLeg?.phone || (pickupType === "quick" ? getQuickPhone(order) : getFoodPhone(order)) || "").trim(),
        location: dispatchLegLocation,
      },
    ];
  }

  const restaurantLocation = normalizeLocationPoint(
    order?.restaurantLocation || order?.restaurantId || order?.storeLocation || order?.sellerLocation,
  );
  if (!restaurantLocation) return [];
  const fallbackPickupType = explicitOrderType === "quick" ? "quick" : "food";
  const fallbackSourceName = String(
    fallbackPickupType === "quick"
      ? order?.storeName ||
          order?.sellerName ||
          order?.seller?.shopName ||
          order?.seller?.name ||
          "Seller store"
      : order?.restaurantName || order?.restaurantId?.restaurantName || order?.restaurantId?.name || "Restaurant",
  ).trim();
  const fallbackAddress = String(
    fallbackPickupType === "quick" ? getQuickAddress(order) : getFoodAddress(order),
  ).trim();
  const fallbackPhone = String(
    fallbackPickupType === "quick" ? getQuickPhone(order) : getFoodPhone(order),
  ).trim();

  return [
    {
      id: `${fallbackPickupType}:primary`,
      pickupType: fallbackPickupType,
      sourceId: String(
        fallbackPickupType === "quick"
          ? order?.storeId || order?.sellerId || order?.seller?._id || ""
          : order?.restaurantId?._id || order?.restaurantId || "",
      ),
      sourceName: fallbackSourceName,
      address: fallbackAddress || formatCoordinateAddress(restaurantLocation),
      phone: fallbackPhone,
      location: restaurantLocation,
    },
  ];
};

export const getPrimaryPickupLocation = (order) => {
  const pickupPoints = normalizePickupPoints(order);
  return pickupPoints[0]?.location || null;
};

export const isMixedOrder = (order) => {
  const explicitType = String(
    order?.orderType || order?.serviceType || order?.type || "",
  )
    .trim()
    .toLowerCase();

  if (explicitType === "mixed") return true;

  const pickupPoints = normalizePickupPoints(order);
  if (pickupPoints.length <= 1) return false;

  const pickupTypes = new Set(
    pickupPoints.map((point) => String(point?.pickupType || "food").toLowerCase()),
  );

  return pickupTypes.size > 1;
};