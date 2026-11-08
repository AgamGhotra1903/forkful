import mongoose from "mongoose";
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

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGO_URL || "mongodb://localhost:27017/forkful?authSource=admin";
    await mongoose.connect(mongoUri, {
      dbName: "Zomato_Clone",
    });

    console.log("connected to mongodb");
  } catch (error) {
    console.log(error);
  }
};

export default connectDB;
