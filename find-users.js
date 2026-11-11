import dns from "dns";
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
  if (typeof options === "function") { callback = options; options = {}; }
  if (typeof hostname === "string" && hostname.includes("mongodb.net")) {
    return dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options && options.all) return callback(null, addresses.map(a => ({ address: a, family: 4 })));
        return callback(null, addresses[0], 4);
      }
      origLookup(hostname, options, callback);
    });
  }
  origLookup(hostname, options, callback);
};
import dotenv from "./services/restaurant/node_modules/dotenv/lib/main.js";
dotenv.config({ path: "./services/restaurant/.env" });
import { MongoClient } from "./services/restaurant/node_modules/mongodb/lib/index.js";

const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/forkful";

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
