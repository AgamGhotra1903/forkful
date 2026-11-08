import { MongoClient, Db } from "mongodb";
import dns from "dns";

// ISP DNS may block *.mongodb.net SRV records — force Cloudflare + Google DNS
dns.setServers(["1.1.1.1", "8.8.8.8"]);
const origLookup = dns.lookup;
(dns as any).lookup = function (hostname: any, options: any, callback: any) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  if (typeof hostname === "string" && hostname.includes("mongodb.net")) {
    return dns.resolve4(hostname, (err, addresses) => {
      if (!err && addresses && addresses.length > 0) {
        if (options && options.all) {
          return callback(null, addresses.map((a) => ({ address: a, family: 4 })));
        }
        return callback(null, addresses[0], 4);
      }
      origLookup(hostname, options, callback);
    });
  }
  origLookup(hostname, options, callback);
};

let client: MongoClient;
let db: Db;

export const connectDb = async (): Promise<Db> => {
  if (db) return db;

  // MONGO_URI is the documented var for this service, but docker-compose
  // (and every other backend service) actually sets MONGO_URL. Accepting
  // either means the admin container no longer crashes with
  // "Invalid scheme, expected connection string to start with mongodb://"
  // when only one of the two is present.
  const mongoUri =
    process.env.MONGO_URI ||
    process.env.MONGO_URL ||
    "mongodb://localhost:27017/forkful?authSource=admin";

  client = new MongoClient(mongoUri);
  await client.connect();

  db = client.db(process.env.DB_NAME || "Zomato_Clone");

  console.log("Admin service connected to mongodb");

  return db;
};
