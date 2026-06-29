import { MongoClient } from "./services/restaurant/node_modules/mongodb/lib/index.js";

const MONGO_URI = "mongodb+srv://agamghotra1903ok_db_user:GLkA5Yxpvq9cseYf@cluster0.zxd2szl.mongodb.net/?appName=Cluster0";

async function run() {
  const client = new MongoClient(MONGO_URI);
  await client.connect();
  const db = client.db("Zomato_Clone");

  console.log("--- USERS ---");
  const users = await db.collection("users").find({}).limit(10).toArray();
  for (const u of users) {
    console.log(`ID: ${u._id}, Email: ${u.email}, Role: ${u.role}, Name: ${u.name}`);
  }

  console.log("\n--- RESTAURANTS ---");
  const restaurants = await db.collection("restaurants").find({}).limit(5).toArray();
  for (const r of restaurants) {
    console.log(`ID: ${r._id}, Name: ${r.name}, OwnerId: ${r.ownerId}, Verified: ${r.isVerified}, Open: ${r.isOpen}`);
  }

  console.log("\n--- RIDERS ---");
  const riders = await db.collection("riders").find({}).limit(5).toArray();
  for (const r of riders) {
    console.log(`ID: ${r._id}, UserId: ${r.userId}, Verified: ${r.isVerified}, Available: ${r.isAvailable || r.isAvailble}`);
  }

  await client.close();
}

run().catch(console.error);
