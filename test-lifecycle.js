import { MongoClient, ObjectId } from "./services/restaurant/node_modules/mongodb/lib/index.js";
import jwt from "./services/restaurant/node_modules/jsonwebtoken/index.js";

const MONGO_URI = "mongodb+srv://agamghotra1903ok_db_user:GLkA5Yxpvq9cseYf@cluster0.zxd2szl.mongodb.net/?appName=Cluster0";
const JWT_SECRET = "rot_sec_jwt_983d97f8c0";

const RESTAURANT_SERVICE = "http://localhost:5002";
const RIDER_SERVICE = "http://localhost:5003";

// Test Users
const CUSTOMER = { _id: "6a371837553aad96fa84b1c4", email: "customer@tomato.com", role: "customer", name: "Test Customer" };
const SELLER = { _id: "6a3710a73a68cf097beb3ba9", email: "spicegarden@forkful.dev", role: "seller", name: "Spice Garden Owner" };
const RIDER_USER = { _id: "6a3710ac3a68cf097beb3bba", email: "arjun.rider@forkful.dev", role: "rider", name: "Arjun Singh" };

// Helper to sign JWT
function signToken(user) {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: "1h" });
}

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("Zomato_Clone");

  console.log("=== Setting up test state in MongoDB ===");

  // 1. Get or create a delivery address for the customer
  let address = await db.collection("addresses").findOne({ userId: CUSTOMER._id });
  if (!address) {
    console.log("Creating test address for customer...");
    const addressId = new ObjectId();
    await db.collection("addresses").insertOne({
      _id: addressId,
      userId: CUSTOMER._id,
      formattedAddress: "123 Green Avenue, Bangalore",
      mobile: 9876543210,
      location: {
        type: "Point",
        coordinates: [77.5946, 12.9716]
      }
    });
    address = await db.collection("addresses").findOne({ _id: addressId });
  }
  console.log("Customer Address ID:", address._id.toString());

  // 2. Ensure the rider Arjun is verified, available, and positioned near the restaurant (Spice Garden: coordinates [77.59, 12.97])
  console.log("Setting rider Arjun to available, verified, and near restaurant...");
  await db.collection("riders").updateOne(
    { userId: RIDER_USER._id },
    {
      $set: {
        isVerified: true,
        isAvailable: true,
        isAvailble: true,
        location: {
          type: "Point",
          coordinates: [77.5940, 12.9710] // very close to restaurant
        }
      }
    },
    { upsert: true }
  );

  // 3. Clear any existing active orders for this rider so they aren't blocked from accepting
  console.log("Clearing active orders for this rider...");
  await db.collection("orders").updateMany(
    { riderId: "6a3710ac3a68cf097beb3bbb", status: { $ne: "delivered" } },
    { $set: { status: "delivered" } }
  );

  // 4. Ensure there is food in the customer's cart
  // Spice Garden restaurant ID: 6a3710a83a68cf097beb3baa
  console.log("Setting up item in cart...");
  await db.collection("carts").deleteMany({ userId: new ObjectId(CUSTOMER._id) });
  await db.collection("carts").insertOne({
    userId: new ObjectId(CUSTOMER._id),
    restaurantId: new ObjectId("6a3710a83a68cf097beb3baa"),
    itemId: new ObjectId("6a37198b606fdb913eebd3bf"), // Butter Chicken item ID
    quantity: 1,
    createdAt: new Date(),
    updatedAt: new Date()
  });

  const customerToken = signToken(CUSTOMER);
  const sellerToken = signToken(SELLER);
  const riderToken = signToken(RIDER_USER);

  console.log("\n=== 1. Placing Cash on Delivery Order ===");
  const placeRes = await fetch(`${RESTAURANT_SERVICE}/api/order/new`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${customerToken}`
    },
    body: JSON.stringify({
      paymentMethod: "cod",
      addressId: address._id.toString()
    })
  });

  const placeBody = await placeRes.json();
  console.log("Place Order Response status:", placeRes.status, placeBody);
  if (placeRes.status !== 200) throw new Error("Failed to place order");

  const orderId = placeBody.orderId;
  console.log(`Placed Order ID: ${orderId}`);

  // Fetch the created order to check initial status
  let orderDoc = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  console.log("Initial status in DB:", orderDoc.status);

  console.log("\n=== 2. Restaurant accepts the order ===");
  const acceptRes = await fetch(`${RESTAURANT_SERVICE}/api/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sellerToken}`
    },
    body: JSON.stringify({ status: "accepted" })
  });
  console.log("Accept Response status:", acceptRes.status, await acceptRes.json());
  if (acceptRes.status !== 200) throw new Error("Failed to accept order");

  console.log("\n=== 3. Restaurant marks order as preparing ===");
  const prepRes = await fetch(`${RESTAURANT_SERVICE}/api/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sellerToken}`
    },
    body: JSON.stringify({ status: "preparing" })
  });
  console.log("Preparing Response status:", prepRes.status, await prepRes.json());

  console.log("\n=== 4. Restaurant marks order as ready for rider ===");
  const readyRes = await fetch(`${RESTAURANT_SERVICE}/api/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sellerToken}`
    },
    body: JSON.stringify({ status: "ready_for_rider" })
  });
  console.log("Ready Response status:", readyRes.status, await readyRes.json());

  // Wait a moment for RabbitMQ to deliver the event and the consumer to search and emit
  console.log("Waiting 3 seconds for rider matching trigger...");
  await new Promise(r => setTimeout(r, 3000));

  console.log("\n=== 5. Rider accepts the order ===");
  const riderAcceptRes = await fetch(`${RIDER_SERVICE}/api/rider/order/accept/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${riderToken}`
    }
  });
  console.log("Rider Accept Response status:", riderAcceptRes.status, await riderAcceptRes.json());
  if (riderAcceptRes.status !== 200) throw new Error("Failed to accept order by rider");

  // Verify status in DB is rider_assigned
  orderDoc = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  console.log("Status in DB after rider accept:", orderDoc.status);
  console.log("Rider details assigned:", {
    riderId: orderDoc.riderId,
    riderName: orderDoc.riderName,
    riderPhone: orderDoc.riderPhone
  });

  console.log("\n=== 6. Rider updates status to picked up ===");
  const pickRes = await fetch(`${RIDER_SERVICE}/api/rider/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${riderToken}`
    },
    body: JSON.stringify({ status: "picked_up" })
  });
  console.log("Picked Up Response status:", pickRes.status, await pickRes.json());

  console.log("\n=== 7. Rider updates status to delivered ===");
  const delRes = await fetch(`${RIDER_SERVICE}/api/rider/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${riderToken}`
    },
    body: JSON.stringify({ status: "delivered" })
  });
  console.log("Delivered Response status:", delRes.status, await delRes.json());

  orderDoc = await db.collection("orders").findOne({ _id: new ObjectId(orderId) });
  console.log("Final status in DB:", orderDoc.status);
  console.log("Final payment status in DB:", orderDoc.paymentStatus);

  console.log("\nCleaning up order document...");
  await db.collection("orders").deleteOne({ _id: new ObjectId(orderId) });
  await client.close();

  if (orderDoc.status === "delivered" && orderDoc.paymentStatus === "paid") {
    console.log("\n✅ E2E LIFECYCLE TEST COMPLETED SUCCESSFULLY!");
  } else {
    console.log("\n❌ E2E LIFECYCLE TEST FAILED.");
  }
}

run().catch(console.error);
