import { User } from "./models/user";
import { Order } from "./models/order";
import { allenDataHubService } from "./services/allenDataHubService";

export async function resetDailyTotals() {
  try {
    await User.updateMany({}, { $set: { totalOrdersToday: 0, totalGBSentToday: 0, totalSpentToday: 0 } });
    console.log("Daily totals reset to zero (GMT 00:00)");
  } catch (err) {
    console.error("Failed resetting daily totals:", err);
  }
}

export function startDailyReset() {
  // compute ms until next 00:00 GMT
  const now = new Date();
  const utcYear = now.getUTCFullYear();
  const utcMonth = now.getUTCMonth();
  const utcDate = now.getUTCDate();
  const nextMidnight = new Date(Date.UTC(utcYear, utcMonth, utcDate + 1, 0, 0, 0));
  const msUntil = nextMidnight.getTime() - now.getTime();

  setTimeout(() => {
    resetDailyTotals();
    setInterval(resetDailyTotals, 24 * 60 * 60 * 1000);
  }, msUntil);

  console.log(`Scheduled daily reset in ${msUntil}ms (next GMT midnight)`);
}

export function startOrderStatusPolling() {
  let polling = false;

  const pollOpenOrders = async () => {
    if (polling) return;
    polling = true;

    try {
      const openOrders = await Order.find({
        status: { $in: ["pending", "processing"] },
        paymentStatus: "success",
        vendorOrderId: { $exists: true, $ne: "" },
      })
        .sort({ lastStatusPollAt: 1, createdAt: 1 })
        .limit(25)
        .lean();

      for (const order of openOrders) {
        if (!order.vendorOrderId) continue;

        let statusRecorded = false;
        try {
          const vendorUpdate = await allenDataHubService.getOrderStatus(order.vendorOrderId);
          if (!vendorUpdate || vendorUpdate.status === order.status) continue;

          const vendorStatus = vendorUpdate.vendorStatus || vendorUpdate.status;
          const update = await Order.updateOne(
            { _id: order._id, status: order.status },
            {
              $set: {
                status: vendorUpdate.status,
                lastStatusUpdateAt: new Date(),
                lastStatusPollAt: new Date(),
                "processingResults.0.status": vendorStatus,
              },
              $push: {
                webhookHistory: {
                  event: "status.poll",
                  orderId: order.vendorOrderId,
                  status: vendorStatus,
                  timestamp: new Date(),
                },
              },
            },
          );

          if (update.modifiedCount > 0) {
            statusRecorded = true;
            console.log(`[Order status] Reconciled ${order._id}: ${order.status} -> ${vendorUpdate.status}`);
          }
        } catch (error) {
          console.warn(`[Order status] Background poll failed for ${order._id}:`, error);
        } finally {
          if (!statusRecorded) {
            try {
              await Order.updateOne(
                { _id: order._id, status: order.status },
                { $set: { lastStatusPollAt: new Date() } },
              );
            } catch (error) {
              console.warn(`[Order status] Failed to record poll time for ${order._id}:`, error);
            }
          }
        }
      }
    } catch (error) {
      console.error("[Order status] Failed to load open orders for polling:", error);
    } finally {
      polling = false;
    }
  };

  void pollOpenOrders();
  setInterval(pollOpenOrders, 60_000);
  console.log("Scheduled vendor status polling every 60 seconds (up to 25 open orders per pass)");
}
