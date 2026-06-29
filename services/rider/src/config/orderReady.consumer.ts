import axios from "axios";
import { getChannel } from "./rabbitmq.js";
import { Rider } from "../model/Rider.js";

export const startOrderReadyConsumer = async () => {
  const channel = getChannel();

  console.log("Starting to consume from:", process.env.ORDER_READY_QUEUE);

  channel.consume(process.env.ORDER_READY_QUEUE!, async (msg) => {
    if (!msg) return;

    try {
      console.log("Recieved Message", msg.content.toString());

      const event = JSON.parse(msg.content.toString());

      console.log("event type", event.type);

      if (event.type !== "ORDER_READY_FOR_RIDER") {
        console.log("skipping non-order-ready-for-rider event");
        channel.ack(msg);
        return;
      }

      const { orderId, restaurantId, location } = event.data;

      // Start the search process asynchronously in the background
      startAssignmentSearch(orderId, restaurantId, location);

      channel.ack(msg);
      console.log("Message acknowledged");
    } catch (error) {
      console.log("OrderReady consumer error:", error);
    }
  });
};

const startAssignmentSearch = async (orderId: string, restaurantId: string, location: any) => {
  const radii = [500, 5000, 10000000];

  for (let attempt = 0; attempt < radii.length; attempt++) {
    const radius = radii[attempt];
    console.log(`[Attempt ${attempt + 1}] Searching for riders near:`, location, `with radius: ${radius}m`);

    try {
      const riders = await Rider.find({
        isVerified: true,
        location: {
          $near: {
            $geometry: {
              type: "Point",
              coordinates: location.coordinates,
            },
            $maxDistance: radius,
          },
        },
      });

      const eligibleRiders = [];
      for (const rider of riders) {
        if (rider.isAvailable) {
          eligibleRiders.push(rider);
        } else {
          // If rider is marked busy, check if they are eligible to batch this order
          try {
            const { data } = await axios.get(
              `${process.env.RESTAURANT_SERVICE}/api/order/internal/batch/eligible?riderId=${rider._id}&orderId=${orderId}`,
              {
                headers: {
                  "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                },
              }
            );
            if (data.eligible) {
              console.log(`Rider ${rider._id} is busy but eligible for batching order ${orderId}`);
              eligibleRiders.push(rider);
            }
          } catch (err: any) {
            console.log(`Failed to verify batch eligibility for rider ${rider._id}:`, err.message);
          }
        }
      }

      console.log(`[Attempt ${attempt + 1}] Found ${eligibleRiders.length} eligible nearby riders`);

      if (eligibleRiders.length > 0) {
        for (const rider of eligibleRiders) {
          console.log(`Notifying rider userId: ${rider.userId}`);
          try {
            await axios.post(
              `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
              {
                event: "order:available",
                room: `user:${rider.userId}`,
                payload: { orderId, restaurantId },
              },
              {
                headers: {
                  "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
                },
              }
            );
          } catch (error: any) {
            console.log(`Failed to notify rider ${rider.userId}:`, error.message);
          }
        }
      }
    } catch (dbError: any) {
      console.error("Database query failed during rider search:", dbError.message);
    }

    // Wait 10 seconds for riders to accept the order
    await new Promise((resolve) => setTimeout(resolve, 10000));

    // Verify if order is still unassigned
    try {
      const { data: order } = await axios.get(
        `${process.env.RESTAURANT_SERVICE}/api/order/internal/${orderId}`,
        {
          headers: {
            "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
          },
        }
      );

      if (order.riderId !== null || order.status !== "ready_for_rider") {
        console.log(`Order ${orderId} has been claimed or changed status to ${order.status}. Stopping search.`);
        return;
      }
    } catch (err: any) {
      console.error(`Failed to fetch order status for ${orderId}:`, err.message);
    }
  }

  console.log(`No rider claimed order ${orderId} after all attempts. Triggering Saga compensation rollback...`);

  // 1. Call Saga compensation endpoint on the restaurant service to roll back payment and cancel order
  try {
    const { data } = await axios.put(
      `${process.env.RESTAURANT_SERVICE}/api/order/internal/compensate`,
      { orderId },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );
    console.log("[Saga Rollback] Compensated order status:", data.status, "paymentStatus:", data.paymentStatus);
  } catch (sagaErr: any) {
    console.error("[Saga Rollback] Failed to execute compensateFailedAssignment:", sagaErr.message);
  }

  // 2. Notify the restaurant that no rider is available yet (standard notification fallback)
  try {
    await axios.post(
      `${process.env.REALTIME_SERVICE}/api/v1/internal/emit`,
      {
        event: "order:no_riders",
        room: `restaurant:${restaurantId}`,
        payload: { orderId },
      },
      {
        headers: {
          "x-internal-key": process.env.INTERNAL_SERVICE_KEY,
        },
      }
    );
    console.log(`Notified restaurant room restaurant:${restaurantId} about unclaimed order ${orderId}`);
  } catch (emitErr: any) {
    console.error(`Failed to notify restaurant about unclaimed order ${orderId}:`, emitErr.message);
  }
};
