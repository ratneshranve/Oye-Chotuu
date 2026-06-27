import mongoose from "mongoose";
import { FoodOrder, FoodSettings } from "../models/order.model.js";
import { FoodRestaurant } from "../../restaurant/models/restaurant.model.js";
import { FoodZone } from "../../admin/models/zone.model.js";
import { Seller } from "../../../quick-commerce/seller/models/seller.model.js";
import { FoodDeliveryPartner } from "../../delivery/models/deliveryPartner.model.js";
import {
  ValidationError,
  NotFoundError,
} from "../../../../core/auth/errors.js";
import { logger } from "../../../../utils/logger.js";
import { config } from "../../../../config/env.js";
import { getIO, rooms } from "../../../../config/socket.js";
import { addOrderJob } from "../../../../queues/producers/order.producer.js";
import { isPointInPolygon } from "../../../../utils/geo.js";
import {
  buildDeliverySocketPayload,
  buildOrderIdentityFilter,
  haversineKm,
  notifyOwnerSafely,
  notifyOwnersSafely,
} from "./order.helpers.js";

const STALE_RIDER_GPS_MS = 10 * 60 * 1000;

const getSourceZoneId = (source) =>
  source?.zoneId ||
  source?.shopInfo?.zoneId ||
  source?.zone?._id ||
  source?.zone ||
  null;

const getSourceCoords = (source) => {
  const coords = source?.location?.coordinates || source?.shopInfo?.location?.coordinates;
  if (Array.isArray(coords) && coords.length >= 2) {
    const lng = Number(coords[0]);
    const lat = Number(coords[1]);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  const lat = Number(source?.location?.latitude ?? source?.shopInfo?.location?.latitude);
  const lng = Number(source?.location?.longitude ?? source?.shopInfo?.location?.longitude);
  if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  return null;
};

const resolveSourceZone = async (source) => {
  const explicitZoneId = getSourceZoneId(source);
  if (explicitZoneId && mongoose.Types.ObjectId.isValid(String(explicitZoneId))) {
    const zone = await FoodZone.findOne({ _id: explicitZoneId, isActive: true }).lean();
    if (zone) return zone;
  }

  const coords = getSourceCoords(source);
  if (!coords) return null;
  const zones = await FoodZone.find({ isActive: true }).lean();
  return zones.find((zone) => isPointInPolygon(coords.lat, coords.lng, zone.coordinates)) || null;
};

const hasFreshRiderLocation = (partner) => {
  if (!Number.isFinite(Number(partner?.lastLat)) || !Number.isFinite(Number(partner?.lastLng))) return false;
  if (!partner?.lastLocationAt) return false;
  return Date.now() - new Date(partner.lastLocationAt).getTime() <= STALE_RIDER_GPS_MS;
};
async function listNearbyOnlineDeliveryPartners(
  sourceId,
  { maxKm = 15, limit = 25, sourceType = "food" } = {},
) {
  if (!sourceId) return { partners: [], source: null, zone: null };
  const sId = (sourceId?._id || sourceId).toString();

  const source = sourceType === "quick"
    ? await Seller.findById(sId).lean()
    : await FoodRestaurant.findById(sId).lean();

  const sourceZone = await resolveSourceZone(source);
  if (!sourceZone) {
    logger.warn(`Dispatch skipped: source ${sId} has no active zone match. No riders will be notified.`);
    return { source, zone: null, partners: [] };
  }

  const sourceCoords = getSourceCoords(source);
  const allOnline = await FoodDeliveryPartner.find({
    availabilityStatus: "online",
  })
    .select("_id status lastLat lastLng lastLocationAt name")
    .lean();

  const scored = [];
  const allowedStatuses =
    process.env.NODE_ENV === "production"
      ? ["approved"]
      : ["approved", "pending"];

  for (const p of allOnline) {
    if (!allowedStatuses.includes(p.status)) continue;
    if (!hasFreshRiderLocation(p)) continue;
    if (!isPointInPolygon(Number(p.lastLat), Number(p.lastLng), sourceZone.coordinates)) continue;

    const distanceKm = sourceCoords
      ? haversineKm(sourceCoords.lat, sourceCoords.lng, Number(p.lastLat), Number(p.lastLng))
      : null;

    if (distanceKm === null || (Number.isFinite(distanceKm) && distanceKm <= maxKm)) {
      scored.push({ partnerId: p._id, distanceKm, status: p.status });
    }
  }

  scored.sort((a, b) => (a.distanceKm ?? Number.MAX_SAFE_INTEGER) - (b.distanceKm ?? Number.MAX_SAFE_INTEGER));
  const picked = scored.slice(0, Math.max(1, limit));
  const final = config.env === "production"
    ? picked.filter((p) => p.status === "approved")
    : picked;

  return { source, zone: sourceZone, partners: final };
}

export async function getDispatchSettings() {
  return { dispatchMode: "auto" };
}

export async function updateDispatchSettings(dispatchMode, adminId) {
  // Always set to auto
  await FoodSettings.findOneAndUpdate(
    { key: "dispatch" },
    {
      $set: {
        dispatchMode: "auto",
        updatedBy: { role: "ADMIN", adminId, at: new Date() },
      },
    },
    { upsert: true, new: true },
  );
  return getDispatchSettings();
}

export async function tryAutoAssign(orderId, options = {}) {
  const attempt = options.attempt || 1;
  const lockTimeout = 35000; // 35 seconds lock interval

  const order = await FoodOrder.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(orderId),
      $or: [
        { "dispatch.status": "unassigned" },
        {
          "dispatch.status": "assigned",
          "dispatch.acceptedAt": { $exists: false },
          "dispatch.assignedAt": { $lt: new Date(Date.now() - lockTimeout) },
        },
      ],
      "dispatch.dispatchingAt": { $exists: false },
    },
    {
      $set: { "dispatch.dispatchingAt": new Date() },
    },
    { new: true },
  ).populate(["restaurantId", "userId"]);

  if (!order) {
    logger.info(
      `tryAutoAssign: Skip for ${orderId} (already dispatching, accepted, or multi-attempt lock active).`,
    );
    return null;
  }

  try {
    const offeredIds = (order.dispatch?.offeredTo || []).map((o) =>
      o.partnerId.toString(),
    );

    // RADIUS EXPANSION LOGIC
    // Attempt 1: 15km, Attempt 2: 25km, Attempt 3: 40km, Attempt 4+: 60km
    let maxKm = 15;
    if (attempt === 2) maxKm = 25;
    if (attempt === 3) maxKm = 40;
    if (attempt >= 4) maxKm = 60;

    const isQuickOrder = order.orderType === "quick";
    const quickSellerId =
      options.quickSellerId ||
      order.items?.find((item) => item?.type === "quick" && item?.sourceId)
        ?.sourceId ||
      order.pickupPoints?.find(
        (point) => point?.pickupType === "quick" && point?.sourceId,
      )?.sourceId;
    const dispatchSourceId = isQuickOrder ? quickSellerId : order.restaurantId;
    const searchOptions = {
      maxKm,
      limit: 15,
      sourceType: isQuickOrder ? "quick" : "food",
    };
    const { partners, source } = await listNearbyOnlineDeliveryPartners(
      dispatchSourceId,
      searchOptions,
    );

    // TIERED ALERT LOGIC
    // Phase 2: Broadcast to all (Attempt 3+)
    // Phase 3: Admin Alert (Attempt 5+ or roughly 5 mins)
    const isPhase2 = attempt >= 3;
    const isPhase3 = attempt >= 6; // ~6 minutes (60s * 6)

    if (isPhase3) {
      logger.error(
        `[CRITICAL] Order ${order._id} unassigned for ${attempt} mins. Triggering Admin Alert (Phase 3).`,
      );
      // Notify Admin via Push (Web/Mobile)
      try {
        await notifyOwnersSafely(
          [{ ownerType: "ADMIN", ownerId: "GLOBAL" }], // Use GLOBAL or specific admin group if defined
          {
            title: "Unassigned Order Crisis!",
            body: `Order #${order.order_id || order._id} has not been picked up for 5+ minutes. Manual intervention required!`,
            data: {
              type: "admin_alert_unassigned",
              orderId: order._id.toString(),
            },
          },
        );
      } catch (err) {
        logger.warn(`Admin notification failed: ${err.message}`);
      }
    }

    const eligible = partners.filter(
      (p) => !offeredIds.includes(p.partnerId.toString()),
    );

    if (eligible.length === 0) {
      logger.info(
        `tryAutoAssign: No NEW eligible partners in ${maxKm}km for order ${order._id}. Restarting hunt...`,
      );

      // If we ran out of new eligible partners, we might want to re-offer to everyone (Phase 2 style)
      const io = getIO();
      if (io && partners.length > 0) {
        const payload = buildDeliverySocketPayload(order, source);
        for (const p of partners) {
          const roomName = rooms.delivery(p.partnerId);
          io.to(roomName).emit("new_order_available", {
            ...payload,
            pickupDistanceKm: p.distanceKm,
          });
        }
      }

      // Re-queue itself to keep trying
      await addOrderJob(
        {
          action: "DISPATCH_TIMEOUT_CHECK",
          orderMongoId: order._id.toString(),
          orderId: order._id.toString(),
          attempt: attempt + 1,
        },
        { delay: 30000 },
      ); // Retry faster (30s) if no one found

      return { ...order.toObject(), notifiedCount: 0 };
    }

    const io = getIO();
    const payload = buildDeliverySocketPayload(order, source);

    if (isPhase2) {
      // PHASE 2 BROADCAST: Notify everyone remaining
      logger.info(
        `[Phase 2] Broadcasting order ${order._id} to ${eligible.length} riders.`,
      );
      for (const p of eligible) {
        const roomName = rooms.delivery(p.partnerId);
        if (io) {
          io.to(roomName).emit("new_order", {
            ...payload,
            pickupDistanceKm: p.distanceKm,
          });
          io.to(roomName).emit("new_order_available", {
            ...payload,
            pickupDistanceKm: p.distanceKm,
          });
          io.to(roomName).emit("play_notification_sound", {
            orderId: order.orderId,
            orderMongoId: order._id.toString(),
          });
        }
      }

      try {
        await notifyOwnersSafely(
          eligible.map((p) => ({ ownerType: "DELIVERY_PARTNER", ownerId: p.partnerId })),
          {
            title: "New order assigned!",
            body: `You have 30 seconds to accept Order #${order.order_id || order._id}.`,
            data: { type: "new_order", orderId: order._id.toString() },
          }
        );
      } catch (err) {
        logger.warn(`Push notification failed for Phase 2: ${err.message}`);
      }
    } else {
      // PHASE 1: Target best rider only
      const p = eligible[0];
      const roomName = rooms.delivery(p.partnerId);
      logger.info(
        `[Phase 1] Offering order ${order._id} to best rider ${p.partnerId} (${p.distanceKm}km)`,
      );
      if (io) {
        io.to(roomName).emit("new_order", {
          ...payload,
          pickupDistanceKm: p.distanceKm,
        });
        io.to(roomName).emit("new_order_available", {
          ...payload,
          pickupDistanceKm: p.distanceKm,
        });
        io.to(roomName).emit("play_notification_sound", {
          orderId: order.orderId,
          orderMongoId: order._id.toString(),
        });
      }

      try {
        await notifyOwnerSafely(
          { ownerType: "DELIVERY_PARTNER", ownerId: p.partnerId },
          {
            title: "New order assigned!",
            body: `You have 30 seconds to accept Order #${order.order_id || order._id}.`,
            data: { type: "new_order", orderId: order._id.toString() },
          },
        );
      } catch (err) {
        logger.warn(
          `Push notification failed for partner ${p.partnerId}: ${err.message}`,
        );
      }
    }

    const offeredPartners = isPhase2 ? eligible : [eligible[0]];
    const offeredToEntries = offeredPartners.map((p) => ({
      partnerId: p.partnerId,
      at: new Date(),
      action: "offered",
    }));

    order.dispatch.status = "unassigned";
    order.dispatch.deliveryPartnerId = null;
    order.dispatch.offeredTo.push(...offeredToEntries);
    await order.save();

    // Re-check in 60s
    await addOrderJob(
      {
        action: "DISPATCH_TIMEOUT_CHECK",
        orderMongoId: order._id.toString(),
        orderId: order._id.toString(),
        attempt: attempt + 1,
      },
      { delay: 30000 },
    );

    return { ...order.toObject(), notifiedCount: eligible.length };
  } finally {
    await FoodOrder.findByIdAndUpdate(orderId, {
      $unset: { "dispatch.dispatchingAt": "" },
    });
  }
}

export async function processDispatchTimeout(orderId, partnerId) {
  const order = await FoodOrder.findById(orderId);
  if (!order) return;

  const stillAssigned =
    order.dispatch?.status === "assigned" &&
    String(order.dispatch?.deliveryPartnerId) === String(partnerId) &&
    !order.dispatch?.acceptedAt;

  if (stillAssigned) {
    logger.info(
      `Dispatch timeout for partner ${partnerId} on order ${orderId}. Re-trying hunt...`,
    );
    const offer = order.dispatch.offeredTo.find(
      (o) =>
        String(o.partnerId) === String(partnerId) && o.action === "offered",
    );
    if (offer) offer.action = "timeout";

    order.dispatch.status = "unassigned";
    order.dispatch.deliveryPartnerId = null;
    await order.save();

    const attempt = (order.dispatch?.offeredTo?.length || 0) + 1;
    await tryAutoAssign(orderId, { attempt });
  } else if (order.dispatch?.status === "unassigned") {
    // If it's already unassigned (e.g. from a previous timeout), just keep hunting
    const attempt = (order.dispatch?.offeredTo?.length || 0) + 1;
    await tryAutoAssign(orderId, { attempt });
  }
}

export async function resendDeliveryNotificationRestaurant(
  orderId,
  restaurantId,
) {
  const identity = buildOrderIdentityFilter(orderId);
  const order = await FoodOrder.findOne({
    ...identity,
    restaurantId: new mongoose.Types.ObjectId(restaurantId),
  });

  if (!order) throw new NotFoundError("Order not found");

  const activeStatuses = [
    "confirmed",
    "preparing",
    "ready_for_pickup",
    "ready",
  ];
  if (!activeStatuses.includes(order.orderStatus)) {
    throw new ValidationError(
      `Cannot resend notification for order in status: ${order.orderStatus}`,
    );
  }

  if (order.dispatch?.status === "accepted") {
    throw new ValidationError(
      "A delivery partner has already accepted this order.",
    );
  }

  order.dispatch.status = "unassigned";
  order.dispatch.deliveryPartnerId = null;
  order.dispatch.offeredTo = [];
  await order.save();

  const res = await tryAutoAssign(order._id, { attempt: 3 });
  return {
    success: true,
    notifiedCount: res?.notifiedCount || 0,
  };
}



