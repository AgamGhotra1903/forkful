// One-time data migrations for legacy typo'd fields and a stale index.
// These used to run on every single server boot inside connectDB(), which
// is wasteful and masks the real fix: the typo'd aliases have now been
// removed from the Mongoose schemas/models and every call site (backend
// and frontend), so no new documents or requests can introduce these keys
// going forward. This script only needs to be run once, against existing
// data, after deploying that schema fix.
//
//   npx tsx src/scripts/migrate-legacy-fields.ts
import "dotenv/config";
import mongoose from "mongoose";

const run = async () => {
  await mongoose.connect(process.env.MONGO_URI as string, {
    dbName: "Zomato_Clone",
  });

  try {
    await mongoose.connection.collection("orders").dropIndex("expiresAt_1");
    console.log("Dropped stale TTL index expiresAt_1 from orders collection");
  } catch (err: any) {
    console.log("expiresAt_1 index not present (already dropped) — skipping");
  }

  const cartsCol = mongoose.connection.collection("carts");
  const ordersCol = mongoose.connection.collection("orders");

  const cartResult = await cartsCol.updateMany(
    { quauntity: { $exists: true } },
    { $rename: { quauntity: "quantity" } }
  );
  console.log(`carts: migrated ${cartResult.modifiedCount} doc(s) quauntity -> quantity`);

  const feeResult = await ordersCol.updateMany(
    { platfromFee: { $exists: true } },
    { $rename: { platfromFee: "platformFee" } }
  );
  console.log(`orders: migrated ${feeResult.modifiedCount} doc(s) platfromFee -> platformFee`);

  const addressResult = await ordersCol.updateMany(
    { "deliveryAddress.fromattedAddress": { $exists: true } },
    { $rename: { "deliveryAddress.fromattedAddress": "deliveryAddress.formattedAddress" } }
  );
  console.log(
    `orders: migrated ${addressResult.modifiedCount} doc(s) deliveryAddress.fromattedAddress -> formattedAddress`
  );

  const itemsResult = await ordersCol.updateMany(
    { "items.quauntity": { $exists: true } },
    [
      {
        $set: {
          items: {
            $map: {
              input: "$items",
              as: "item",
              in: {
                $mergeObjects: [
                  "$$item",
                  { quantity: { $ifNull: ["$$item.quantity", "$$item.quauntity"] } },
                ],
              },
            },
          },
        },
      },
      { $unset: "items.quauntity" },
    ]
  );
  console.log(`orders: migrated ${itemsResult.modifiedCount} doc(s) items.quauntity -> items.quantity`);

  console.log("Migration complete.");
  await mongoose.disconnect();
};

run().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
