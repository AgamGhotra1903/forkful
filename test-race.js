import { MongoClient, ObjectId } from "./services/restaurant/node_modules/mongodb/lib/index.js";

const MONGO_URI = "mongodb+srv://agamghotra1903ok_db_user:GLkA5Yxpvq9cseYf@cluster0.zxd2szl.mongodb.net/?appName=Cluster0";
const RESTAURANT_SERVICE_URL = "http://localhost:5001";
const INTERNAL_KEY = "rot_int_key_b2b647c0a1e38ffc";

async function runTest() {
  console.log("Connecting to MongoDB...");
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("Zomato_Clone");
  const ordersCollection = db.collection("orders");

  // 1. Create a dummy order in ready_for_rider state
  const orderId = new ObjectId();
  console.log(`Creating dummy order: ${orderId}...`);
  await ordersCollection.insertOne({
    _id: orderId,
    userId: "test_customer_user_id",
    restaurantId: "test_restaurant_id",
    restaurantName: "Test Restaurant",
    riderId: null,
    riderPhone: null,
    riderName: null,
    distance: 1.5,
    riderAmount: 30,
    items: [{ itemId: "item_123", name: "Test Item", price: 100, quantity: 1 }],
    subtotal: 100,
    deliveryFee: 49,
    platformFee: 7,
    totalAmount: 156,
    addressId: "address_123",
    deliveryAddress: {
      formattedAddress: "123 Test Street",
      mobile: 9876543210,
      latitude: 12.9716,
      longitude: 77.5946
    },
    status: "ready_for_rider",
    paymentMethod: "cod",
    paymentStatus: "pending",
    statusHistory: [{ status: "placed", timestamp: new Date() }, { status: "ready_for_rider", timestamp: new Date() }],
    createdAt: new Date(),
    updatedAt: new Date()
  });

  console.log("Dummy order created successfully.");

  // 2. Prepare the payload for Rider A and Rider B
  const riderAPayload = {
    orderId: orderId.toString(),
    riderId: "rider_A_mongodb_id",
    riderName: "Rider Alice",
    riderPhone: 9999999999
  };

  const riderBPayload = {
    orderId: orderId.toString(),
    riderId: "rider_B_mongodb_id",
    riderName: "Rider Bob",
    riderPhone: 8888888888
  };

  console.log("Triggering concurrent requests to assign rider...");

  // We send both requests simultaneously using Promise.all
  const [resA, resB] = await Promise.all([
    fetch(`${RESTAURANT_SERVICE_URL}/api/order/assign/rider`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": INTERNAL_KEY
      },
      body: JSON.stringify(riderAPayload)
    }),
    fetch(`${RESTAURANT_SERVICE_URL}/api/order/assign/rider`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "x-internal-key": INTERNAL_KEY
      },
      body: JSON.stringify(riderBPayload)
    })
  ]);

  const statusA = resA.status;
  const statusB = resB.status;
  const bodyA = await resA.json();
  const bodyB = await resB.json();

  console.log("\n--- RESULTS ---");
  console.log(`Rider A status: ${statusA}`, bodyA);
  console.log(`Rider B status: ${statusB}`, bodyB);

  // 3. Query the order from database to verify who was assigned
  const finalOrder = await ordersCollection.findOne({ _id: orderId });
  console.log("\nFinal Order State in DB:");
  console.log(`Assigned Rider ID: ${finalOrder.riderId}`);
  console.log(`Status: ${finalOrder.status}`);

  // 4. Cleanup
  console.log("\nCleaning up dummy order...");
  await ordersCollection.deleteOne({ _id: orderId });
  await client.close();
  console.log("Test finished.");

  // Assertions
  const successCount = (statusA === 200 ? 1 : 0) + (statusB === 200 ? 1 : 0);
  const failureCount = (statusA === 400 ? 1 : 0) + (statusB === 400 ? 1 : 0);

  if (successCount === 1 && failureCount === 1) {
    console.log("\n✅ SUCCESS: Exactly one rider was assigned. The other request was rejected with a 400 Bad Request.");
  } else {
    console.log(`\n❌ FAILURE: Unexpected count of success (${successCount}) and failure (${failureCount}).`);
  }
}

runTest().catch((err) => {
  console.error("Test failed to run:", err);
});
