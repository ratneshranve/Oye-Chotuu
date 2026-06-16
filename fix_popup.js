const fs = require("fs");
const path = "Frontend/src/modules/Food/components/restaurant/GlobalNewOrderPopup.jsx";
let content = fs.readFileSync(path, "utf8");

const badCode = `      if (isFutureScheduled) {
        toast.info(
        await audioRef.current.play();
        audioRef.current.pause();`;

const goodCode = `      if (isFutureScheduled) {
        toast.info(
          \`New scheduled order received for \${new Date(scheduledAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}\`
        );
        requestOrdersRefresh();
        return; // Do not show the immediate popup
      }

      if (!hasOrderBeenShown(newOrder)) {
        markOrderAsShown(newOrder);
        setPopupOrder(newOrder);
        setShowNewOrderPopup(true);
        const orderId = newOrder.orderMongoId || newOrder.orderId || newOrder._id;
        setCountdown(getInitialCountdown(orderId));
        requestOrdersRefresh();
      }
    }
  }, [newOrder]);

  // Handle order status updates from Socket.IO to close the popup if the order was accepted/cancelled elsewhere
  useEffect(() => {
    if (orderUpdate && (popupOrder || newOrder)) {
      const currentOrder = popupOrder || newOrder;
      const currentOrderId = currentOrder.orderMongoId || currentOrder.orderId || currentOrder._id;
      const updateOrderId = orderUpdate.orderMongoId || orderUpdate.orderId || orderUpdate._id;
      
      if (currentOrderId && updateOrderId && currentOrderId === updateOrderId) {
        const newStatus = String(orderUpdate.orderStatus || orderUpdate.status || "").toLowerCase();
        // If order is no longer in created or confirmed status, close the popup
        if (newStatus && newStatus !== "created" && newStatus !== "confirmed") {
          setShowNewOrderPopup(false);
          setPopupOrder(null);
          clearNewOrder();
          clearOrderTimer(currentOrderId);
        }
      }
    }
  }, [orderUpdate, popupOrder, newOrder, clearNewOrder]);

  // Keep refs in sync to avoid stale state inside one-time event handlers.
  useEffect(() => {
    showNewOrderPopupRef.current = showNewOrderPopup;
  }, [showNewOrderPopup]);

  useEffect(() => {
    isMutedRef.current = isMuted;
  }, [isMuted]);

  useEffect(() => {
    newOrderRef.current = newOrder;
  }, [newOrder]);

  // Best-effort unlock for popup buzzer so it can keep playing when tab is backgrounded.
  useEffect(() => {
    const unlockAudio = async () => {
      if (audioUnlockedRef.current || !audioRef.current) return;
      try {
        audioRef.current.muted = true;
        await audioRef.current.play();
        audioRef.current.pause();`;

if (content.includes(badCode)) {
  content = content.replace(badCode, goodCode);
  fs.writeFileSync(path, content, "utf8");
  console.log("Fixed successfully!");
} else {
  console.log("Bad code not found!");
}

