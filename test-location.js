import { MongoClient, ObjectId } from "./services/restaurant/node_modules/mongodb/lib/index.js";
import jwt from "./services/restaurant/node_modules/jsonwebtoken/index.js";
import { io } from "./frontend/node_modules/socket.io-client/build/esm/index.js";

const MONGO_URI = "mongodb+srv://agamghotra1903ok_db_user:GLkA5Yxpvq9cseYf@cluster0.zxd2szl.mongodb.net/?appName=Cluster0";
const JWT_SECRET = "rot_sec_jwt_983d97f8c0";

const RESTAURANT_SERVICE = "http://localhost:5001";
const RIDER_SERVICE = "http://localhost:5005";
const REALTIME_SERVICE = "http://localhost:5004";

// Test Users
const CUSTOMER = { _id: "6a371837553aad96fa84b1c4", email: "customer@tomato.com", role: "customer", name: "Test Customer" };
const SELLER = { _id: "6a3710a73a68cf097beb3ba9", email: "spicegarden@forkful.dev", role: "seller", name: "Spice Garden Owner" };
const RIDER_USER = { _id: "6a3710ac3a68cf097beb3bba", email: "arjun.rider@forkful.dev", role: "rider", name: "Arjun Singh" };

function signToken(user) {
  return jwt.sign({ user }, JWT_SECRET, { expiresIn: "1h" });
}

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("Zomato_Clone");

  console.log("=== Setting up test state in MongoDB ===");

  // 1. Ensure address
  let address = await db.collection("addresses").findOne({ userId: CUSTOMER._id });
  if (!address) {
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

  // 2. Set Arjun available
  await db.collection("riders").updateOne(
    { userId: RIDER_USER._id },
    {
      $set: {
        isVerified: true,
        isAvailable: true,
        isAvailble: true,
        location: {
          type: "Point",
          coordinates: [77.5940, 12.9710]
        }
      }
    },
    { upsert: true }
  );

  // 3. Clear active orders
  await db.collection("orders").updateMany(
    { riderId: "6a3710ac3a68cf097beb3bbb", status: { $ne: "delivered" } },
    { $set: { status: "delivered" } }
  );

  // 4. Set up cart item
  await db.collection("carts").deleteMany({ userId: new ObjectId(CUSTOMER._id) });
  await db.collection("carts").insertOne({
    userId: new ObjectId(CUSTOMER._id),
    restaurantId: new ObjectId("6a3710a83a68cf097beb3baa"),
    itemId: new ObjectId("6a37198b606fdb913eebd3bf"),
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
  const orderId = placeBody.orderId;
  console.log(`Placed Order ID: ${orderId}`);

  console.log("\n=== 2. Advancing Order Status to ready_for_rider ===");
  await fetch(`${RESTAURANT_SERVICE}/api/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sellerToken}`
    },
    body: JSON.stringify({ status: "accepted" })
  });
  await fetch(`${RESTAURANT_SERVICE}/api/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sellerToken}`
    },
    body: JSON.stringify({ status: "preparing" })
  });
  await fetch(`${RESTAURANT_SERVICE}/api/order/status/${orderId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${sellerToken}`
    },
    body: JSON.stringify({ status: "ready_for_rider" })
  });

  console.log("Waiting for rider matching trigger...");
  await new Promise(r => setTimeout(r, 2000));

  console.log("\n=== 3. Rider accepts the order ===");
  const riderAcceptRes = await fetch(`${RIDER_SERVICE}/api/rider/order/accept/${orderId}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${riderToken}`
    }
  });
  console.log("Rider Accept status:", riderAcceptRes.status);

  console.log("\n=== 4. Connecting Customer Socket Client ===");
  const socketClient = io(REALTIME_SERVICE, {
    auth: {
      token: customerToken
    },
    transports: ["websocket"]
  });

  let receivedLocation = null;
  const socketConnected = new Promise((resolve) => {
    socketClient.on("connect", () => {
      console.log("Customer socket connected. Joining room order:" + orderId);
      socketClient.emit("join", `order:${orderId}`);
      resolve();
    });
  });

  socketClient.on("rider:location", (data) => {
    console.log("Customer received rider:location event via socket:", data);
    receivedLocation = data;
  });

  await socketConnected;

  // Wait a moment for join to register
  await new Promise(r => setTimeout(r, 1000));

  console.log("\n=== 5. Updating Rider Location ===");
  const locRes = await fetch(`${RIDER_SERVICE}/api/rider/location`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${riderToken}`
    },
    body: JSON.stringify({
      latitude: 12.9876,
      longitude: 77.6543
    })
  });
  const locBody = await locRes.json();
  console.log("Location Update Response Status:", locRes.status, locBody);

  // Wait for socket propagation
  console.log("Waiting for socket event propagation...");
  await new Promise(r => setTimeout(r, 2000));

  // 6. Query DB to verify persistence
  const updatedRider = await db.collection("riders").findOne({ userId: RIDER_USER._id });
  const dbCoords = updatedRider?.location?.coordinates;
  console.log("Rider location in database:", dbCoords);

  console.log("\n=== 7. Cleaning up and verifying assertions ===");
  socketClient.disconnect();
  await db.collection("orders").deleteOne({ _id: new ObjectId(orderId) });
  await client.close();

  const dbOk = dbCoords && dbCoords[0] === 77.6543 && dbCoords[1] === 12.9876;
  const socketOk = receivedLocation && receivedLocation.latitude === 12.9876 && receivedLocation.longitude === 77.6543;

  if (dbOk && socketOk) {
    console.log("\n✅ RIDER LOCATION UPDATE & SOCKET PROPAGATION TEST COMPLETED SUCCESSFULLY!");
  } else {
    console.log("\n❌ TEST FAILED:");
    console.log("- DB persistence OK:", dbOk, "Expected [77.6543, 12.9876], got", dbCoords);
    console.log("- Socket emit OK:", socketOk, "Expected { latitude: 12.9876, longitude: 77.6543 }, got", receivedLocation);
    process.exit(1);
  }
}

run().catch(console.error);
