const fs = require("fs");
const path = "Frontend/src/modules/Food/components/restaurant/GlobalNewOrderPopup.jsx";
let content = fs.readFileSync(path, "utf8");

// I will just use regex to replace from "useEffect(() => {" below "requestOrdersRefresh();" up to "// Check for confirmed orders"

const lines = content.split("\n");
let startIdx = -1;
let endIdx = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes("// Show new order popup when real order notification arrives from Socket.IO")) {
    startIdx = i;
  }
  if (lines[i].includes("// Check for confirmed orders that haven")) {
    endIdx = i;
  }
}

if (startIdx !== -1 && endIdx !== -1) {
  const goodCode = `  // Show new order popup when real order notification arrives from Socket.IO
  useEffect(() => {
    if (newOrder) {
      debugLog("?? New order received via Socket.IO:", newOrder);

      const scheduledAt = newOrder.scheduledAt
        ? new Date(newOrder.scheduledAt).getTime()
        : null;
      const isFutureScheduled =
        scheduledAt && scheduledAt > Date.now() + 15 * 60000;

      if (isFutureScheduled) {
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
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        audioRef.current.muted = false;
        audioRef.current.volume = 1;
        audioUnlockedRef.current = true;

        // If an order popup is already open, start buzzing immediately after unlock.
        if (showNewOrderPopupRef.current && !isMutedRef.current) {
          audioRef.current.loop = true;
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {});
        }
      } catch (_) {
        audioRef.current.muted = false;
      }
    };

    window.addEventListener("pointerdown", unlockAudio, {
      once: true,
      passive: true,
    });
    window.addEventListener("keydown", unlockAudio, { once: true });

    return () => {
      window.removeEventListener("pointerdown", unlockAudio);
      window.removeEventListener("keydown", unlockAudio);
    };
  }, []);

`;

  lines.splice(startIdx, endIdx - startIdx, goodCode);
  fs.writeFileSync(path, lines.join("\\n"), "utf8");
  console.log("Fixed by splicing lines!");
} else {
  console.log("Could not find start/end indices: " + startIdx + ", " + endIdx);
}

